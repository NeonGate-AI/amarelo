import { z } from 'zod'
import type {
  EligibleMemorySource,
  MemoryRequestScope
} from '@application/contracts'
import { neo4jMemoryFingerprint } from './neo4j-memory-scope.guard'

const SubjectTurnSchema = z
  .object({
    kind: z.literal('subject-text'),
    actorId: z.string().uuid(),
    subjectId: z.string().uuid(),
    sourceTurnId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/),
    sourceTurnVersion: z.number().int().positive().safe(),
    observedAt: z.string().datetime({ offset: true }),
    text: z.string().min(1).max(4_000)
  })
  .strict()

const EligibleSourceSchema = z
  .object({
    turns: z.array(SubjectTurnSchema).min(1).max(100),
    text: z.string().min(1).max(4_000)
  })
  .strict()

/** Revalidate the filtered application value before it becomes governed evidence. */
export function prepareNeo4jMemorySource(
  source: EligibleMemorySource,
  scope: MemoryRequestScope,
  scopeKey: string,
  statement: string,
  now: Date
) {
  const parsed = EligibleSourceSchema.parse(source)
  const joined = parsed.turns.map(({ text }) => text).join('\n')
  if (
    joined !== parsed.text ||
    joined !== statement ||
    new Set(parsed.turns.map(({ sourceTurnId }) => sourceTurnId)).size !==
      parsed.turns.length ||
    !Number.isFinite(now.getTime()) ||
    parsed.turns.some(
      (turn) =>
        turn.actorId !== scope.actorId ||
        turn.subjectId !== scope.subjectId ||
        Date.parse(turn.observedAt) > now.getTime()
    )
  )
    throw new Error('Trusted Memory source does not match its explicit input')
  const turns = parsed.turns.map((turn) => ({
    sourceTurnId: turn.sourceTurnId,
    sourceTurnVersion: turn.sourceTurnVersion,
    observedAt: turn.observedAt,
    identityKey: neo4jMemoryFingerprint([
      'memory-subject-source-v1',
      scopeKey,
      scope.conversationId,
      turn.sourceTurnId,
      turn.sourceTurnVersion
    ]),
    sourceFingerprint: neo4jMemoryFingerprint([
      'memory-subject-source-content-v1',
      scope.actorId,
      scope.subjectId,
      scope.sourceKind,
      turn.observedAt,
      turn.text
    ])
  }))
  return {
    turns,
    observedAt: parsed.turns.reduce((latest, turn) =>
      Date.parse(turn.observedAt) > Date.parse(latest.observedAt)
        ? turn
        : latest
    ).observedAt,
    contentHash: neo4jMemoryFingerprint([
      'memory-eligible-evidence-v1',
      parsed.text,
      turns.map(({ identityKey, sourceFingerprint }) => [
        identityKey,
        sourceFingerprint
      ])
    ])
  }
}
