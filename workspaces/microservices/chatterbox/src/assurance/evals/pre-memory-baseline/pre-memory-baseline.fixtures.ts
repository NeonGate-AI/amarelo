import {
  AnaChatModelPort,
  AnaConversationAgent,
  type AnaChatModelRequest,
  type AnaChatModelResult
} from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import type { FastifyInstance } from 'fastify'

import { createChatterbox } from 'chatterbox'
import {
  SYNTHETIC_CONVERSATION_HEADERS,
  SYNTHETIC_IDENTITY
} from '../chatterbox'

export const PRE_MEMORY_BASELINE_GENERATED_AT =
  '2026-09-03T12:00:00.000Z' as const

// Archived SPEC-009 fixture identity stays unchanged; authority fields are
// projected out when exercising the current authenticated HTTP transport.
export const PRE_MEMORY_BASELINE_REQUEST = {
  agentId: 'ana',
  asOf: PRE_MEMORY_BASELINE_GENERATED_AT,
  conversationId: 'spec-009-baseline-conversation-1',
  history: [],
  message: 'Oi!',
  purpose: 'conversation.support',
  requestId: 'spec-009-baseline-request-1'
} as const

export const PRE_MEMORY_BASELINE_RESPONSE =
  'Estou aqui para acompanhar você.' as const

export const PRE_MEMORY_RATE_SNAPSHOT = Object.freeze({
  effectiveAt: '2026-09-03T00:00:00.000Z',
  id: 'synthetic-chat-model-rate-v1' as const,
  inputMicrousdPerMillionTokens: 250_000,
  modelId: 'synthetic-chat-model' as const,
  outputMicrousdPerMillionTokens: 750_000,
  providerId: 'synthetic-provider' as const
})

export class PreMemoryBaselineModel extends AnaChatModelPort {
  readonly requests: AnaChatModelRequest[] = []

  async invoke(input: AnaChatModelRequest): Promise<AnaChatModelResult> {
    this.requests.push(input)
    return Object.freeze({
      response: PRE_MEMORY_BASELINE_RESPONSE,
      usage: Object.freeze({
        inputTokens: 40,
        modelId: PRE_MEMORY_RATE_SNAPSHOT.modelId,
        outputTokens: 8,
        providerId: PRE_MEMORY_RATE_SNAPSHOT.providerId,
        totalTokens: 48
      })
    })
  }
}

export function createPreMemoryBaselineChatterbox(options: {
  readonly model: PreMemoryBaselineModel
  readonly nowMs: () => number
}): FastifyInstance {
  const runtime = new ConversationRuntime({
    agents: [new AnaConversationAgent({ model: options.model })]
  })
  return createChatterbox({
    allowedOrigins: [SYNTHETIC_CONVERSATION_HEADERS.origin],
    authenticate: async () => SYNTHETIC_IDENTITY,
    createConversationId: () => PRE_MEMORY_BASELINE_REQUEST.conversationId,
    nowMs: options.nowMs,
    runtime
  })
}

export function createPreMemorySequenceClock(
  ...values: readonly number[]
): () => number {
  let index = 0
  return () => {
    const value = values.at(Math.min(index, values.length - 1)) ?? 0
    index += 1
    return value
  }
}

export function createPreMemoryInjectedFetch(
  app: FastifyInstance
): typeof fetch {
  const injectedFetch: typeof fetch = async (input, init) => {
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
    const requestMethod = (init?.method ?? 'GET').toUpperCase() as
      | 'DELETE'
      | 'GET'
      | 'HEAD'
      | 'OPTIONS'
      | 'PATCH'
      | 'POST'
      | 'PUT'
    const injectedResponse = await app.inject({
      headers: {
        ...Object.fromEntries(new Headers(init?.headers).entries()),
        ...SYNTHETIC_CONVERSATION_HEADERS
      },
      method: requestMethod,
      payload: typeof init?.body === 'string' ? init.body : undefined,
      url: `${url.pathname}${url.search}`
    })

    return new Response(injectedResponse.body, {
      headers: Object.entries(injectedResponse.headers).flatMap(
        ([name, value]) =>
          value === undefined
            ? []
            : [[name, Array.isArray(value) ? value.join(', ') : String(value)]]
      ),
      status: injectedResponse.statusCode
    })
  }

  return injectedFetch
}
