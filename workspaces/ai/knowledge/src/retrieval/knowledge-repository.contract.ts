import type {
  KnowledgeSourceType,
  KnowledgeVerificationStatus
} from './knowledge-retrieval.contract.ts'

/**
 * A versioned source chunk. Production adapters should populate this from a
 * verified ingestion pipeline; ingestion itself is outside this package.
 */
export interface RepositoryKnowledgeChunk {
  readonly corpusVersion: string
  readonly topicIds: readonly string[]
  readonly documentId: string
  readonly versionId: string
  readonly chunkId: string
  readonly purposeCodes: readonly string[]
  readonly jurisdictions: readonly string[]
  readonly publisher: string
  readonly canonicalUrl: string
  readonly citation: string
  readonly sourceType: KnowledgeSourceType
  readonly publishedAt: string
  /** Inclusive start of this version's applicability. */
  readonly effectiveFrom: string
  /** Exclusive end; null means no known end. */
  readonly effectiveToExclusive: string | null
  /** Lower- or upper-case SHA-256 hexadecimal digest of the source content. */
  readonly contentHash: string
  readonly verificationStatus: KnowledgeVerificationStatus
  readonly retractedAt?: string | null
  readonly supersededBy?: string | null
  readonly text: string
}

export interface KnowledgeRepositorySearch {
  readonly corpusVersion: string
  /** Storage adapters must enforce contains-all semantics. */
  readonly topicIds: readonly string[]
  readonly purposeCode: string
  readonly jurisdiction: string
  readonly asOf: string
  readonly sourceTypes: readonly KnowledgeSourceType[]
  readonly queryText: string
  readonly requiredVerificationStatus: 'verified'
  readonly requireCitation: true
  readonly requireProvenance: true
  readonly excludeRetracted: true
  readonly excludeSuperseded: true
  /** Candidate limit applies after choosing the best chunk per document. */
  readonly distinctDocuments: true
  /** Reject whole chunks above this estimate before document LIMIT. */
  readonly maxChunkTokens: number
  readonly candidateLimit: number
  readonly vectorFallback: false
}

export interface KnowledgeRepositorySearchDiagnostics {
  readonly eligibleRowsConsidered: number
  readonly matchedRows: number
  readonly vectorCalls: number
  readonly modelCalls: number
  readonly webCalls: number
}

export interface KnowledgeRepositorySearchResult {
  readonly corpusVersion: string
  readonly records: readonly RepositoryKnowledgeChunk[]
  readonly diagnostics: KnowledgeRepositorySearchDiagnostics
}

/** Production implementations must express every search constraint in storage. */
export interface ScopedKnowledgeRepository {
  searchScoped(
    search: KnowledgeRepositorySearch
  ): Promise<KnowledgeRepositorySearchResult>
}
