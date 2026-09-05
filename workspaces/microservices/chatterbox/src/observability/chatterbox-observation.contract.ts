import { z } from 'zod'

export const ChatterboxObservationSchema = z
  .object({
    attributes: z
      .object({
        inputTokens: z.number().int().nonnegative().nullable().optional(),
        latencyMs: z.number().nonnegative(),
        memoryFailure: z
          .enum([
            'not_configured',
            'dependency_unavailable',
            'contract_violation',
            'unexpected_failure'
          ])
          .nullable()
          .optional(),
        memoryStatus: z
          .enum(['retrieved', 'skipped', 'unavailable'])
          .optional(),
        operation: z.enum(['session', 'turn', 'realtime', 'unknown']),
        outcome: z.enum([
          'success',
          'unauthenticated',
          'forbidden',
          'invalid_request',
          'request_too_large',
          'session_unavailable',
          'rate_limited',
          'model_unavailable',
          'internal_error'
        ]),
        outputTokens: z.number().int().nonnegative().nullable().optional(),
        routingLane: z
          .enum(['reflex', 'contextual', 'deliberative'])
          .optional(),
        totalTokens: z.number().int().nonnegative().nullable().optional(),
        traceId: z.string().uuid()
      })
      .strict(),
    name: z.literal('chatterbox.request')
  })
  .strict()

export type ChatterboxObservation = z.infer<typeof ChatterboxObservationSchema>
