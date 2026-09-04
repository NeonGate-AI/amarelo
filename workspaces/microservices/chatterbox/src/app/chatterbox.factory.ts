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
  type ConversationSafeErrorResponse,
  type ConversationTurnResponseData
} from '@repo/conversation-sdk'
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyRequest
} from 'fastify'

const CONVERSATION_BODY_LIMIT_BYTES = 512 * 1024

export interface ChatterboxFactoryOptions {
  readonly createRealtimeCall?: (sdp: string) => Promise<string>
  readonly logger?: boolean
  readonly nowMs?: () => number
  readonly runtime?: Pick<ConversationRuntime, 'execute'>
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
  message: string,
  correlationId: string = requestCorrelationId(request)
) {
  request.log.error(
    {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      requestId: correlationId
    },
    'conversation request failed'
  )
  return {
    payload: safeError(code, message, correlationId),
    statusCode
  }
}

export function createChatterbox(
  options: ChatterboxFactoryOptions
): FastifyInstance {
  const nowMs = options.nowMs ?? Date.now
  const app = Fastify({
    bodyLimit: CONVERSATION_BODY_LIMIT_BYTES,
    logger: options.logger ?? false
  })

  app.addContentTypeParser(
    'application/sdp',
    { parseAs: 'string' },
    (_request, body, done) => done(null, body)
  )

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply
        .status(413)
        .send(
          safeError(
            'request_too_large',
            'A solicitação da conversa excedeu o limite permitido.',
            requestCorrelationId(request)
          )
        )
    }

    if ((error.statusCode ?? 500) < 500) {
      return reply
        .status(400)
        .send(
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
    reply
      .status(404)
      .send(
        safeError(
          'invalid_request',
          'O recurso de conversa solicitado não existe.',
          requestCorrelationId(request)
        )
      )
  )

  app.get('/health', async () => ({ status: 'ok' as const }))

  app.post('/v1/realtime/session', async (request, reply) => {
    const sdp = typeof request.body === 'string' ? request.body : ''
    if (sdp.trim().length === 0) {
      return reply
        .status(400)
        .send(
          safeError(
            'invalid_request',
            'A oferta WebRTC não é válida.',
            requestCorrelationId(request)
          )
        )
    }

    if (options.createRealtimeCall === undefined) {
      return reply
        .status(503)
        .send(
          safeError(
            'model_unavailable',
            'A conversa por voz não está disponível.',
            requestCorrelationId(request)
          )
        )
    }

    try {
      const answerSdp = await options.createRealtimeCall(sdp)
      return reply.type('application/sdp').status(200).send(answerSdp)
    } catch (error) {
      const mapped = sendUnexpectedError(
        error,
        request,
        502,
        'model_unavailable',
        'Não foi possível iniciar a conversa por voz.'
      )
      return reply.status(mapped.statusCode).send(mapped.payload)
    }
  })

  app.post('/v1/conversation/turn', async (request, reply) => {
    const parsed = ConversationTurnRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply
        .status(400)
        .send(
          safeError(
            'invalid_request',
            'Os dados da conversa não são válidos.',
            requestCorrelationId(request)
          )
        )
    }

    const input: ConversationTurnInput = parsed.data
    if (options.runtime === undefined) {
      return reply
        .status(503)
        .send(
          safeError(
            'model_unavailable',
            'A conversa ainda não está configurada.',
            input.requestId
          )
        )
    }
    const startedAt = nowMs()

    try {
      const result = await options.runtime.execute(input)
      const totalLatencyMs = Math.max(0, nowMs() - startedAt)
      return reply
        .status(200)
        .send({ data: mapSuccess(result, totalLatencyMs) })
    } catch (error) {
      const isModelFailure = error instanceof ConversationAgentInvocationError
      const mapped = sendUnexpectedError(
        error,
        request,
        isModelFailure ? 502 : 500,
        isModelFailure ? 'model_unavailable' : 'internal_error',
        isModelFailure
          ? 'A Ana não conseguiu responder agora.'
          : 'Não foi possível concluir a conversa.',
        input.requestId
      )
      return reply.status(mapped.statusCode).send(mapped.payload)
    }
  })

  return app
}
