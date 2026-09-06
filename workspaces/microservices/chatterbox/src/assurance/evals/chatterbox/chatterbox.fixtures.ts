import {
  AnaChatModelPort,
  AnaConversationAgent,
  type AnaChatModelRequest,
  type AnaChatModelResult
} from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import { AIMessage } from '@langchain/core/messages'
import type { FastifyInstance } from 'fastify'

import {
  createChatterbox,
  LangChainAnaChatModelAdapter,
  type LangChainChatModelInvoker
} from 'chatterbox'

export const SYNTHETIC_CONVERSATION_HEADERS = {
  cookie: 'wos-session=synthetic-session',
  origin: 'http://localhost:3003'
} as const

export const SYNTHETIC_IDENTITY = Object.freeze({
  actorId: 'user_synthetic',
  authenticationSessionId: 'session_synthetic',
  expiresAtMs: Date.parse('2099-01-01T00:00:00.000Z'),
  subjectId: 'user_synthetic',
  tenantId: 'personal:user_synthetic'
})

export async function createOwnedTestSession(
  app: FastifyInstance
): Promise<void> {
  const response = await app.inject({
    headers: SYNTHETIC_CONVERSATION_HEADERS,
    method: 'POST',
    payload: {},
    url: '/v1/conversation/session'
  })
  if (response.statusCode !== 201)
    throw new Error('Synthetic session setup failed')
}

export class RecordingAnaModel extends AnaChatModelPort {
  readonly requests: AnaChatModelRequest[] = []

  constructor(
    private readonly result: AnaChatModelResult = {
      response: 'Estou aqui para acompanhar você.',
      usage: {
        inputTokens: 40,
        modelId: 'synthetic-chat-model',
        outputTokens: 8,
        providerId: 'synthetic-provider',
        totalTokens: 48
      }
    },
    private readonly failure: Error | null = null
  ) {
    super()
  }

  async invoke(input: AnaChatModelRequest): Promise<AnaChatModelResult> {
    this.requests.push(input)
    if (this.failure !== null) throw this.failure
    return this.result
  }
}

export class RecordingLangChainModel implements LangChainChatModelInvoker {
  readonly calls: unknown[][] = []

  async invoke(messages: unknown[]): Promise<AIMessage> {
    this.calls.push(messages)
    return new AIMessage({
      content: 'Resposta pelo adaptador LangChain.',
      usage_metadata: {
        input_tokens: 12,
        output_tokens: 5,
        total_tokens: 17
      }
    })
  }
}

export function createTestChatterbox(options: {
  readonly createRealtimeCall?: (sdp: string) => Promise<string>
  readonly model: RecordingAnaModel
  readonly nowMs?: () => number
}): FastifyInstance {
  const runtime = new ConversationRuntime({
    agents: [new AnaConversationAgent({ model: options.model })]
  })
  return createChatterbox({
    allowedOrigins: [SYNTHETIC_CONVERSATION_HEADERS.origin],
    authenticate: async () => SYNTHETIC_IDENTITY,
    createConversationId: () => 'api-conversation-1',
    createRealtimeCall: options.createRealtimeCall,
    nowMs: options.nowMs,
    runtime
  })
}

export function createUnavailableChatterbox(): FastifyInstance {
  return createChatterbox({
    allowedOrigins: [SYNTHETIC_CONVERSATION_HEADERS.origin],
    authenticate: async () => SYNTHETIC_IDENTITY,
    createConversationId: () => 'api-conversation-1',
    runtime: undefined
  })
}

export function createSequenceClock(...values: number[]): () => number {
  let index = 0
  return () => {
    const value = values.at(Math.min(index, values.length - 1)) ?? 0
    index += 1
    return value
  }
}

export function createInjectedFetch(app: FastifyInstance): typeof fetch {
  return (async (input, init) => {
    if (init?.signal?.aborted === true) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const inputUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    const url = new URL(inputUrl)
    const requestHeaders = Object.fromEntries(
      new Headers(init?.headers).entries()
    )
    const payload = typeof init?.body === 'string' ? init.body : undefined
    const requestMethod = (init?.method ?? 'GET').toUpperCase() as
      | 'DELETE'
      | 'GET'
      | 'HEAD'
      | 'OPTIONS'
      | 'PATCH'
      | 'POST'
      | 'PUT'
    const injectedResponse = await app.inject({
      headers: { ...requestHeaders, ...SYNTHETIC_CONVERSATION_HEADERS },
      method: requestMethod,
      payload,
      url: `${url.pathname}${url.search}`
    })
    const responseHeaders = new Headers()
    for (const [name, value] of Object.entries(injectedResponse.headers)) {
      if (value === undefined) continue
      if (Array.isArray(value)) {
        for (const item of value) responseHeaders.append(name, String(item))
      } else {
        responseHeaders.set(name, String(value))
      }
    }

    return new Response(injectedResponse.body, {
      headers: responseHeaders,
      status: injectedResponse.statusCode
    })
  }) as typeof fetch
}

export function createLangChainAdapter() {
  const model = new RecordingLangChainModel()
  const adapter = new LangChainAnaChatModelAdapter({
    model,
    modelId: 'synthetic-langchain-model',
    providerId: 'synthetic-langchain'
  })
  return { adapter, model }
}
