import type { RetrievedMemoryContext } from '@application/contracts/memory-retrieval.contract'
import type { RankedMemoryRecord } from '@application/use-cases/memory-ranking'

const ITEM_SERIALIZATION_TOKEN_OVERHEAD = 8
const UTF_8_ENCODER = new TextEncoder()

export const MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION =
  'memory-nucleus-compact-context-projection-json-utf8-byte-upper-bound-v1'

function estimateUtf8TokenUpperBound(value: string): number {
  // Provider tokenizers differ. One token per UTF-8 byte is intentionally
  // conservative for the supported byte-level tokenizer families and avoids
  // undercounting non-ASCII content. The context assembler must still apply
  // the exact tokenizer for its selected model.
  return Math.max(1, UTF_8_ENCODER.encode(value).byteLength)
}

/**
 * Conservative, dependency-free UTF-8 upper bound for plain text.
 */
export function estimateMemoryTokens(text: string): number {
  return ITEM_SERIALIZATION_TOKEN_OVERHEAD + estimateUtf8TokenUpperBound(text)
}

export function createRetrievedMemoryContext(
  record: RankedMemoryRecord['record']
): RetrievedMemoryContext {
  const common = {
    category: record.category,
    observedAt: record.observedAt,
    authorType: record.provenance.authorType,
    statement: record.text,
    transformed: record.provenance.transformationId != null,
    trust: 'untrusted-memory-data'
  } as const

  if (record.kind === 'semantic') {
    return Object.freeze({
      ...common,
      kind: 'semantic',
      validFrom: record.validFrom,
      validUntil: record.validUntil
    })
  }

  if (record.occurredAt !== null) {
    return Object.freeze({
      ...common,
      kind: 'episodic',
      occurredAt: record.occurredAt,
      temporalPrecision: 'exact',
      temporalReference: null
    })
  }

  return Object.freeze({
    ...common,
    kind: 'episodic',
    occurredAt: null,
    temporalPrecision: record.temporalPrecision,
    temporalReference: record.temporalReference
  })
}

/**
 * Budgets the exact compact context projection returned with each item. The
 * governed envelope retains ranking and full provenance outside this budget.
 */
export function estimateRetrievedMemoryRecordTokens(
  rankedRecord: RankedMemoryRecord
): number {
  const serializedData = JSON.stringify(
    createRetrievedMemoryContext(rankedRecord.record)
  )

  return (
    ITEM_SERIALIZATION_TOKEN_OVERHEAD +
    estimateUtf8TokenUpperBound(serializedData)
  )
}
