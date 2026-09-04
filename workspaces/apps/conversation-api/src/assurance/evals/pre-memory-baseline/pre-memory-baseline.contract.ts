import { z } from 'zod'

const Sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/u)
const NonNegativeIntegerSchema = z.number().int().nonnegative()

export const PreMemoryBaselineArtifactSchema = z
  .object({
    baselineId: z.literal('spec-009-ana-reflex-v1'),
    correlation: z
      .object({
        conversationIdHash: Sha256Schema,
        requestId: z.string().trim().min(1)
      })
      .strict(),
    economics: z
      .object({
        cost: z
          .object({
            currency: z.literal('USD'),
            inputMicrousd: NonNegativeIntegerSchema,
            outputMicrousd: NonNegativeIntegerSchema,
            status: z.literal('calculated'),
            totalMicrousd: NonNegativeIntegerSchema,
            unit: z.literal('micro-usd')
          })
          .strict(),
        rateSnapshot: z
          .object({
            effectiveAt: z.string().datetime({ offset: true }),
            id: z.literal('synthetic-chat-model-rate-v1'),
            inputMicrousdPerMillionTokens: NonNegativeIntegerSchema,
            modelId: z.literal('synthetic-chat-model'),
            outputMicrousdPerMillionTokens: NonNegativeIntegerSchema,
            providerId: z.literal('synthetic-provider')
          })
          .strict()
      })
      .strict(),
    fixture: z
      .object({
        id: z.literal('ana-reflex-synthetic-v1'),
        requestHash: Sha256Schema,
        responseHash: Sha256Schema,
        version: z.literal('1')
      })
      .strict(),
    generatedAt: z.string().datetime({ offset: true }),
    quality: z
      .object({
        checks: z
          .object({
            noClinicalClaim: z.boolean(),
            nonEmpty: z.boolean(),
            supportiveBoundary: z.boolean()
          })
          .strict(),
        evaluatorVersion: z.literal('ana-support-deterministic-v1'),
        result: z.enum(['fail', 'pass'])
      })
      .strict(),
    runtime: z
      .object({
        agentId: z.literal('ana'),
        instructionVersion: z.literal('ana-support-v1'),
        memoryStatus: z.literal('skipped'),
        modelId: z.literal('synthetic-chat-model'),
        providerId: z.literal('synthetic-provider'),
        routingLane: z.literal('reflex'),
        routingPolicyVersion: z.literal('conversation-routing-deterministic-v1')
      })
      .strict(),
    schemaVersion: z.literal('spec-009-pre-memory-baseline-v1'),
    usage: z
      .object({
        estimated: z
          .object({
            contextTokens: NonNegativeIntegerSchema,
            estimatorVersion: z.literal(
              'conversation-history-codepoint-quarter-v1'
            )
          })
          .strict(),
        firstTokenLatency: z
          .object({ status: z.literal('unavailable') })
          .strict(),
        modelCalls: z.literal(1),
        providerReported: z
          .object({
            inputTokens: NonNegativeIntegerSchema,
            outputTokens: NonNegativeIntegerSchema,
            status: z.literal('available'),
            totalTokens: NonNegativeIntegerSchema
          })
          .strict(),
        totalLatencyMs: z.number().nonnegative()
      })
      .strict()
  })
  .strict()

export type PreMemoryBaselineArtifact = z.infer<
  typeof PreMemoryBaselineArtifactSchema
>
