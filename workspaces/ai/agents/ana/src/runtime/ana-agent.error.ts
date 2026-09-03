export class AnaAgentIdentityError extends Error {
  constructor(agentId: string) {
    super(`Ana cannot execute an invocation for agent ${agentId}`)
    this.name = 'AnaAgentIdentityError'
  }
}

export class AnaAgentResponseError extends Error {
  constructor(cause: unknown) {
    super('Ana model returned an invalid response', { cause })
    this.name = 'AnaAgentResponseError'
  }
}
