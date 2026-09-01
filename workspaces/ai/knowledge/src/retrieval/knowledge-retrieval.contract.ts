export type KnowledgeSourceType = 'scientific' | 'regulatory'

export type KnowledgeVerificationStatus = 'verified' | 'pending' | 'rejected'

export interface KnowledgeRetrievalQuery {
  /** Exact immutable ingestion snapshot identity. */
  readonly corpusVersion: string
  /**
   * Neutral domain facets. A record must contain every requested topic ID;
   * these identifiers are retrieval scope, not a canonical domain taxonomy.
   */
  readonly topicIds: readonly string[]
  readonly purposeCode: string
  readonly jurisdiction: string
  /**
   * UTC ISO-8601 applicability instant. Current verification, retraction, and
   * supersession safety always overrides historical applicability.
   */
  readonly asOf: string
  readonly sourceTypes: readonly KnowledgeSourceType[]
  readonly queryText: string
  readonly maxDocs: number
  readonly maxTokens: number
  readonly vectorFallback: false
}

export interface RetrievedKnowledgeData {
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
  readonly effectiveFrom: string
  readonly effectiveToExclusive: string | null
  readonly contentHash: string
  readonly verificationStatus: 'verified'
  readonly text: string
  readonly lexicalScore: number
  readonly estimatedTokens: number
  /** Source text is evidence data, never an instruction channel. */
  readonly trust: 'untrusted-knowledge-data'
}

export interface KnowledgeRetrievalDiagnostics {
  readonly repositoryRowsReturned: number
  readonly rowsRejectedByDefense: number
  readonly eligibleMatches: number
  readonly effectiveMaxDocs: number
  readonly effectiveMaxTokens: number
  readonly vectorFallbackUsed: false
  readonly vectorCalls: 0
  readonly modelCalls: 0
  readonly webCalls: 0
}

/** Structured evidence only: there is deliberately no prompt or message field. */
export interface KnowledgeRetrievalResult {
  readonly corpusVersion: string
  readonly topicIds: readonly string[]
  readonly purposeCode: string
  readonly jurisdiction: string
  readonly asOf: string
  readonly sourceTypes: readonly KnowledgeSourceType[]
  readonly items: readonly RetrievedKnowledgeData[]
  readonly totalEstimatedTokens: number
  readonly diagnostics: KnowledgeRetrievalDiagnostics
}

export const MAX_KNOWLEDGE_DOCS = 8
export const MAX_KNOWLEDGE_TOKENS = 600
