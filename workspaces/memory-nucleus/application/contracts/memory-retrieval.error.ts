export class InvalidAuthorizedMemoryQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidAuthorizedMemoryQueryError'
  }
}

export class MemoryRepositoryScopeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MemoryRepositoryScopeError'
  }
}

export type MemoryRetrievalObservationFailure =
  | 'observer-failed'
  | 'observer-timeout'

export class MemoryRetrievalObservationError extends Error {
  constructor(readonly reason: MemoryRetrievalObservationFailure) {
    super('memory retrieval observation could not be completed')
    this.name = 'MemoryRetrievalObservationError'
  }
}

export type MemoryAuthorizationDecisionFailure =
  | 'expired-decision'
  | 'invalid-clock'
  | 'invalid-decision'
  | 'revoked-decision'
  | 'scope-mismatch'
  | 'unknown-decision'

export class MemoryAuthorizationDecisionError extends Error {
  constructor(
    readonly reason: MemoryAuthorizationDecisionFailure,
    message: string
  ) {
    super(message)
    this.name = 'MemoryAuthorizationDecisionError'
  }
}
