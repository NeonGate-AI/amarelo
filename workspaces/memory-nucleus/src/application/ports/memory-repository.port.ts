import type {
  MemoryKind,
  MemoryLifecycle,
  MemoryProvenance,
  MemoryTimeWindow
} from '@application/contracts/memory-retrieval.contract'
import type { MemoryTemporalPrecision } from '@domain/entities/memory-candidate.entity'

/**
 * Storage-facing record. Optional provenance permits defensive rejection of a
 * corrupt adapter response; successful retrieval output always has provenance.
 */
interface RepositoryMemoryRecordBase {
  readonly id: string
  readonly tenantId: string
  readonly subjectId: string
  readonly purposes: readonly string[]
  readonly viewIds: readonly string[]
  readonly category: string
  readonly lifecycle: MemoryLifecycle
  readonly text: string
  /** Internal governance classification; omitted legacy fixtures default to normal. */
  readonly sensitivity?: 'normal' | 'sensitive' | 'highly-sensitive'
  /** Observation/ingestion time retained for audit, never time-window scope. */
  readonly observedAt: string
  readonly provenance?: MemoryProvenance | null
  readonly supersededById?: string | null
}

export interface RepositorySemanticMemoryRecord
  extends RepositoryMemoryRecordBase {
  readonly kind: 'semantic'
  readonly semanticKey?: string | null
  /** Inclusive application boundary; null means no known lower boundary. */
  readonly validFrom: string | null
  /** Exclusive application boundary; null means no known upper boundary. */
  readonly validUntil: string | null
}

interface RepositoryEpisodicMemoryRecordBase
  extends RepositoryMemoryRecordBase {
  readonly kind: 'episodic'
  readonly semanticKey?: null
}

export interface RepositoryExactEpisodicMemoryRecord
  extends RepositoryEpisodicMemoryRecordBase {
  readonly occurredAt: string
  readonly temporalPrecision: 'exact'
  readonly temporalReference: null
}

export interface RepositoryInexactEpisodicMemoryRecord
  extends RepositoryEpisodicMemoryRecordBase {
  readonly occurredAt: null
  readonly temporalPrecision: Exclude<MemoryTemporalPrecision, 'exact'>
  readonly temporalReference: string
}

export type RepositoryEpisodicMemoryRecord =
  | RepositoryExactEpisodicMemoryRecord
  | RepositoryInexactEpisodicMemoryRecord

export type RepositoryMemoryRecord =
  | RepositoryEpisodicMemoryRecord
  | RepositorySemanticMemoryRecord

export interface AuthorizedRepositorySearch {
  readonly authorizationDecisionId: string
  readonly traceId: string
  readonly tenantId: string
  readonly subjectId: string
  readonly purpose: string
  readonly viewId: string
  readonly kinds: readonly MemoryKind[]
  readonly categories: readonly string[]
  readonly sensitivities: readonly (
    | 'normal'
    | 'sensitive'
    | 'highly-sensitive'
  )[]
  readonly timeWindow: MemoryTimeWindow
  readonly queryText: string
  readonly semanticKeys: readonly string[]
  readonly requiredLifecycle: 'accepted'
  readonly requiredProvenance: true
  readonly candidateLimits: {
    readonly maxEpisodicCandidates: number
    readonly maxRecordCharacters: number
    readonly maxSemanticCandidates: number
    readonly maxSerializedRecordCharacters: number
  }
  readonly vectorFallback: false
}

export interface RepositorySearchDiagnostics {
  readonly authorizedRowsConsidered: number
  readonly matchedRows: number
  readonly vectorCalls: number
}

export interface RepositorySearchResult {
  /** Must echo the decision applied by the storage query. */
  readonly authorizationDecisionId: string
  readonly records: readonly RepositoryMemoryRecord[]
  readonly diagnostics: RepositorySearchDiagnostics
}

/**
 * Implementations MUST apply every AuthorizedRepositorySearch constraint in
 * the storage query itself. They must never load a broader tenant/person set
 * and then rely only on the caller's post-filter.
 */
export abstract class ScopedMemoryRepository {
  abstract searchAuthorized(
    search: AuthorizedRepositorySearch
  ): Promise<RepositorySearchResult>
}
