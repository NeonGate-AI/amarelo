import { AnaConversationAgent } from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import { ChatOpenAI } from '@langchain/openai'
import type { FastifyInstance } from 'fastify'

import { createChatterbox } from '../app'
import {
  hasChatterboxProviderConfiguration,
  type ChatterboxEnvironment
} from '../configuration'
import {
  createOpenAiRealtimeCall,
  LangChainAnaChatModelAdapter
} from '../model'

export function createProviderChatterbox(
  configuration: ChatterboxEnvironment
): FastifyInstance {
  if (!hasChatterboxProviderConfiguration(configuration)) {
    return createChatterbox({ logger: true })
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
  const runtime = new ConversationRuntime({
    agents: [new AnaConversationAgent({ model: modelAdapter })]
  })

  return createChatterbox({
    createRealtimeCall: (sdp) =>
      createOpenAiRealtimeCall({
        apiKey: configuration.OPENAI_API_KEY,
        sdp
      }),
    logger: true,
    runtime
  })
}
