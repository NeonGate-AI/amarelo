import {
  ConversationSafeErrorResponseSchema,
  ConversationSessionResponseSchema,
  ConversationTurnRequestSchema,
  ConversationTurnResponseSchema,
  type ConversationTurnRequest,
  type ConversationSessionResponseData,
  type ConversationTurnResponseData
} from '../contracts'
import { ConversationClientError } from '../errors'

const DEFAULT_TIMEOUT_MS = 30_000
const TURN_PATH = 'v1/conversation/turn'

export interface ConversationClientOptions {
  readonly baseUrl: string
  readonly fetch?: typeof fetch
  readonly timeoutMs?: number
}

export interface ConversationTurnOptions {
  readonly signal?: AbortSignal
}

function joinEndpoint(baseUrl: string, path = TURN_PATH): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  return normalized.length === 0 ? `/${path}` : `${normalized}/${path}`
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export class ConversationClient {
  readonly #endpoint: string
  readonly #sessionEndpoint: string
  readonly #fetch: typeof fetch
  readonly #timeoutMs: number

  constructor(options: ConversationClientOptions) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new RangeError(
        'Conversation client timeout must be a positive integer'
      )
    }

    this.#endpoint = joinEndpoint(options.baseUrl)
    this.#sessionEndpoint = joinEndpoint(
      options.baseUrl,
      'v1/conversation/session'
    )
    this.#fetch = options.fetch ?? globalThis.fetch
    this.#timeoutMs = timeoutMs
  }

  async turn(
    rawInput: ConversationTurnRequest,
    options: ConversationTurnOptions = {}
  ): Promise<ConversationTurnResponseData> {
    const input = ConversationTurnRequestSchema.parse(rawInput)
    const payload = await this.#request(
      this.#endpoint,
      input,
      input.requestId,
      options
    )
    const result = ConversationTurnResponseSchema.safeParse(payload)
    if (
      !result.success ||
      result.data.data.conversationId !== input.conversationId ||
      result.data.data.requestId !== input.requestId
    ) {
      throw new ConversationClientError({
        code: 'invalid_response',
        message: 'A resposta da conversa não pôde ser validada.',
        requestId: input.requestId
      })
    }
    return result.data.data
  }

  async session(
    options: ConversationTurnOptions = {}
  ): Promise<ConversationSessionResponseData> {
    const payload = await this.#request(
      this.#sessionEndpoint,
      {},
      null,
      options
    )
    const result = ConversationSessionResponseSchema.safeParse(payload)
    if (
      !result.success ||
      Date.parse(result.data.data.expiresAt) <= Date.now()
    ) {
      throw new ConversationClientError({
        code: 'invalid_response',
        message: 'A sessão da conversa não pôde ser validada.',
        requestId: null
      })
    }
    return result.data.data
  }

  async #request(
    endpoint: string,
    body: unknown,
    requestId: string | null,
    options: ConversationTurnOptions
  ): Promise<unknown> {
    const controller = new AbortController()
    let timedOut = false

    const abortFromCaller = () => controller.abort(options.signal?.reason)
    if (options.signal?.aborted === true) {
      abortFromCaller()
    } else {
      options.signal?.addEventListener('abort', abortFromCaller, { once: true })
    }

    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort(
        new DOMException('Conversation request timed out', 'TimeoutError')
      )
    }, this.#timeoutMs)

    try {
      if (controller.signal.aborted)
        throw new DOMException('Aborted', 'AbortError')
      const response = await this.#fetch(endpoint, {
        body: JSON.stringify(body),
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'error',
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST',
        signal: controller.signal
      })
      controller.signal.throwIfAborted()
      const payload = await parseJson(response)
      controller.signal.throwIfAborted()

      if (!response.ok) {
        const safeError = ConversationSafeErrorResponseSchema.safeParse(payload)
        if (safeError.success) {
          throw new ConversationClientError({
            code: safeError.data.error.code,
            message: safeError.data.error.message,
            requestId: safeError.data.error.requestId ?? requestId
          })
        }

        throw new ConversationClientError({
          code: 'invalid_response',
          message: 'A resposta de erro da conversa não pôde ser validada.',
          requestId
        })
      }

      return payload
    } catch (error) {
      if (error instanceof ConversationClientError) {
        throw error
      }

      if (controller.signal.aborted) {
        throw new ConversationClientError({
          cause: error,
          code: timedOut ? 'timeout' : 'aborted',
          message: timedOut
            ? 'A conversa excedeu o tempo de resposta.'
            : 'A solicitação da conversa foi cancelada.',
          requestId
        })
      }

      throw new ConversationClientError({
        cause: error,
        code: 'network_error',
        message: 'Não foi possível alcançar o serviço de conversa.',
        requestId
      })
    } finally {
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', abortFromCaller)
    }
  }
}
