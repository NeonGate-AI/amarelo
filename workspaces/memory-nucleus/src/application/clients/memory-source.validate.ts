import { z } from 'zod'
import type {
  EligibleMemorySource,
  MemoryRequestScope,
  MemorySubjectTextSource,
  TrustedMemorySource
} from '@application/contracts'
import { OperationalMemoryError } from './operational-memory.error'

const SubjectSourceSchema = z
  .object({
    kind: z.literal('subject-text'),
    actorId: z.string().min(1).max(200),
    subjectId: z.string().min(1).max(200),
    sourceTurnId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/),
    sourceTurnVersion: z.number().int().positive().safe(),
    observedAt: z.string().datetime({ offset: true }),
    text: z.string().min(1).max(4_000)
  })
  .strict()

/** Filter dialogue/timing before evidence validation, fingerprinting or persistence. */
export function prepareEligibleMemorySource(
  source: TrustedMemorySource,
  scope: MemoryRequestScope,
  now: Date
): EligibleMemorySource | null {
  if (
    source === null ||
    typeof source !== 'object' ||
    !Array.isArray(source.events) ||
    source.events.length > 100 ||
    !Number.isFinite(now.getTime())
  ) {
    throw new OperationalMemoryError('invalid-source')
  }
  const turns: MemorySubjectTextSource[] = []
  const sourceIds = new Set<string>()
  for (const event of source.events) {
    if (event === null || typeof event !== 'object' || !('kind' in event)) {
      throw new OperationalMemoryError('invalid-source')
    }
    if (event.kind === 'assistant-text' || event.kind === 'inactivity') continue
    const parsed = SubjectSourceSchema.safeParse(event)
    if (!parsed.success) throw new OperationalMemoryError('invalid-source')
    const turn = parsed.data
    if (
      turn.actorId !== scope.actorId ||
      turn.subjectId !== scope.subjectId ||
      Date.parse(turn.observedAt) > now.getTime() ||
      sourceIds.has(turn.sourceTurnId)
    ) {
      throw new OperationalMemoryError('invalid-source')
    }
    sourceIds.add(turn.sourceTurnId)
    turns.push(Object.freeze(turn))
  }
  if (turns.length === 0) return null
  const text = turns.map((turn) => turn.text).join('\n')
  if (text.length > 4_000) throw new OperationalMemoryError('invalid-source')
  return Object.freeze({ text, turns: Object.freeze(turns) })
}
