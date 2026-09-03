import type { ConversationMessage } from '@contracts'

export const CONVERSATION_HISTORY_TOKEN_ESTIMATOR_VERSION =
  'conversation-history-codepoint-quarter-v1' as const

const MESSAGE_FRAME_TOKENS = 4
const CODEPOINTS_PER_ESTIMATED_TOKEN = 4

export interface ConversationHistorySelection {
  readonly budgetExceededByCurrentMessage: boolean
  readonly currentMessageTokens: number
  readonly estimatedTokens: number
  readonly estimatorVersion: typeof CONVERSATION_HISTORY_TOKEN_ESTIMATOR_VERSION
  readonly historyMessagesOmitted: number
  readonly messages: readonly ConversationMessage[]
}

export interface SelectConversationHistoryInput {
  readonly contextTokenBudget: number
  readonly currentMessage: string
  readonly history: readonly ConversationMessage[]
}

export function estimateConversationMessageTokens(content: string): number {
  const codepoints = [...content].length
  return (
    Math.max(1, Math.ceil(codepoints / CODEPOINTS_PER_ESTIMATED_TOKEN)) +
    MESSAGE_FRAME_TOKENS
  )
}

export function selectConversationHistory(
  input: SelectConversationHistoryInput
): ConversationHistorySelection {
  if (!Number.isInteger(input.contextTokenBudget) || input.contextTokenBudget < 1) {
    throw new RangeError('contextTokenBudget must be a positive integer')
  }

  const currentMessageTokens = estimateConversationMessageTokens(
    input.currentMessage
  )
  let estimatedTokens = currentMessageTokens
  const messages: ConversationMessage[] = []

  for (let index = input.history.length - 1; index >= 0; index -= 1) {
    const message = input.history[index]
    if (message === undefined) continue
    const messageTokens = estimateConversationMessageTokens(message.content)
    if (estimatedTokens + messageTokens > input.contextTokenBudget) break

    messages.unshift(
      Object.freeze({
        content: message.content,
        role: message.role
      })
    )
    estimatedTokens += messageTokens
  }

  return Object.freeze({
    budgetExceededByCurrentMessage:
      currentMessageTokens > input.contextTokenBudget,
    currentMessageTokens,
    estimatedTokens,
    estimatorVersion: CONVERSATION_HISTORY_TOKEN_ESTIMATOR_VERSION,
    historyMessagesOmitted: input.history.length - messages.length,
    messages: Object.freeze(messages)
  })
}
