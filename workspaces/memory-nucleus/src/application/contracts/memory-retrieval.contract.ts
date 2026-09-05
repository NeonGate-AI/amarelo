import type { MemoryKind, MemoryTemporalPrecision } from '@domain/entities'

export type { MemoryKind } from '@domain/entities'

export const MEMORY_AUTHOR_TYPES = Object.freeze([
  'authorized-delegate',
  'imported-source',
  'service',
  'subject'
] as const)

/** Non-identifying author classes permitted in model-facing context. */
export type MemoryAuthorType = (typeof MEMORY_AUTHOR_TYPES)[number]

export type MemoryLifecycle =
  | 'candidate'
  | 'accepted'
  | 'rejected'
  | 'revoked'
  | 'superseded'
  | 'deleted'

export interface MemoryProvenance {
  readonly sourceArtifactIds: readonly string[]
  readonly authorId: string
  readonly authorType: MemoryAuthorType
  readonly createdAt: string
  readonly transformationId?: string | null
}

export interface MemoryTimeWindow {
  /** Inclusive ISO-8601 boundary. */
  readonly fromInclusive: string | null
  /** Exclusive ISO-8601 boundary. */
  readonly toExclusive: string | null
}

export interface MemoryRetrievalBudgets {
  /** Requested budget. The retrieval hard cap is always 600 estimated tokens. */
  readonly maxTokens?: number
  /** Requested cap. The retrieval hard cap is always eight semantic items. */
  readonly maxSemanticItems?: number
  /** Requested cap. The retrieval hard cap is always three episodic items. */
  readonly maxEpisodicItems?: number
}

/**
 * A query produced only after deterministic policy has authorized this exact
 * tenant, subject, purpose, view, category set, and time window. The retrieval
 * use case resolves and validates the referenced decision before repository
 * access; this structural input is not authorization by itself.
 */
export interface AuthorizedMemoryQuery {
  readonly authorizationDecisionId: string
  readonly traceId: string
  readonly tenantId: string
  readonly subjectId: string
  readonly purpose: string
  readonly viewId: string
  readonly kinds: readonly MemoryKind[]
  readonly categories: readonly string[]
  readonly timeWindow: MemoryTimeWindow
  readonly budgets: MemoryRetrievalBudgets
  readonly queryText: string
  /** Stable domain keys used for exact semantic-memory lookup. */
  readonly semanticKeys?: readonly string[]
  /** Vector retrieval is intentionally unavailable in this cost-first slice. */
  readonly vectorFallback: false
}

export type MemoryMatchType = 'exact-semantic-key' | 'lexical'

/**
 * Exact compact data channel governed by the retrieval token budget. Full
 * provenance remains in the envelope; only its non-identifying semantics enter
 * this model-facing projection.
 */
interface RetrievedMemoryContextBase {
  readonly category: string
  readonly observedAt: string
  readonly authorType: MemoryAuthorType
  readonly statement: string
  readonly transformed: boolean
  readonly trust: 'untrusted-memory-data'
}

export interface RetrievedSemanticMemoryContext
  extends RetrievedMemoryContextBase {
  readonly kind: 'semantic'
  /** Inclusive application boundary; null means no known lower boundary. */
  readonly validFrom: string | null
  /** Exclusive application boundary; null means no known upper boundary. */
  readonly validUntil: string | null
}

interface RetrievedEpisodicMemoryContextBase
  extends RetrievedMemoryContextBase {
  readonly kind: 'episodic'
}

export interface RetrievedExactEpisodicMemoryContext
  extends RetrievedEpisodicMemoryContextBase {
  readonly occurredAt: string
  readonly temporalPrecision: 'exact'
  readonly temporalReference: null
}

export interface RetrievedInexactEpisodicMemoryContext
  extends RetrievedEpisodicMemoryContextBase {
  readonly occurredAt: null
  readonly temporalPrecision: Exclude<MemoryTemporalPrecision, 'exact'>
  readonly temporalReference: string
}

export type RetrievedEpisodicMemoryContext =
  | RetrievedExactEpisodicMemoryContext
  | RetrievedInexactEpisodicMemoryContext

export type RetrievedMemoryContext =
  | RetrievedEpisodicMemoryContext
  | RetrievedSemanticMemoryContext

interface RetrievedMemoryDataBase {
  readonly id: string
  readonly category: string
  readonly text: string
  readonly observedAt: string
  readonly provenance: MemoryProvenance
  readonly match: MemoryMatchType
  readonly lexicalScore: number
  readonly estimatedTokens: number
  /**
   * Memory content can contain prompt-injection-like text. Consumers must keep
   * it in a data channel and must not promote it to system/developer messages.
   */
  readonly trust: 'untrusted-memory-data'
}

export interface RetrievedSemanticMemoryData extends RetrievedMemoryDataBase {
  readonly context: RetrievedSemanticMemoryContext
  readonly kind: 'semantic'
  readonly semanticKey: string | null
  readonly validFrom: string | null
  readonly validUntil: string | null
}

interface RetrievedEpisodicMemoryDataBase extends RetrievedMemoryDataBase {
  readonly context: RetrievedEpisodicMemoryContext
  readonly kind: 'episodic'
  readonly semanticKey: null
}

export interface RetrievedExactEpisodicMemoryData
  extends RetrievedEpisodicMemoryDataBase {
  readonly context: RetrievedExactEpisodicMemoryContext
  readonly occurredAt: string
  readonly temporalPrecision: 'exact'
  readonly temporalReference: null
}

export interface RetrievedInexactEpisodicMemoryData
  extends RetrievedEpisodicMemoryDataBase {
  readonly context: RetrievedInexactEpisodicMemoryContext
  readonly occurredAt: null
  readonly temporalPrecision: Exclude<MemoryTemporalPrecision, 'exact'>
  readonly temporalReference: string
}

export type RetrievedEpisodicMemoryData =
  | RetrievedExactEpisodicMemoryData
  | RetrievedInexactEpisodicMemoryData

export type RetrievedMemoryData =
  | RetrievedEpisodicMemoryData
  | RetrievedSemanticMemoryData

export interface EffectiveMemoryRetrievalBudgets {
  readonly maxTokens: number
  readonly maxSemanticItems: number
  readonly maxEpisodicItems: number
}

export interface AuthorizedMemoryRetrievalDiagnostics {
  readonly vectorFallbackUsed: false
  readonly vectorCalls: 0
  readonly repositoryRowsReturned: number
  readonly rowsRejectedByDefense: number
  readonly eligibleMatches: number
  readonly semanticItems: number
  /** Version of the conservative pre-assembly estimator applied here. */
  readonly tokenEstimatorVersion: string
  readonly episodicItems: number
  readonly effectiveBudgets: EffectiveMemoryRetrievalBudgets
}

/** Structured data only: this result intentionally has no prompt/message. */
export interface AuthorizedMemoryRetrievalResult {
  readonly authorizationDecisionId: string
  readonly traceId: string
  readonly tenantId: string
  readonly subjectId: string
  readonly purpose: string
  readonly viewId: string
  readonly categories: readonly string[]
  readonly items: readonly RetrievedMemoryData[]
  readonly totalEstimatedTokens: number
  readonly diagnostics: AuthorizedMemoryRetrievalDiagnostics
}

export const DEFAULT_MEMORY_RETRIEVAL_BUDGETS = Object.freeze({
  maxTokens: 600,
  maxSemanticItems: 8,
  maxEpisodicItems: 3
}) satisfies EffectiveMemoryRetrievalBudgets
