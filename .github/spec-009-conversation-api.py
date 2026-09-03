from pathlib import Path

files = {
    'workspaces/apps/conversation-api/package.json': r'''{
  "name": "conversation-api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc --noEmit",
    "dev": "tsx watch src/server/conversation-api.server.ts",
    "start": "tsx src/server/conversation-api.server.ts",
    "test": "node --import tsx src/assurance/evals/conversation-api/conversation-api.eval.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ai/ana": "workspace:*",
    "@ai/conversation": "workspace:*",
    "@langchain/core": "1.2.9",
    "@langchain/openai": "1.5.11",
    "@repo/conversation-sdk": "workspace:*",
    "fastify": "5.12.1",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@types/node": "24.13.3",
    "tsx": "4.23.12",
    "typescript": "5.9.2"
  }
}
''',
    'workspaces/apps/conversation-api/tsconfig.json': r'''{
  "compilerOptions": {
    "allowJs": false,
    "allowImportingTsExtensions": true,
    "baseUrl": ".",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@context": ["../../ai/conversation/src/context/index.ts"],
      "@contracts": ["../../ai/conversation/src/contracts/index.ts"],
      "@memory": ["../../ai/conversation/src/memory/index.ts"],
      "@ports": ["../../ai/conversation/src/ports/index.ts"],
      "@routing": ["../../ai/conversation/src/routing/index.ts"],
      "@runtime": ["../../ai/conversation/src/runtime/index.ts"]
    },
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
''',
    'workspaces/apps/conversation-api/turbo.json': r'''{
  "extends": ["//"],
  "tasks": {
    "build": {
      "outputs": []
    }
  }
}
''',
    'workspaces/apps/conversation-api/readme.md': r'''# Conversation API

`conversation-api` is the Node/Fastify composition boundary for the first real Ana text turn. It owns provider configuration, HTTP validation, safe error mapping, and request metrics while keeping `@ai/conversation`, `@ai/ana`, and `@repo/conversation-sdk` provider- and transport-bounded.

The default test path uses Fastify injection and deterministic model doubles. Provider-backed startup requires explicit server-only environment configuration.
''',
    'workspaces/apps/conversation-api/src/configuration/conversation-api-environment.validate.ts': r'''import { z } from 'zod'

const ConversationApiEnvironmentSchema = z.object({
  AI_CONVERSATION_MODEL: z.string().trim().min(1).max(200),
  CONVERSATION_API_HOST: z.string().trim().min(1).default('0.0.0.0'),
  CONVERSATION_API_MODEL_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(120_000)
    .default(30_000),
  OPENAI_API_KEY: z.string().trim().min(1),
  PORT: z.coerce.number().int().positive().max(65_535).default(3004)
})

export type ConversationApiEnvironment = z.output<
  typeof ConversationApiEnvironmentSchema
>

export function validateConversationApiEnvironment(
  environment: NodeJS.ProcessEnv
): ConversationApiEnvironment {
  return ConversationApiEnvironmentSchema.parse(environment)
}
''',
    'workspaces/apps/conversation-api/src/configuration/index.ts': r'''export * from './conversation-api-environment.validate'
''',
    'workspaces/apps/conversation-api/src/model/langchain-ana-chat-model.adapter.ts': r'''import type { AnaChatModelRequest, AnaChatModelResult } from '@ai/ana'
import { AnaChatModelPort } from '@ai/ana'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage
} from '@langchain/core/messages'

export interface LangChainChatModelInvoker {
  invoke(messages: BaseMessage[]): Promise<AIMessage>
}

export interface LangChainAnaChatModelAdapterOptions {
  readonly model: LangChainChatModelInvoker
  readonly modelId: string
  readonly providerId: string
}

function textFromContent(content: AIMessage['content']): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  const parts: string[] = []
  for (const part of content as unknown[]) {
    if (typeof part === 'string') {
      parts.push(part)
      continue
    }
    if (
      typeof part === 'object' &&
      part !== null &&
      'type' in part &&
      part.type === 'text' &&
      'text' in part &&
      typeof part.text === 'string'
    ) {
      parts.push(part.text)
    }
  }
  return parts.join('\n').trim()
}

export class LangChainAnaChatModelAdapter extends AnaChatModelPort {
  readonly #model: LangChainChatModelInvoker
  readonly #modelId: string
  readonly #providerId: string

  constructor(options: LangChainAnaChatModelAdapterOptions) {
    super()
    this.#model = options.model
    this.#modelId = options.modelId
    this.#providerId = options.providerId
  }

  async invoke(input: AnaChatModelRequest): Promise<AnaChatModelResult> {
    const messages: BaseMessage[] = [new SystemMessage(input.instructions)]
    for (const message of input.messages) {
      messages.push(
        message.role === 'user'
          ? new HumanMessage(message.content)
          : new AIMessage(message.content)
      )
    }

    const response = await this.#model.invoke(messages)
    const usage = response.usage_metadata

    return Object.freeze({
      response: textFromContent(response.content),
      usage:
        usage === undefined
          ? null
          : Object.freeze({
              inputTokens: usage.input_tokens ?? null,
              modelId: this.#modelId,
              outputTokens: usage.output_tokens ?? null,
              providerId: this.#providerId,
              totalTokens: usage.total_tokens ?? null
            })
    })
  }
}
''',
    'workspaces/apps/conversation-api/src/model/index.ts': r'''export * from './langchain-ana-chat-model.adapter'
''',
    'workspaces/apps/conversation-api/src/app/conversation-api.factory.ts': r'''import {
  ConversationAgentInvocationError,
  type ConversationRuntime,
  type ConversationTurnInput,
  type ConversationTurnResult
} from '@ai/conversation'
import {
  ConversationSafeErrorResponseSchema,
  ConversationTurnRequestSchema,
  ConversationTurnResponseSchema,
  type ConversationSafeErrorCode,
  type ConversationSafeErrorResponse,
  type ConversationTurnResponseData
} from '@repo/conversation-sdk'
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyRequest
} from 'fastify'

const CONVERSATION_BODY_LIMIT_BYTES = 512 * 1024

export interface ConversationApiFactoryOptions {
  readonly logger?: boolean
  readonly nowMs?: () => number
  readonly runtime: Pick<ConversationRuntime, 'execute'>
}

function requestCorrelationId(request: FastifyRequest): string {
  return String(request.id)
}

function safeError(
  code: ConversationSafeErrorCode,
  message: string,
  requestId: string | null
): ConversationSafeErrorResponse {
  return ConversationSafeErrorResponseSchema.parse({
    error: {
      code,
      message,
      requestId
    }
  })
}

function mapSuccess(
  result: ConversationTurnResult,
  totalLatencyMs: number
): ConversationTurnResponseData {
  return ConversationTurnResponseSchema.parse({
    data: {
      agentId: 'ana',
      conversationId: result.conversationId,
      metrics: {
        context: result.context,
        firstTokenLatency: {
          status: 'unavailable'
        },
        memoryStatus: result.memory.status,
        modelCalls: 1,
        modelUsage: result.modelUsage,
        routingLane: result.routing.lane,
        totalLatencyMs
      },
      requestId: result.requestId,
      response: result.response
    }
  }).data
}

function sendUnexpectedError(
  error: unknown,
  request: FastifyRequest,
  statusCode: number,
  code: ConversationSafeErrorCode,
  message: string
) {
  request.log.error(
    {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      requestId: requestCorrelationId(request)
    },
    'conversation request failed'
  )
  return {
    payload: safeError(code, message, requestCorrelationId(request)),
    statusCode
  }
}

export function createConversationApi(
  options: ConversationApiFactoryOptions
): FastifyInstance {
  const nowMs = options.nowMs ?? Date.now
  const app = Fastify({
    bodyLimit: CONVERSATION_BODY_LIMIT_BYTES,
    disableRequestLogging: true,
    logger: options.logger ?? false
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.status(413).send(
        safeError(
          'request_too_large',
          'A solicitação da conversa excedeu o limite permitido.',
          requestCorrelationId(request)
        )
      )
    }

    if ((error.statusCode ?? 500) < 500) {
      return reply.status(400).send(
        safeError(
          'invalid_request',
          'Os dados da conversa não são válidos.',
          requestCorrelationId(request)
        )
      )
    }

    const mapped = sendUnexpectedError(
      error,
      request,
      500,
      'internal_error',
      'Não foi possível concluir a conversa.'
    )
    return reply.status(mapped.statusCode).send(mapped.payload)
  })

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(
      safeError(
        'invalid_request',
        'O recurso de conversa solicitado não existe.',
        requestCorrelationId(request)
      )
    )
  )

  app.get('/health', async () => ({ status: 'ok' as const }))

  app.post('/v1/conversation/turn', async (request, reply) => {
    const parsed = ConversationTurnRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send(
        safeError(
          'invalid_request',
          'Os dados da conversa não são válidos.',
          requestCorrelationId(request)
        )
      )
    }

    const input: ConversationTurnInput = parsed.data
    const startedAt = nowMs()

    try {
      const result = await options.runtime.execute(input)
      const totalLatencyMs = Math.max(0, nowMs() - startedAt)
      return reply.status(200).send(mapSuccess(result, totalLatencyMs))
    } catch (error) {
      const isModelFailure = error instanceof ConversationAgentInvocationError
      const mapped = sendUnexpectedError(
        error,
        request,
        isModelFailure ? 502 : 500,
        isModelFailure ? 'model_unavailable' : 'internal_error',
        isModelFailure
          ? 'A Ana não conseguiu responder agora.'
          : 'Não foi possível concluir a conversa.'
      )
      return reply.status(mapped.statusCode).send(mapped.payload)
    }
  })

  return app
}
''',
    'workspaces/apps/conversation-api/src/app/index.ts': r'''export * from './conversation-api.factory'
''',
    'workspaces/apps/conversation-api/src/composition/provider-conversation-api.factory.ts': r'''import { AnaConversationAgent } from '@ai/ana'
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
    maxRetries: 2,
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
''',
    'workspaces/apps/conversation-api/src/composition/index.ts': r'''export * from './provider-conversation-api.factory'
''',
    'workspaces/apps/conversation-api/src/server/conversation-api.server.ts': r'''import { pathToFileURL } from 'node:url'

import { createProviderConversationApi } from '../composition'
import { validateConversationApiEnvironment } from '../configuration'

export async function startConversationApi(
  environment: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const configuration = validateConversationApiEnvironment(environment)
  const app = createProviderConversationApi(configuration)
  let closing = false

  const close = async () => {
    if (closing) return
    closing = true
    await app.close()
  }

  process.once('SIGINT', () => void close())
  process.once('SIGTERM', () => void close())

  await app.listen({
    host: configuration.CONVERSATION_API_HOST,
    port: configuration.PORT
  })
}

const entryPath = process.argv[1]
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  startConversationApi().catch(() => {
    console.error('Conversation API failed to start.')
    process.exitCode = 1
  })
}
''',
    'workspaces/apps/conversation-api/src/server/index.ts': r'''export * from './conversation-api.server'
''',
    'workspaces/apps/conversation-api/src/index.ts': r'''export * from './app'
export * from './composition'
export * from './configuration'
export * from './model'
''',
    'workspaces/apps/conversation-api/src/assurance/evals/conversation-api/conversation-api.fixtures.ts': r'''import {
  AnaChatModelPort,
  AnaConversationAgent,
  type AnaChatModelRequest,
  type AnaChatModelResult
} from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import { AIMessage } from '@langchain/core/messages'
import type { FastifyInstance } from 'fastify'

import {
  createConversationApi,
  LangChainAnaChatModelAdapter,
  type LangChainChatModelInvoker
} from 'conversation-api'

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

export function createTestConversationApi(options: {
  readonly model: RecordingAnaModel
  readonly nowMs?: () => number
}): FastifyInstance {
  const runtime = new ConversationRuntime({
    agents: [new AnaConversationAgent({ model: options.model })]
  })
  return createConversationApi({ nowMs: options.nowMs, runtime })
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

    const url = new URL(typeof input === 'string' ? input : input.url)
    const requestHeaders = Object.fromEntries(new Headers(init?.headers).entries())
    const payload = typeof init?.body === 'string' ? init.body : undefined
    const response = await app.inject({
      headers: requestHeaders,
      method: init?.method ?? 'GET',
      payload,
      url: `${url.pathname}${url.search}`
    })
    const responseHeaders = new Headers()
    for (const [name, value] of Object.entries(response.headers)) {
      if (value === undefined) continue
      if (Array.isArray(value)) {
        for (const item of value) responseHeaders.append(name, String(item))
      } else {
        responseHeaders.set(name, String(value))
      }
    }

    return new Response(response.body, {
      headers: responseHeaders,
      status: response.statusCode
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
''',
    'workspaces/apps/conversation-api/src/assurance/evals/conversation-api/conversation-api.eval.ts': r'''import assert from 'node:assert/strict'

import {
  ConversationClient,
  ConversationSafeErrorResponseSchema,
  type ConversationTurnRequest
} from '@repo/conversation-sdk'

import {
  validateConversationApiEnvironment
} from 'conversation-api'

import {
  RecordingAnaModel,
  createInjectedFetch,
  createLangChainAdapter,
  createSequenceClock,
  createTestConversationApi
} from './conversation-api.fixtures'

const REQUEST: ConversationTurnRequest = {
  agentId: 'ana',
  asOf: '2026-09-03T12:00:00.000Z',
  conversationId: 'api-conversation-1',
  history: [],
  message: 'Oi, Ana.',
  purpose: 'conversation.support',
  requestId: 'api-request-1'
}

async function evaluateHealth() {
  const app = createTestConversationApi({ model: new RecordingAnaModel() })
  const response = await app.inject({ method: 'GET', url: '/health' })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'ok' })
  await app.close()
}

async function evaluateCompleteSdkTurn() {
  const model = new RecordingAnaModel()
  const app = createTestConversationApi({
    model,
    nowMs: createSequenceClock(1_000, 1_025)
  })
  const client = new ConversationClient({
    baseUrl: 'https://conversation.test',
    fetch: createInjectedFetch(app)
  })

  const result = await client.turn(REQUEST)
  assert.equal(result.response, 'Estou aqui para acompanhar você.')
  assert.equal(result.metrics.modelCalls, 1)
  assert.equal(result.metrics.totalLatencyMs, 25)
  assert.equal(result.metrics.firstTokenLatency.status, 'unavailable')
  assert.equal(result.metrics.memoryStatus, 'skipped')
  assert.equal(result.metrics.modelUsage?.totalTokens, 48)
  assert.equal(model.requests.length, 1)
  await app.close()
}

async function evaluateInvalidRequestBeforeModel() {
  const model = new RecordingAnaModel()
  const app = createTestConversationApi({ model })
  const response = await app.inject({
    headers: { 'content-type': 'application/json' },
    method: 'POST',
    payload: JSON.stringify({ ...REQUEST, message: '' }),
    url: '/v1/conversation/turn'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 400)
  assert.equal(safeError.error.code, 'invalid_request')
  assert.equal(model.requests.length, 0)
  assert.equal(response.body.includes('message'), false)
  await app.close()
}

async function evaluateOversizedRequestBeforeModel() {
  const model = new RecordingAnaModel()
  const app = createTestConversationApi({ model })
  const response = await app.inject({
    headers: { 'content-type': 'application/json' },
    method: 'POST',
    payload: JSON.stringify({ ...REQUEST, message: 'x'.repeat(600_000) }),
    url: '/v1/conversation/turn'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 413)
  assert.equal(safeError.error.code, 'request_too_large')
  assert.equal(model.requests.length, 0)
  await app.close()
}

async function evaluateSafeModelFailure() {
  const secretFailure = 'provider-secret-must-not-reach-browser'
  const model = new RecordingAnaModel(
    {
      response: 'unused',
      usage: null
    },
    new Error(secretFailure)
  )
  const app = createTestConversationApi({ model })
  const response = await app.inject({
    headers: { 'content-type': 'application/json' },
    method: 'POST',
    payload: JSON.stringify(REQUEST),
    url: '/v1/conversation/turn'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 502)
  assert.equal(safeError.error.code, 'model_unavailable')
  assert.equal(safeError.error.requestId, REQUEST.requestId)
  assert.equal(response.body.includes(secretFailure), false)
  assert.equal(model.requests.length, 1)
  await app.close()
}

async function evaluateLangChainAdapter() {
  const { adapter, model } = createLangChainAdapter()
  const result = await adapter.invoke({
    instructionVersion: 'ana-support-v1',
    instructions: 'Responda com cuidado.',
    messages: [{ content: 'Oi.', role: 'user' }],
    requestId: 'adapter-request-1'
  })

  assert.equal(result.response, 'Resposta pelo adaptador LangChain.')
  assert.equal(result.usage?.inputTokens, 12)
  assert.equal(result.usage?.outputTokens, 5)
  assert.equal(result.usage?.totalTokens, 17)
  assert.equal(model.calls.length, 1)
}

function evaluateProviderConfigurationGate() {
  assert.throws(() => validateConversationApiEnvironment({}))
  const configuration = validateConversationApiEnvironment({
    AI_CONVERSATION_MODEL: 'synthetic-provider-model',
    OPENAI_API_KEY: 'synthetic-api-key'
  })
  assert.equal(configuration.PORT, 3004)
  assert.equal(configuration.CONVERSATION_API_HOST, '0.0.0.0')
}

await evaluateHealth()
await evaluateCompleteSdkTurn()
await evaluateInvalidRequestBeforeModel()
await evaluateOversizedRequestBeforeModel()
await evaluateSafeModelFailure()
await evaluateLangChainAdapter()
evaluateProviderConfigurationGate()
console.log('Conversation API eval PASS')
''',
    'workspaces/apps/conversation-api/src/assurance/evals/conversation-api/index.ts': r'''export * from './conversation-api.eval'
export * from './conversation-api.fixtures'
'''
}

for relative, content in files.items():
    path = Path(relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.lstrip(), encoding='utf-8')
