import type {
  ExplicitMemoryInput,
  ExplicitMemoryOptions,
  ExplicitMemoryResult
} from '@repo/memory-sdk'

/** Authenticated subject evidence, separate from assistant dialogue and timing events. */
export interface MemorySubjectTextSource {
  readonly kind: 'subject-text'
  readonly actorId: string
  readonly subjectId: string
  readonly sourceTurnId: string
  readonly sourceTurnVersion: number
  readonly observedAt: string
  readonly text: string
}

export type MemorySourceEvent =
  | MemorySubjectTextSource
  | { readonly kind: 'assistant-text'; readonly text: string }
  | { readonly kind: 'inactivity'; readonly durationMs: number }

/** Supplied only by the trusted server boundary; source kind comes from the request scope. */
export interface TrustedMemorySource {
  readonly events: readonly MemorySourceEvent[]
}

/** Only filtered, attributed subject turns cross the evidence persistence port. */
export interface EligibleMemorySource {
  readonly turns: readonly MemorySubjectTextSource[]
  readonly text: string
}

export type MemoryCandidateStageResult =
  | { readonly status: 'staged'; readonly candidateId: string }
  | { readonly status: 'skipped'; readonly reason: 'no-subject-evidence' }

/** Server-only delivery seam; staging never activates canonical Memory. */
export interface MemoryCandidateDeliveryClient {
  stageExplicit(
    input: ExplicitMemoryInput,
    options: ExplicitMemoryOptions,
    trustedSource: TrustedMemorySource
  ): Promise<MemoryCandidateStageResult>
  promoteExplicit(candidateId: string): Promise<ExplicitMemoryResult>
}
