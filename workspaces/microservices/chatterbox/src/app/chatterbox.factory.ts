import { randomUUID } from 'node:crypto'

import {
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
  type ConversationTurnResponseData
} from '@repo/conversation-sdk'
import { NoopObservability, type Observability } from '@repo/observability'
import {
  ExplicitMemoryInputSchema,
  ExplicitMemoryOptionsSchema,
  MemorySearchInputSchema,
  UpdateMemoryConsentInputSchema,
  type MemoryClient
} from '@repo/memory-sdk'
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest
} from 'fastify'
import { z } from 'zod'

import {
  ChatterboxAuthenticationGuard,
  type AuthenticatedIdentity,
  type ConversationAuthenticator
} from '../authentication'
import {
  ChatterboxObservationService,
  type ChatterboxObservation
} from '../observability'
import {
  ConversationSessionService,
  type AuthenticatedConversationContext
} from '../session'

const CONVERSATION_BODY_LIMIT_BYTES = 512 * 1024
const SessionRequestSchema = z.object({}).strict()
const MemoryRequestSchema = z.discriminatedUnion('operation', [
  z
    .object({
      conversationId: z.string().uuid(),
      operation: z.literal('get-consent')
    })
    .strict(),
  z
    .object({
      conversationId: z.string().uuid(),
      operation: z.literal('update-consent'),
      input: UpdateMemoryConsentInputSchema.refine((input) =>
        input.changes.every(
          (change) => change.purpose === 'conversation.support'
        )
      )
    })
    .strict(),
  z
    .object({
      conversationId: z.string().uuid(),
      operation: z.literal('remember'),
      input: ExplicitMemoryInputSchema.refine(
        (input) => input.purpose === 'conversation.support'
      ),
      options: ExplicitMemoryOptionsSchema.optional()
    })
    .strict(),
  z
    .object({
      conversationId: z.string().uuid(),
      operation: z.literal('search'),
      input: MemorySearchInputSchema.refine(
        (input) => input.purpose === 'conversation.support'
      )
    })
    .strict(),
  z
    .object({
      conversationId: z.string().uuid(),
      operation: z.literal('forget'),
      memoryId: z.string().uuid()
    })
    .strict()
])

export interface ChatterboxFactoryOptions {
  readonly allowedOrigins?: readonly string[]
  readonly authenticate?: ConversationAuthenticator
  readonly authenticationTimeoutMs?: number
  readonly clock?: () => Date
  readonly createConversationId?: () => string
  readonly createRealtimeCall?: (sdp: string) => Promise<string>
  readonly createMemoryClient?: (
    context: AuthenticatedConversationContext
  ) => MemoryClient
  readonly createRuntime?: (
    context: AuthenticatedConversationContext
  ) => Pick<ConversationRuntime, 'execute'>
  readonly maxConcurrentTurns?: number
  readonly maxSessions?: number
  readonly memoryReadiness?: () => Promise<boolean>
  readonly nowMs?: () => number
  readonly observability?: Pick<Observability, 'event'>
  readonly onObservationFailure?: () => Promise<void> | void
  readonly rateLimitPerMinute?: number
  readonly runtime?: Pick<ConversationRuntime, 'execute'>
  readonly sessionTtlMs?: number
}

interface RequestState {
  readonly startedAt: number
  readonly traceId: string
  identity?: AuthenticatedIdentity
  observation: Omit<
    ChatterboxObservation['attributes'],
    'traceId' | 'latencyMs'
  >
}

const ErrorMessages: Readonly<Record<ConversationSafeErrorCode, string>> = {
  forbidden: 'A sessão da conversa não está disponível para este acesso.',
  internal_error: 'Não foi possível concluir a conversa.',
  invalid_request: 'Os dados da conversa não são válidos.',
  model_unavailable: 'A Ana não conseguiu responder agora.',
  rate_limited:
    'O limite temporário da conversa foi atingido. Tente novamente em instantes.',
  request_too_large: 'A solicitação da conversa excedeu o limite permitido.',
  session_unavailable: 'A autenticação da conversa não está disponível.',
  unauthenticated: 'Entre novamente para iniciar uma conversa.'
}

