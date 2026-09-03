import type { MemorySearchContextProjection } from '@repo/memory-sdk'

import { selectConversationHistory } from '@context'
import {
  type AgentId,
  ConversationTurnInputSchema,
  type ConversationMessage
} from '@contracts'
import { MemoryContextPort } from '@memory'
import {
  ConversationAgentPort,
  type ConversationAgentResult,
  ConversationAgentResultSchema
} from '@ports'
import { routeConversationTurn } from '@routing'

import {
  ConversationAgentInvocationError,
  ConversationAgentNotConfiguredError,
  DuplicateConversationAgentError
} from './conversation-runtime.error'
import type {
  ConversationMemoryStatus,
  ConversationTurnResult
} from './conversation-turn-result.type'

const EMPTY_MEMORY: readonly MemorySearchContextProjection[] = Object.freeze([])

export interface ConversationRuntimeDependencies {
  readonly agents: readonly ConversationAgentPort[]
  readonly memory?: MemoryContextPort
}

function validateMemoryContext(
  projection: readonly MemorySearchContextProjection[],
  tokenBudgetUsed: number,
  tokenBudgetRequested: number
): void {
  if (
    !Number.isInteger(tokenBudgetUsed) ||
    tokenBudgetUsed < 0 ||
    tokenBudgetUsed > tokenBudgetRequested
  ) {
    throw new RangeError('Memory context exceeded the requested token budget')
  }

  if (projection.some((item) => item.trust !== 'untrusted-memory-data')) {
    throw new TypeError('Memory context lost its untrusted-data marker')
  }
}

export class ConversationRuntime {
  readonly #agents: ReadonlyMap<AgentId, ConversationAgentPort>
  readonly #memory: MemoryContextPort | undefined

  constructor(dependencies: ConversationRuntimeDependencies) {
    const agents = new Map<AgentId, ConversationAgentPort>()
    for (const agent of dependencies.agents) {
      if (agents.has(agent.id)) {
        throw new DuplicateConversationAgentError(agent.id)
      }
      agents.set(agent.id, agent)
    }
    this.#agents = agents
    this.#memory = dependencies.memory
  }

  async execute(rawInput: unknown): Promise<ConversationTurnResult> {
    const input = ConversationTurnInputSchema.parse(rawInput)
    const agent = this.#agents.get(input.agentId)
    if (agent === undefined) {
      throw new ConversationAgentNotConfiguredError(input.agentId)
    }

    const routing = routeConversationTurn(input.message)
    const history = selectConversationHistory({
      contextTokenBudget: routing.budget.contextTokens,
      currentMessage: input.message,
      history: input.history
    })

    let memory: readonly MemorySearchContextProjection[] = EMPTY_MEMORY
    let memoryRequestId: string | null = null
    let memoryStatus: ConversationMemoryStatus =
      routing.budget.memoryTokens === 0 ? 'skipped' : 'unavailable'
    let memoryUsedTokens = 0

    if (routing.budget.memoryTokens > 0 && this.#memory !== undefined) {
      try {
        const memoryContext = await this.#memory.retrieve({
          asOf: input.asOf,
          purpose: input.purpose,
          query: input.message,
          tokenBudget: routing.budget.memoryTokens
        })
        validateMemoryContext(
          memoryContext.projection,
          memoryContext.tokenBudgetUsed,
          routing.budget.memoryTokens
        )
        memory = Object.freeze([...memoryContext.projection])
        memoryRequestId = memoryContext.requestId
        memoryStatus = 'retrieved'
        memoryUsedTokens = memoryContext.tokenBudgetUsed
      } catch {
        memory = EMPTY_MEMORY
        memoryRequestId = null
        memoryStatus = 'unavailable'
        memoryUsedTokens = 0
      }
    }

    const currentMessage: ConversationMessage = Object.freeze({
      content: input.message,
      role: 'user'
    })
    const messages = Object.freeze([...history.messages, currentMessage])

    let agentResult: ConversationAgentResult
    try {
      agentResult = ConversationAgentResultSchema.parse(
        await agent.invoke(
          Object.freeze({
            agentId: input.agentId,
            conversationId: input.conversationId,
            memory,
            messages,
            requestId: input.requestId,
            routing
          })
        )
      )
    } catch (error) {
      throw new ConversationAgentInvocationError(input.agentId, error)
    }

    return Object.freeze({
      agentId: input.agentId,
      context: Object.freeze({
        budgetExceededByCurrentMessage:
          history.budgetExceededByCurrentMessage,
        budgetTokens: routing.budget.contextTokens,
        estimatedTokens: history.estimatedTokens,
        estimatorVersion: history.estimatorVersion,
        historyMessagesOmitted: history.historyMessagesOmitted,
        historyMessagesUsed: history.messages.length
      }),
      conversationId: input.conversationId,
      memory: Object.freeze({
        itemCount: memory.length,
        requestId: memoryRequestId,
        requestedTokens: routing.budget.memoryTokens,
        status: memoryStatus,
        usedTokens: memoryUsedTokens
      }),
      modelUsage:
        agentResult.usage === null
          ? null
          : Object.freeze({ ...agentResult.usage }),
      requestId: input.requestId,
      response: agentResult.response,
      routing
    })
  }
}
