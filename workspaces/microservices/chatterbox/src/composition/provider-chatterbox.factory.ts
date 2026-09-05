import { AnaConversationAgent } from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import { ChatOpenAI } from '@langchain/openai'
import type { FastifyInstance } from 'fastify'

import { createChatterbox, type ChatterboxFactoryOptions } from '../app'
import {
  createLocalSessionAuthenticator,
  createWorkOsSessionAuthenticator
} from '../authentication'
import {
  hasChatterboxAuthenticationConfiguration,
  hasChatterboxProviderConfiguration,
  type ChatterboxEnvironment
} from '../configuration'
import {
  LangChainAnaChatModelAdapter
} from '../model'
import { ChatterboxObservabilityAdapter } from '../observability'
import { OpenAiRealtimeSessionService } from '../realtime'
import { createMemoryRequestScope } from './request-memory-scope.factory'
import { createMemoryRuntimeBinding } from './memory-runtime-binding.factory'
import { createMemoryBackgroundBinding } from './memory-background-binding.factory'
import { createMemoryShadowBinding } from './memory-shadow-binding.factory'
import { createMemoryExperimentBinding } from './memory-experiment-binding.factory'
import { createMemoryServingModelBinding } from './memory-serving-model.factory'

export function createProviderChatterbox(
  configuration: ChatterboxEnvironment
): FastifyInstance {
  const memory = createMemoryRuntimeBinding(configuration)
  const background = createMemoryBackgroundBinding(configuration)
  const realtime = configuration.OPENAI_API_KEY === undefined ? undefined : new OpenAiRealtimeSessionService({
    apiKey: configuration.OPENAI_API_KEY, model: configuration.OPENAI_REALTIME_MODEL,
    voice: configuration.OPENAI_REALTIME_VOICE, transcriptionModel: configuration.OPENAI_TRANSCRIPTION_MODEL,
    timeoutMs: configuration.CHATTERBOX_MODEL_TIMEOUT_MS, maxSessions: Math.min(configuration.CHATTERBOX_MAX_CONCURRENT_TURNS, 4),
    ...(configuration.CHATTERBOX_REALTIME_MEMORY_ENABLED ? { memory: {
      createMemoryClient: (context) => {
        if (memory.options.createMemoryClient === undefined) throw new Error('Memory unavailable')
        return memory.options.createMemoryClient(context)
      },
      createScope: createMemoryRequestScope,
      usageLedgerForRequest: memory.usageLedgerForRequest,
      ingest: async (input) => background.options.ingestPatientTurn?.(input) ?? 'unconfirmed'
    } } : {})
  })
  function compose(options: ChatterboxFactoryOptions): FastifyInstance {
    const app = createChatterbox({
      ...options,
      ...memory.options,
      ...background.options
    })
    app.addHook('onReady', memory.start)
    app.addHook('onReady', background.start)
    app.addHook('onClose', async () => { await realtime?.close() })
    app.addHook('onClose', background.close)
    app.addHook('onClose', memory.close)
    return app
  }
  const options: ChatterboxFactoryOptions = {
    allowedOrigins: configuration.CHATTERBOX_ALLOWED_ORIGINS,
    createRealtimeSession: realtime === undefined ? undefined : (context, sdp) => realtime.start(context, sdp),
    stopRealtimeSession: realtime === undefined ? undefined : (context) => realtime.stop(context),
    realtimeSessionStatus: realtime === undefined ? undefined : (context) => realtime.status(context),
    authenticate:
      configuration.CHATTERBOX_AUTH_MODE === 'local'
        ? createLocalSessionAuthenticator({
            host: configuration.CHATTERBOX_HOST,
            nodeEnvironment: configuration.NODE_ENV,
            ownerId: configuration.CHATTERBOX_LOCAL_OWNER_ID,
            sessionTtlMs: configuration.CHATTERBOX_SESSION_TTL_MS
          })
        : hasChatterboxAuthenticationConfiguration(configuration)
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
  const servingModel = createMemoryServingModelBinding(configuration, {
    model,
    usageLedgerForRequest: memory.usageLedgerForRequest
  })
  const createRuntime = configuration.CHATTERBOX_MEMORY_EXPERIMENT_ENABLED
    ? createMemoryExperimentBinding(configuration, {
        baseline: runtime,
        createMemoryClient: memory.options.createMemoryClient,
        createAgent: (context) =>
          new AnaConversationAgent({
            model: new LangChainAnaChatModelAdapter({
              model: servingModel(context),
              modelId: configuration.AI_CONVERSATION_MODEL,
              providerId: 'openai'
            })
          })
      })
    : createMemoryShadowBinding(configuration, {
        agent,
        baseline: runtime,
        createMemoryClient: memory.options.createMemoryClient
      })

  return compose({
    ...options,
    createRuntime
  })
}
