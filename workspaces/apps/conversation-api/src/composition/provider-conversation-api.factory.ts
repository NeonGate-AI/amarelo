import { AnaConversationAgent } from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import { ChatOpenAI } from '@langchain/openai'
import type { FastifyInstance } from 'fastify'

import { createConversationApi } from '../app'
import type { ConversationApiEnvironment } from '../configuration'
import { LangChainAnaChatModelAdapter } from '../model'

export function createProviderConversationApi(
  configuration: ConversationApiEnvironment
): FastifyInstance {
  const model = new ChatOpenAI({
    apiKey: configuration.OPENAI_API_KEY,
    maxRetries: 0,
    model: configuration.AI_CONVERSATION_MODEL,
    temperature: 0,
    timeout: configuration.CONVERSATION_API_MODEL_TIMEOUT_MS
  })
  const modelAdapter = new LangChainAnaChatModelAdapter({
    model,
    modelId: configuration.AI_CONVERSATION_MODEL,
    providerId: 'openai'
  })
  const runtime = new ConversationRuntime({
    agents: [new AnaConversationAgent({ model: modelAdapter })]
  })

  return createConversationApi({ logger: true, runtime })
}
