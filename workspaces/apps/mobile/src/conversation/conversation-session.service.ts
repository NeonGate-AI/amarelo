import {
  ConversationClientError,
  type ConversationTurnRequest
} from '@repo/conversation-sdk'

import type { ConversationSessionEvent } from './conversation-session.event'

interface ConversationTurnClient {
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

  constructor(options: ConversationSessionServiceOptions) {
    this.#client = options.client
    this.#onEvent = options.onEvent
  }

  async submit(input: ConversationTurnRequest): Promise<void> {
    this.cancel()

    const active = Object.freeze({
      controller: new AbortController(),
      generation: ++this.#generation,
      requestId: input.requestId
    })
    this.#active = active
    this.#onEvent({ requestId: active.requestId, type: 'pending' })

    try {
      const result = await this.#client.turn(input, {
        signal: active.controller.signal
      })
      if (!this.#isCurrent(active)) return

      this.#active = null
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
  }

  #isCurrent(active: ActiveConversationRequest): boolean {
    return (
      this.#active?.generation === active.generation &&
      this.#active.requestId === active.requestId
    )
  }
}
