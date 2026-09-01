export type NoncanonicalCandidateDecision = 'discard' | 'quarantine' | 'conflict'

export interface ResolveNoncanonicalCandidateInput {
  readonly candidateId: string
  readonly commandId: string
  readonly decision: NoncanonicalCandidateDecision
  readonly policyVersion: string
  readonly requestedAt: string
  readonly reasonCode?: string
  readonly conflictType?: string
}

/** Application-owned port for terminal noncanonical candidate decisions. */
export abstract class CandidateResolutionPort {
  abstract resolve(input: ResolveNoncanonicalCandidateInput): Promise<string>
}
