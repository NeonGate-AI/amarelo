import type { AgentId } from '@contracts'

export class DuplicateConversationAgentError extends Error {
  readonly agentId: AgentId

  constructor(agentId: AgentId) {
    super(`Conversation agent ${agentId} was configured more than once`)
    this.name = 'DuplicateConversationAgentError'
    this.agentId = agentId
  }
}

export class ConversationAgentNotConfiguredError extends Error {
  readonly agentId: AgentId

  constructor(agentId: AgentId) {
    super(`Conversation agent ${agentId} is not configured`)
    this.name = 'ConversationAgentNotConfiguredError'
    this.agentId = agentId
  }
}

export class ConversationAgentInvocationError extends Error {
  readonly agentId: AgentId

  constructor(agentId: AgentId, cause: unknown) {
    super(`Conversation agent ${agentId} failed to produce a valid response`, {
      cause
    })
    this.name = 'ConversationAgentInvocationError'
    this.agentId = agentId
  }
}
