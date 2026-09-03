import type { AgentId } from '@contracts'
import type { ConversationModelUsage } from '@ports'
import type { ConversationRoutingDecision } from '@routing'

export type ConversationMemoryStatus =
  | 'retrieved'
  | 'skipped'
  | 'unavailable'

export interface ConversationContextDiagnostics {
  readonly budgetExceededByCurrentMessage: boolean
  readonly budgetTokens: number
  readonly estimatedTokens: number
  readonly estimatorVersion: string
  readonly historyMessagesOmitted: number
  readonly historyMessagesUsed: number
}

export interface ConversationMemoryDiagnostics {
  readonly itemCount: number
  readonly requestId: string | null
  readonly requestedTokens: number
  readonly status: ConversationMemoryStatus
  readonly usedTokens: number
}

export interface ConversationTurnResult {
  readonly agentId: AgentId
  readonly context: ConversationContextDiagnostics
  readonly conversationId: string
  readonly memory: ConversationMemoryDiagnostics
  readonly modelUsage: ConversationModelUsage | null
  readonly requestId: string
  readonly response: string
  readonly routing: ConversationRoutingDecision
}
