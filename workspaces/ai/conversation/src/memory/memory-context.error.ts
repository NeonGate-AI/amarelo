export type MemoryContextFailure =
  | 'not_configured'
  | 'dependency_unavailable'
  | 'contract_violation'
  | 'unexpected_failure'

export class MemoryContextError extends Error {
  constructor(readonly code: 'dependency_unavailable' | 'contract_violation') {
    super(
      code === 'dependency_unavailable'
        ? 'Memory dependency unavailable'
        : 'Memory context contract violated'
    )
    this.name = 'MemoryContextError'
  }
}
