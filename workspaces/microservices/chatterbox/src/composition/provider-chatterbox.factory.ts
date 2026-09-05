import { AnaConversationAgent } from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import { ChatOpenAI } from '@langchain/openai'
import type { FastifyInstance } from 'fastify'

import { createChatterbox, type ChatterboxFactoryOptions } from '../app'
import { createWorkOsSessionAuthenticator } from '../authentication'
import {
  hasChatterboxAuthenticationConfiguration,
  hasChatterboxProviderConfiguration,
  type ChatterboxEnvironment
} from '../configuration'
import {
  createOpenAiRealtimeCall,
  LangChainAnaChatModelAdapter
} from '../model'
import { ChatterboxObservabilityAdapter } from '../observability'
import { createMemoryRuntimeBinding } from './memory-runtime-binding.factory'
import { createMemoryBackgroundBinding } from './memory-background-binding.factory'
import { createMemoryShadowBinding } from './memory-shadow-binding.factory'

export function createProviderChatterbox(
  configuration: ChatterboxEnvironment
): FastifyInstance {
  const memory = createMemoryRuntimeBinding(configuration)
  const background = createMemoryBackgroundBinding(configuration)
  function compose(options: ChatterboxFactoryOptions): FastifyInstance {
    const app = createChatterbox({
      ...options,
      ...memory.options,
      ...background.options
    })
    app.addHook('onReady', memory.start)
    app.addHook('onReady', background.start)
    app.addHook('onClose', background.close)
    app.addHook('onClose', memory.close)
    return app
  }
  const options: ChatterboxFactoryOptions = {
    allowedOrigins: configuration.CHATTERBOX_ALLOWED_ORIGINS,
    authenticate: hasChatterboxAuthenticationConfiguration(configuration)
      ? createWorkOsSessionAuthenticator({
          apiKey: configuration.WORKOS_API_KEY,
          clientId: configuration.WORKOS_CLIENT_ID,
          cookieName: configuration.WORKOS_COOKIE_NAME,
          cookiePassword: configuration.WORKOS_COOKIE_PASSWORD,
          timeoutMs: configuration.CHATTERBOX_AUTH_TIMEOUT_MS
        })
      : undefined,
    authenticationTimeoutMs: configuration.CHATTERBOX_AUTH_TIMEOUT_MS,
    maxConcurrentTurns: configuration.CHATTERBOX_MAX_CONCURRENT_TURNS,
    maxSessions: configuration.CHATTERBOX_MAX_SESSIONS,
    observability: new ChatterboxObservabilityAdapter(),
    rateLimitPerMinute: configuration.CHATTERBOX_RATE_LIMIT_PER_MINUTE,
    sessionTtlMs: configuration.CHATTERBOX_SESSION_TTL_MS
  }
  if (!hasChatterboxProviderConfiguration(configuration)) {
    return compose(options)
  }

  const model = new ChatOpenAI({
    apiKey: configuration.OPENAI_API_KEY,
    maxRetries: 0,
    model: configuration.AI_CONVERSATION_MODEL,
    temperature: 0,
    timeout: configuration.CHATTERBOX_MODEL_TIMEOUT_MS
  })
  const modelAdapter = new LangChainAnaChatModelAdapter({
    model,
    modelId: configuration.AI_CONVERSATION_MODEL,
    providerId: 'openai'
  })
  const agent = new AnaConversationAgent({ model: modelAdapter })
  const runtime = new ConversationRuntime({ agents: [agent] })
  const createRuntime = createMemoryShadowBinding(configuration, {
    agent,
    baseline: runtime,
    createMemoryClient: memory.options.createMemoryClient
  })

  return compose({
    ...options,
    createRealtimeCall: (sdp) =>
      createOpenAiRealtimeCall({
        apiKey: configuration.OPENAI_API_KEY,
        sdp,
        timeoutMs: configuration.CHATTERBOX_MODEL_TIMEOUT_MS
      }),
    createRuntime
  })
}
