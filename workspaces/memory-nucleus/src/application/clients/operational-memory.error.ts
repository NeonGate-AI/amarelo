export type OperationalMemoryErrorCode =
  | 'expired-request'
  | 'invalid-request'
  | 'invalid-result'
  | 'scope-mismatch'
  | 'unsupported-operation'

/** Stable content-free failures at the request-bound SDK adapter. */
export class OperationalMemoryError extends Error {
  constructor(readonly code: OperationalMemoryErrorCode) {
    super(`Operational Memory request failed: ${code}`)
    this.name = 'OperationalMemoryError'
  }
}
