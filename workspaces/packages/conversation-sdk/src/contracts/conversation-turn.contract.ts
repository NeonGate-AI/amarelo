import { z } from 'zod'

export const MAX_CONVERSATION_HISTORY_MESSAGES = 24
export const MAX_CONVERSATION_MESSAGE_CHARACTERS = 16_000
export const MAX_CONVERSATION_RESPONSE_CHARACTERS = 16_000

const ConversationIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/)

const ConversationTimestampSchema = z.string().datetime({ offset: true })
const NullableTokenCountSchema = z.number().int().nonnegative().nullable()

export const ConversationSdkMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(MAX_CONVERSATION_MESSAGE_CHARACTERS),
    role: z.enum(['assistant', 'user'])
  })
  .strict()
export type ConversationSdkMessage = z.infer<
  typeof ConversationSdkMessageSchema
>

export const ConversationTurnRequestSchema = z
  .object({
    agentId: z.literal('ana'),
    conversationId: ConversationIdentifierSchema,
    history: z
      .array(ConversationSdkMessageSchema)
      .max(MAX_CONVERSATION_HISTORY_MESSAGES)
      .default([]),
    message: z.string().trim().min(1).max(MAX_CONVERSATION_MESSAGE_CHARACTERS),
    requestId: ConversationIdentifierSchema
  })
  .strict()
export type ConversationTurnRequest = z.input<
  typeof ConversationTurnRequestSchema
>
export type ValidatedConversationTurnRequest = z.output<
  typeof ConversationTurnRequestSchema
>

export const ConversationSessionResponseSchema = z
  .object({
    data: z
      .object({
        conversationId: ConversationIdentifierSchema,
        expiresAt: ConversationTimestampSchema
      })
      .strict()
  })
  .strict()
export type ConversationSessionResponseData = z.infer<
  typeof ConversationSessionResponseSchema
>['data']

export const ConversationSdkModelUsageSchema = z
  .object({
    inputTokens: NullableTokenCountSchema,
    modelId: z.string().trim().min(1).max(200),
    outputTokens: NullableTokenCountSchema,
    providerId: z.string().trim().min(1).max(200),
    totalTokens: NullableTokenCountSchema
  })
  .strict()
  .superRefine((usage, context) => {
    if (
      usage.inputTokens !== null &&
      usage.outputTokens !== null &&
      usage.totalTokens !== null &&
      usage.totalTokens !== usage.inputTokens + usage.outputTokens
    ) {
      context.addIssue({
        code: 'custom',
        message: 'totalTokens must equal inputTokens plus outputTokens',
        path: ['totalTokens']
      })
    }
  })
export type ConversationSdkModelUsage = z.infer<
  typeof ConversationSdkModelUsageSchema
>

export const ConversationFirstTokenLatencySchema = z.discriminatedUnion(
  'status',
  [
    z
      .object({
        milliseconds: z.number().nonnegative(),
        status: z.literal('measured')
      })
      .strict(),
    z
      .object({
        status: z.literal('unavailable')
      })
      .strict()
  ]
)
export type ConversationFirstTokenLatency = z.infer<
  typeof ConversationFirstTokenLatencySchema
>

export const ConversationTurnMetricsSchema = z
  .object({
    context: z
      .object({
        budgetExceededByCurrentMessage: z.boolean(),
        budgetTokens: z.number().int().nonnegative(),
        estimatedTokens: z.number().int().nonnegative(),
        estimatorVersion: z.string().trim().min(1).max(100),
        historyMessagesOmitted: z.number().int().nonnegative(),
        historyMessagesUsed: z.number().int().nonnegative()
      })
      .strict(),
    firstTokenLatency: ConversationFirstTokenLatencySchema,
    memoryStatus: z.enum(['retrieved', 'skipped', 'unavailable']),
    modelCalls: z.number().int().positive(),
    modelUsage: ConversationSdkModelUsageSchema.nullable(),
    routingLane: z.enum(['reflex', 'contextual', 'deliberative']),
    totalLatencyMs: z.number().nonnegative()
  })
  .strict()
export type ConversationTurnMetrics = z.infer<
  typeof ConversationTurnMetricsSchema
>

export const ConversationTurnResponseDataSchema = z
  .object({
    agentId: z.literal('ana'),
    conversationId: ConversationIdentifierSchema,
    metrics: ConversationTurnMetricsSchema,
    requestId: ConversationIdentifierSchema,
    response: z.string().trim().min(1).max(MAX_CONVERSATION_RESPONSE_CHARACTERS)
  })
  .strict()
export type ConversationTurnResponseData = z.infer<
  typeof ConversationTurnResponseDataSchema
>

export const ConversationTurnResponseSchema = z
  .object({
    data: ConversationTurnResponseDataSchema
  })
  .strict()

export const ConversationSafeErrorCodeSchema = z.enum([
  'unauthenticated',
  'forbidden',
  'rate_limited',
  'session_unavailable',
  'internal_error',
  'invalid_request',
  'model_unavailable',
  'request_too_large'
])
export type ConversationSafeErrorCode = z.infer<
  typeof ConversationSafeErrorCodeSchema
>

export const ConversationSafeErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: ConversationSafeErrorCodeSchema,
        message: z.string().trim().min(1).max(300),
        requestId: ConversationIdentifierSchema.nullable()
      })
      .strict()
  })
  .strict()
export type ConversationSafeErrorResponse = z.infer<
  typeof ConversationSafeErrorResponseSchema
>
