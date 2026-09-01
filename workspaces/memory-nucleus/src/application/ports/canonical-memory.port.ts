export interface AcceptCandidateInput {
  readonly candidateId: string
  readonly policyVersion: string
  readonly viewIds: readonly string[]
  readonly category: string
  readonly canonicalKey: string | null
  readonly confidence: number
  readonly commandId: string
  readonly requestedAt: string
}

export interface AcceptCandidateResult {
  readonly memoryId: string
  readonly version: number
  readonly versionId: string
}

export interface TombstoneMemoryInput {
  readonly memoryId: string
  readonly tenantId: string
  readonly subjectId: string
  readonly reasonCode: string
}

/** Application-owned port for canonical memory mutation. */
export abstract class CanonicalMemoryPort {
  abstract acceptCandidate(input: AcceptCandidateInput): Promise<AcceptCandidateResult>
  abstract tombstoneMemory(input: TombstoneMemoryInput): Promise<boolean>
}
