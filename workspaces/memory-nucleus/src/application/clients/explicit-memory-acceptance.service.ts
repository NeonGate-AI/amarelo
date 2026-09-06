import {
  createExplicitMemoryResultSchema,
  ExplicitMemoryInputSchema,
  type ExplicitMemoryResult
} from '@repo/memory-sdk'
import type { MemoryRequestScope } from '@application/contracts'
import type {
  OperationalMemoryTransaction,
  StoredExplicitMemoryCandidate
} from '@application/ports'
import { AcceptMemoryCandidateUseCase } from '@application/use-cases'
import { MemoryJudgment } from '@domain/value-objects'
import { OperationalMemoryError } from './operational-memory.error'

/** Shared acceptance inside the caller's transaction; never opens its own unit of work. */
export async function acceptOperationalExplicitMemory(
  transaction: OperationalMemoryTransaction,
  scope: MemoryRequestScope,
  candidate: StoredExplicitMemoryCandidate
): Promise<ExplicitMemoryResult> {
  const parsed = ExplicitMemoryInputSchema.parse(candidate.input)
  if (parsed.purpose !== scope.purpose) {
    throw new OperationalMemoryError('scope-mismatch')
  }
  await transaction.assertAuthority()
  const accepted = await new AcceptMemoryCandidateUseCase(
    transaction.canonical
  ).execute({
    ...candidate.staged,
    canonicalKey: parsed.semanticKey,
    category: parsed.category,
    confidence: 1,
    judgment: MemoryJudgment.create({
      confidence: 1,
      decision: 'remember',
      rationaleCode: 'explicit-subject-request'
    }),
    kind: parsed.kind,
    policyVersion: 'memory-explicit-acceptance-v1',
    viewIds: ['personal']
  })
  const result = createExplicitMemoryResultSchema(parsed).parse(
    await transaction.readRecord(accepted.memoryId)
  )
  if (
    result.provenance.authorId !== scope.actorId ||
    result.id !== accepted.memoryId ||
    result.version !== accepted.version
  ) {
    throw new OperationalMemoryError('scope-mismatch')
  }
  await transaction.assertAuthority()
  return result
}