const ErrorStatuses: Readonly<Record<ConversationSafeErrorCode, number>> = {
  forbidden: 403,
  internal_error: 500,
  invalid_request: 400,
  model_unavailable: 502,
  rate_limited: 429,
  request_too_large: 413,
  session_unavailable: 503,
  unauthenticated: 401
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
        firstTokenLatency: { status: 'unavailable' },
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

export function createChatterbox(
  options: ChatterboxFactoryOptions
): FastifyInstance {
  const nowMs = options.nowMs ?? Date.now
  const clock = options.clock ?? (() => new Date())
  const guard = new ChatterboxAuthenticationGuard({
    allowedOrigins: options.allowedOrigins ?? [],
    authenticate: options.authenticate,
    clock,
    timeoutMs: options.authenticationTimeoutMs ?? 5_000
  })
  const sessions = new ConversationSessionService({
    clock,
    createId: options.createConversationId,
    maxConcurrentTurns: options.maxConcurrentTurns ?? 4,
    maxSessions: options.maxSessions ?? 1_000,
    rateLimitPerMinute: options.rateLimitPerMinute ?? 20,
    sessionTtlMs: options.sessionTtlMs ?? 15 * 60_000
  })
  const observations = new ChatterboxObservationService(
    options.observability ?? new NoopObservability(),
    options.onObservationFailure
  )
  const states = new WeakMap<FastifyRequest, RequestState>()
  const app = Fastify({
    bodyLimit: CONVERSATION_BODY_LIMIT_BYTES,
    genReqId: () => randomUUID(),
    logger: false,
    requestIdHeader: false
  })

  function fail(
    request: FastifyRequest,
    reply: FastifyReply,
    code: ConversationSafeErrorCode,
    requestId = String(request.id),
    status = ErrorStatuses[code]
  ) {
    const state = states.get(request)
    if (state !== undefined) state.observation.outcome = code
    if (code === 'rate_limited') reply.header('retry-after', '60')
    return reply.status(status).send(
      ConversationSafeErrorResponseSchema.parse({
        error: { code, message: ErrorMessages[code], requestId }
      })
    )
  }

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'GET' && ['/health', '/ready'].includes(request.url))
      return
    reply.header('cache-control', 'no-store').header('vary', 'Cookie, Origin')
    // Opaque server correlation joins safe HTTP outcomes to observations;
    // it contains no account identity and never comes from request headers.
    reply.header('x-chatterbox-trace-id', String(request.id))
    const operation =
      request.routeOptions.url === '/v1/conversation/session'
        ? 'session'
        : request.routeOptions.url === '/v1/conversation/turn'
          ? 'turn'
          : request.routeOptions.url === '/v1/realtime/session'
            ? 'realtime'
            : request.routeOptions.url === '/v1/development/memory'
              ? 'memory'
              : 'unknown'
    states.set(request, {
      observation: { operation, outcome: 'internal_error' },
      startedAt: Date.now(),
      traceId: String(request.id)
    })
  })

  app.addHook('onResponse', async (request) => {
    const state = states.get(request)
    if (state === undefined) return
    await observations.emit({
      attributes: {
        ...state.observation,
        latencyMs: Math.max(0, Date.now() - state.startedAt),
        traceId: state.traceId
      },
      name: 'chatterbox.request'
    })
  })

  app.addContentTypeParser(
    'application/sdp',
    { parseAs: 'string' },
    (_request, body, done) => done(null, body)
  )
  app.setErrorHandler((error, request, reply) => {
    const failure = error as {
      readonly code?: string
      readonly statusCode?: number
    }
    return fail(
      request,
      reply,
      failure.code === 'FST_ERR_CTP_BODY_TOO_LARGE'
        ? 'request_too_large'
        : (failure.statusCode ?? 500) < 500
          ? 'invalid_request'
          : 'internal_error'
    )
  })
  app.setNotFoundHandler((request, reply) =>
    fail(request, reply, 'invalid_request', String(request.id), 404)
  )
  app.get('/health', async () => ({ status: 'ok' as const }))
  app.get('/ready', async (_request, reply) => {
    reply.header('cache-control', 'no-store')
    if (options.memoryReadiness === undefined) {
      const disabled = options.createMemoryClient === undefined
      return reply.status(disabled ? 200 : 503).send({
        status: disabled ? 'ready' : 'not-ready',
        memory: disabled ? 'disabled' : 'not-ready'
      })
    }
    let ready = false
    try {
      ready = (await options.memoryReadiness()) === true
    } catch {
      ready = false
    }
    return reply.status(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'not-ready',
      memory: ready ? 'ready' : 'not-ready'
    })
  })

  async function authorize(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const decision = await guard.authorize(
      request.headers.origin,
      request.headers.cookie
    )
    if (decision.status !== 'authenticated') {
      fail(request, reply, decision.status)
      return
    }
    if (!sessions.takeRequest(decision.identity)) {
      fail(request, reply, 'rate_limited')
      return
    }
    const state = states.get(request)
    if (state !== undefined) state.identity = decision.identity
  }

  app.post(
    '/v1/conversation/session',
    { preHandler: authorize },
    async (request, reply) => {
      if (!SessionRequestSchema.safeParse(request.body).success)
        return fail(request, reply, 'invalid_request')
      const state = states.get(request)
      if (state?.identity === undefined)
        return fail(request, reply, 'unauthenticated')
      const session = sessions.create(state.identity)
      if (session === null) return fail(request, reply, 'rate_limited')
      state.observation.outcome = 'success'
      return reply.status(201).send({ data: session })
    }
  )

  app.post(
    '/v1/conversation/turn',
    { preHandler: authorize },
    async (request, reply) => {
      const parsed = ConversationTurnRequestSchema.safeParse(request.body)
      if (!parsed.success) return fail(request, reply, 'invalid_request')
      const state = states.get(request)
      if (state?.identity === undefined)
        return fail(request, reply, 'unauthenticated')
      if (!sessions.owns(parsed.data.conversationId, state.identity))
        return fail(request, reply, 'forbidden', parsed.data.requestId)
      const context: AuthenticatedConversationContext = Object.freeze({
        ...state.identity,
        asOf: clock().toISOString(),
        conversationId: parsed.data.conversationId,
        purpose: 'conversation.support',
        requestId: parsed.data.requestId
      })
      const release = sessions.acquireWork(state.identity)
      if (release === null)
        return fail(request, reply, 'rate_limited', parsed.data.requestId)
      const startedAt = nowMs()
      try {
        const runtime = options.createRuntime?.(context) ?? options.runtime
        if (runtime === undefined)
          return fail(
            request,
            reply,
            'model_unavailable',
            parsed.data.requestId,
            503
          )
        const input: ConversationTurnInput = {
          ...parsed.data,
          asOf: context.asOf,
          purpose: context.purpose
        }
        const result = await runtime.execute(input)
        const data = mapSuccess(result, Math.max(0, nowMs() - startedAt))
        state.observation = {
          inputTokens: result.modelUsage?.inputTokens ?? null,
          memoryFailure: result.memory.failure,
          memoryStatus: result.memory.status,
          operation: 'turn',
          outcome: 'success',
          outputTokens: result.modelUsage?.outputTokens ?? null,
          routingLane: result.routing.lane,
          totalTokens: result.modelUsage?.totalTokens ?? null
        }
        return reply.status(200).send({ data })
      } catch (error) {
        return fail(
          request,
          reply,
          error instanceof ConversationAgentInvocationError
            ? 'model_unavailable'
            : 'internal_error',
          parsed.data.requestId
        )
      } finally {
        release()
      }
    }
  )

  app.post(
    '/v1/realtime/session',
    { preHandler: authorize },
    async (request, reply) => {
      const state = states.get(request)
      if (state?.identity === undefined)
        return fail(request, reply, 'unauthenticated')
      if (
        request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !==
        'application/sdp'
      )
        return fail(request, reply, 'invalid_request')
      const sdp = typeof request.body === 'string' ? request.body : ''
      if (sdp.trim().length === 0)
        return fail(request, reply, 'invalid_request')
      if (options.createRealtimeCall === undefined)
        return fail(
          request,
          reply,
          'model_unavailable',
          String(request.id),
          503
        )
      const release = sessions.acquireWork(state.identity)
      if (release === null) return fail(request, reply, 'rate_limited')
      try {
        const answer = await options.createRealtimeCall(sdp)
        state.observation.outcome = 'success'
        return reply.type('application/sdp').status(200).send(answer)
      } catch {
        return fail(request, reply, 'model_unavailable')
      } finally {
        release()
      }
    }
  )

  if (options.createMemoryClient !== undefined) {
    const createMemoryClient = options.createMemoryClient
    app.post(
      '/v1/development/memory',
      { preHandler: authorize },
      async (request, reply) => {
        const parsed = MemoryRequestSchema.safeParse(request.body)
        if (!parsed.success) return fail(request, reply, 'invalid_request')
        const state = states.get(request)
        if (state?.identity === undefined)
          return fail(request, reply, 'unauthenticated')
        if (!sessions.owns(parsed.data.conversationId, state.identity))
          return fail(request, reply, 'forbidden')
        const release = sessions.acquireWork(state.identity)
        if (release === null) return fail(request, reply, 'rate_limited')
        try {
          const client = createMemoryClient(
            Object.freeze({
              ...state.identity,
              asOf: clock().toISOString(),
              conversationId: parsed.data.conversationId,
              purpose: 'conversation.support',
              requestId: String(request.id)
            })
          )
          const command = parsed.data
          const data =
            command.operation === 'get-consent'
              ? await client.getConsent()
              : command.operation === 'update-consent'
                ? await client.updateConsent(command.input)
                : command.operation === 'remember'
                  ? await client.rememberExplicitly(
                      command.input,
                      command.options
                    )
                  : command.operation === 'search'
                    ? await client.search(command.input)
                    : await client.forget(command.memoryId)
          state.observation.outcome = 'success'
          return reply.send({ data })
        } finally {
          release()
        }
      }
    )
  }

  return app
}
