import {
  MemoryRecordSchema,
  type MemoryActorType,
  type MemoryRecord,
  type MemorySourceType,
  type MemoryTemporalPrecision
} from '../memory/memory-record.contract.js'

export const MEMORY_SEARCH_TOKEN_ESTIMATOR_VERSION =
  'memory-sdk-compact-context-projection-json-utf8-byte-upper-bound-v2' as const

const ITEM_RENDERING_OVERHEAD = 32

export interface MemorySearchContextProvenance {
  readonly actorType: MemoryActorType
  readonly sourceType: MemorySourceType
  readonly transformed: boolean
}

interface MemorySearchContextBase {
  readonly category: string
  readonly confidence: number
  readonly observedAt: string
  readonly provenance: MemorySearchContextProvenance
  readonly statement: string
  readonly uncertainty: string | null
}

export interface EpisodicMemorySearchContext extends MemorySearchContextBase {
  readonly kind: 'episodic'
  readonly temporal: {
    readonly occurredAt: string | null
    readonly temporalPrecision: MemoryTemporalPrecision
    readonly temporalReference: string | null
  }
}

export interface SemanticMemorySearchContext extends MemorySearchContextBase {
  readonly kind: 'semantic'
  readonly temporal: {
    readonly validFrom: string | null
    readonly validUntil: string | null
  }
}

export interface MemorySearchContextProjection {
  readonly memory: EpisodicMemorySearchContext | SemanticMemorySearchContext
  readonly trust: 'untrusted-memory-data'
}

interface SearchItemForEstimation {
  readonly context?: unknown
  readonly memory: unknown
  readonly trust: unknown
}

export function createMemorySearchContextProjection(item: {
  readonly memory: MemoryRecord
  readonly trust: 'untrusted-memory-data'
}): MemorySearchContextProjection {
  const rawItem: unknown = item

  if (typeof rawItem !== 'object' || rawItem === null) {
    throw new TypeError('Memory search context input is invalid')
  }

  const candidate = rawItem as {
    readonly memory?: unknown
    readonly trust?: unknown
  }
  const parsedMemory = MemoryRecordSchema.safeParse(candidate.memory)

  if (!parsedMemory.success || candidate.trust !== 'untrusted-memory-data') {
    throw new TypeError('Memory search context input is invalid')
  }

  const memory = parsedMemory.data
  const common = {
    category: memory.category,
    confidence: memory.confidence,
    observedAt: memory.observedAt,
    provenance: Object.freeze({
      actorType: memory.provenance.actorType,
      sourceType: memory.provenance.sourceType,
      transformed: memory.provenance.transformation !== null
    }),
    statement: memory.statement,
    uncertainty: memory.uncertainty
  }

  if (memory.kind === 'episodic') {
    return Object.freeze({
      memory: Object.freeze({
        ...common,
        kind: memory.kind,
        temporal: Object.freeze({
          occurredAt: memory.occurredAt,
          temporalPrecision: memory.temporalPrecision,
          temporalReference: memory.temporalReference
        })
      }),
      trust: 'untrusted-memory-data'
    })
  }

  return Object.freeze({
    memory: Object.freeze({
      ...common,
      kind: memory.kind,
      temporal: Object.freeze({
        validFrom: memory.validFrom,
        validUntil: memory.validUntil
      })
    }),
    trust: 'untrusted-memory-data'
  })
}

function stableJson(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    const entries = value.map((entry) => stableJson(entry) ?? 'null')
    return `[${entries.join(',')}]`
  }

  const entries = Object.entries(value)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .flatMap(([key, entry]) => {
      const encoded = stableJson(entry)
      return encoded === undefined ? [] : [`${JSON.stringify(key)}:${encoded}`]
    })

  return `{${entries.join(',')}}`
}

export function estimateMemorySearchContextTokens(
  context: MemorySearchContextProjection
): number {
  try {
    const serialized = stableJson(context)

    if (serialized === undefined) {
      return Number.MAX_SAFE_INTEGER
    }

    // One estimated token per UTF-8 byte is a provider-neutral upper bound for
    // byte-level tokenizers. The fixed reserve covers deterministic framing
    // around this exact public context projection. A consumer that serializes
    // additional fields must re-enforce its own tokenizer-specific limit.
    return (
      new TextEncoder().encode(serialized).byteLength + ITEM_RENDERING_OVERHEAD
    )
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

export function estimateMemorySearchItemTokens(
  item: SearchItemForEstimation
): number {
  try {
    const parsedMemory = MemoryRecordSchema.safeParse(item.memory)

    if (!parsedMemory.success || item.trust !== 'untrusted-memory-data') {
      return Number.MAX_SAFE_INTEGER
    }

    const context = createMemorySearchContextProjection({
      memory: parsedMemory.data,
      trust: item.trust
    })

    return estimateMemorySearchContextTokens(context)
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}
