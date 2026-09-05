import { createHash } from 'node:crypto'
import {
  MemorySearchResultSchema,
  createMemorySearchContextProjection,
  estimateMemorySearchContextTokens,
  type MemorySearchResult
} from '@repo/memory-sdk'
import { estimateConversationMessageTokens, selectConversationHistory } from '../context'
import { ConversationMessageSchema } from '../contracts'
import type { ConversationAgentInvocation } from '../ports'

export interface MemoryReplacementPlan {
  readonly control: ConversationAgentInvocation
  readonly treatment: ConversationAgentInvocation
  readonly controlHash: string
  readonly treatmentHash: string
  readonly controlComparableTokensEstimated: number
  readonly treatmentComparableTokensEstimated: number
}

/** Construct a replacement from the actual already-bounded invocation, never a larger control. */
export function createMemoryReplacementPlan(
  invocation: ConversationAgentInvocation,
  rawMemory: MemorySearchResult,
  recentBufferTokens: number
): MemoryReplacementPlan {
  if (invocation.memory.length !== 0 || invocation.messages.length < 1 ||
      !Number.isSafeInteger(recentBufferTokens) || recentBufferTokens < 1 || recentBufferTokens > 600) {
    throw new Error('Memory experiment baseline or recent buffer is invalid')
  }
  const messages = invocation.messages.map((message) => Object.freeze(ConversationMessageSchema.parse(message)))
  const current = messages[messages.length - 1]
  if (current === undefined || current.role !== 'user') throw new Error('Current user turn is missing')
  const history = messages.slice(0, -1)
  const memory = MemorySearchResultSchema.parse(rawMemory)
  const projection = Object.freeze(memory.items.map(createMemorySearchContextProjection))
  const projectionTokens = projection.reduce((sum, item) => sum + estimateMemorySearchContextTokens(item), 0)
  if (projectionTokens > 600 || projectionTokens > memory.tokenBudget.effectiveTokens) {
    throw new Error('Memory projection exceeds its authorized budget')
  }
  const currentTokens = estimateConversationMessageTokens(current.content)
  const remaining = invocation.routing.budget.contextTokens - currentTokens - projectionTokens
  if (remaining < 0) throw new Error('Memory replacement exceeds the actual context budget')
  const recent = selectConversationHistory({
    contextTokenBudget: currentTokens + Math.min(recentBufferTokens, remaining),
    currentMessage: current.content,
    history
  })
  const control = Object.freeze({ ...invocation, memory: Object.freeze([]), messages: Object.freeze(messages) })
  const treatment = Object.freeze({ ...control, memory: projection, messages: Object.freeze([...recent.messages, current]) })
  // An unchanged complete history plus Memory would be the prohibited additive treatment.
  if (projection.length > 0 && history.length > 0 && recent.messages.length === history.length) {
    throw new Error('Memory projection cannot be appended to the complete control history')
  }
  return Object.freeze({
    control,
    treatment,
    controlHash: createHash('sha256').update(JSON.stringify(control)).digest('hex'),
    treatmentHash: createHash('sha256').update(JSON.stringify(treatment)).digest('hex'),
    controlComparableTokensEstimated: history.reduce((sum, message) => sum + estimateConversationMessageTokens(message.content), 0),
    treatmentComparableTokensEstimated: recent.estimatedTokens - currentTokens + projectionTokens
  })
}
