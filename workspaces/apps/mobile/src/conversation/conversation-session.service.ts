import {
  ConversationClientError,
  MAX_CONVERSATION_HISTORY_MESSAGES,
  type ConversationSdkMessage,
  type ConversationSessionResponseData,
  type ConversationTurnRequest
} from '@repo/conversation-sdk'

import type { ConversationSessionEvent } from './conversation-session.event'

interface ConversationTurnClient {
  session(options?: {
    readonly signal?: AbortSignal
  }): Promise<ConversationSessionResponseData>
  turn(
    input: ConversationTurnRequest,
    options?: { readonly signal?: AbortSignal }
  ): Promise<import('@repo/conversation-sdk').ConversationTurnResponseData>
}

interface ConversationSessionServiceOptions {
  readonly client: ConversationTurnClient
  readonly onEvent: (event: ConversationSessionEvent) => void
}

interface ActiveConversationRequest {
  readonly controller: AbortController
  readonly generation: number
  readonly requestId: string
}

const UNKNOWN_FAILURE_MESSAGE =
  'Não foi possível concluir este turno de desenvolvimento.'

export class ConversationSessionService {
  readonly #client: ConversationTurnClient
  readonly #onEvent: (event: ConversationSessionEvent) => void
  #active: ActiveConversationRequest | null = null
  #generation = 0
  #session: ConversationSessionResponseData | null = null
  #history: ConversationSdkMessage[] = []

  constructor(options: ConversationSessionServiceOptions) {
    this.#client = options.client
    this.#onEvent = options.onEvent
  }

  async submit(
    input: Omit<ConversationTurnRequest, 'conversationId' | 'history'>
  ): Promise<void> {
    this.cancel()

    const active = Object.freeze({
      controller: new AbortController(),
      generation: ++this.#generation,
      requestId: input.requestId
    })
    this.#active = active
    this.#onEvent({ requestId: active.requestId, type: 'pending' })

    try {
      if (
        this.#session === null ||
        Date.parse(this.#session.expiresAt) <= Date.now()
      ) {
        const session = await this.#client.session({
          signal: active.controller.signal
        })
        if (!this.#isCurrent(active)) return
        this.#session = session
        this.#history = []
      }
      const result = await this.#client.turn(
        {
          agentId: input.agentId,
          conversationId: this.#session.conversationId,
          history: this.#history,
          message: input.message,
          requestId: input.requestId
        },
        {
          signal: active.controller.signal
        }
      )
      if (!this.#isCurrent(active)) return

      this.#active = null
      this.#history = [
        ...this.#history,
        { content: input.message, role: 'user' as const },
        { content: result.response, role: 'assistant' as const }
      ].slice(-MAX_CONVERSATION_HISTORY_MESSAGES)
      this.#onEvent({
        requestId: active.requestId,
        result,
        type: 'succeeded'
      })
    } catch (error) {
      if (!this.#isCurrent(active)) return

      this.#active = null
      if (
        active.controller.signal.aborted ||
        (error instanceof ConversationClientError && error.code === 'aborted')
      ) {
        this.#onEvent({ requestId: active.requestId, type: 'aborted' })
        return
      }

      if (error instanceof ConversationClientError) {
        if (
          ['unauthenticated', 'forbidden', 'session_unavailable'].includes(
            error.code
          )
        ) {
          this.#session = null
          this.#history = []
        }
        this.#onEvent({
          failure: {
            code: error.code,
            message: error.message,
            requestId: error.requestId ?? active.requestId
          },
          requestId: active.requestId,
          type: 'failed'
        })
        return
      }

      this.#onEvent({
        failure: {
          code: 'network_error',
          message: UNKNOWN_FAILURE_MESSAGE,
          requestId: active.requestId
        },
        requestId: active.requestId,
        type: 'failed'
      })
    }
  }

  cancel(options: { readonly notify?: boolean } = {}): void {
    const active = this.#active
    if (active === null) return

    this.#active = null
    this.#generation += 1
    active.controller.abort()
    if (options.notify ?? true) {
      this.#onEvent({ requestId: active.requestId, type: 'aborted' })
    }
  }

  dispose(): void {
    this.cancel({ notify: false })
    this.#session = null
    this.#history = []
  }

  #isCurrent(active: ActiveConversationRequest): boolean {
    return (
      this.#active?.generation === active.generation &&
      this.#active.requestId === active.requestId
    )
  }
}
