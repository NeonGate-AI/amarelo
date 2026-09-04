import {
  ConversationClientError,
  type ConversationTurnRequest,
  type ConversationTurnResponseData
} from '@repo/conversation-sdk'

interface PendingTurn {
  readonly input: ConversationTurnRequest
  readonly reject: (reason: unknown) => void
  readonly resolve: (value: ConversationTurnResponseData) => void
  readonly signal: AbortSignal | undefined
}

export const SYNTHETIC_TURN_RESPONSE: ConversationTurnResponseData =
  Object.freeze({
    agentId: 'ana',
    conversationId: 'mobile-conversation-1',
    metrics: Object.freeze({
      context: Object.freeze({
        budgetExceededByCurrentMessage: false,
        budgetTokens: 800,
        estimatedTokens: 12,
        estimatorVersion: 'characters-v1',
        historyMessagesOmitted: 0,
        historyMessagesUsed: 0
      }),
      firstTokenLatency: Object.freeze({ status: 'unavailable' }),
      memoryStatus: 'skipped',
      modelCalls: 1,
      modelUsage: Object.freeze({
        inputTokens: 24,
        modelId: 'synthetic-model',
        outputTokens: 8,
        providerId: 'synthetic-provider',
        totalTokens: 32
      }),
      routingLane: 'reflex',
      totalLatencyMs: 12
    }),
    requestId: 'mobile-request-1',
    response: 'Resposta sintética completa da Ana.'
  })

export function createMobileTurnRequest(
  requestId = 'mobile-request-1'
): ConversationTurnRequest {
  return {
    agentId: 'ana',
    asOf: '2026-09-03T12:00:00.000Z',
    conversationId: 'mobile-conversation-1',
    history: [],
    message: 'Oi!',
    purpose: 'conversation.support',
    requestId
  }
}

export class DeferredConversationClient {
  readonly turns: PendingTurn[] = []

  turn(
    input: ConversationTurnRequest,
    options?: { readonly signal?: AbortSignal }
  ): Promise<ConversationTurnResponseData> {
    return new Promise((resolve, reject) => {
      const pending = { input, reject, resolve, signal: options?.signal }
      this.turns.push(pending)

      if (options?.signal?.aborted === true) {
        reject(
          new ConversationClientError({
            code: 'aborted',
            message: 'A solicitação da conversa foi cancelada.',
            requestId: input.requestId
          })
        )
        return
      }

      options?.signal?.addEventListener(
        'abort',
        () =>
          reject(
            new ConversationClientError({
              code: 'aborted',
              message: 'A solicitação da conversa foi cancelada.',
              requestId: input.requestId
            })
          ),
        { once: true }
      )
    })
  }

  resolve(index: number, response: ConversationTurnResponseData): void {
    this.turns[index]?.resolve(response)
  }

  reject(index: number, error: unknown): void {
    this.turns[index]?.reject(error)
  }
}
