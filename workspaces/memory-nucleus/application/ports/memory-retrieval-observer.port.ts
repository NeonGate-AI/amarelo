export type MemoryRetrievalCandidateDecision =
  | 'duplicate'
  | 'item-limit'
  | 'selected'
  | 'token-budget'

export const MEMORY_RETRIEVAL_POLICY_VERSION = 'memory-retrieval-v1'

export interface MemoryRetrievalCandidateTrace {
  readonly decision: MemoryRetrievalCandidateDecision
  readonly estimatedTokens: number
  readonly lexicalScore: number
  readonly match: 'exact-semantic-key' | 'lexical'
  readonly memoryId: string
}

/**
 * Payload-free retrieval telemetry. Query text and memory text are deliberately
 * excluded. Canonical identifiers remain linkable metadata: durable observers
 * must pseudonymize them and apply an approved retention/access policy.
 */
export interface MemoryRetrievalTrace {
  readonly authorizationDecisionId: string
  readonly candidateDecisions: readonly MemoryRetrievalCandidateTrace[]
  /** Deterministic local selection time only; observer delivery has its own deadline. */
  readonly selectionElapsedMilliseconds: number
  readonly policyVersion: string
  readonly repositoryRowsReturned: number
  readonly selectedMemoryIds: readonly string[]
  readonly tokenEstimatorVersion: string
  readonly totalEstimatedTokens: number
  readonly traceId: string
  readonly vectorCalls: 0
}

export interface MemoryRetrievalObservationContext {
  readonly signal: AbortSignal
}

export abstract class MemoryRetrievalObserver {
  /**
   * Retrieval gives observation a bounded cooperative deadline, but telemetry
   * is not an authority boundary: sink failure must not block a valid user
   * response. Implementations must honor the abort signal and must not enrich
   * the trace with query or memory content.
   */
  abstract record(
    trace: MemoryRetrievalTrace,
    context: MemoryRetrievalObservationContext
  ): Promise<void> | void
}
