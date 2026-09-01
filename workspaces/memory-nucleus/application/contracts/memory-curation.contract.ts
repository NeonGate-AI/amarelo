import { z } from 'zod'

import { MemoryIdentifierSchema, PurposeCodeSchema, type PurposeCode } from '#domain/value-objects/memory-identifiers.value-object'

export { PurposeCodeSchema, type PurposeCode } from '#domain/value-objects/memory-identifiers.value-object'

export const MemoryFormationSignalSchema = z.enum([
  'eligible-source-delta',
  'explicit-memory-request',
  'none'
])
export type MemoryFormationSignal = z.infer<typeof MemoryFormationSignalSchema>

export const MemoryCurationIdentifierSchema = MemoryIdentifierSchema

export interface MemoryAuthorization {
  decisionId: string
}

export const MemoryAuthorizationSchema: z.ZodType<MemoryAuthorization> = z
  .object({
    decisionId: MemoryCurationIdentifierSchema
  })
  .strict()

export const ConversationSpeakerSchema = z.enum(['person', 'elo'])
export type ConversationSpeaker = z.infer<typeof ConversationSpeakerSchema>

export interface ConversationTurn {
  id: string
  observedAt: string
  speaker: ConversationSpeaker
  text: string
}

export const ConversationTurnSchema: z.ZodType<ConversationTurn> = z
  .object({
    id: MemoryCurationIdentifierSchema,
    observedAt: z.string().datetime({ offset: true }),
    speaker: ConversationSpeakerSchema,
    text: z.string().min(1).max(20_000)
  })
  .strict()

export interface MemoryCurationRequest {
  actorId: string
  authorization: MemoryAuthorization
  conversationId: string
  formationSignal: MemoryFormationSignal
  purpose: PurposeCode
  requestId: string
  subjectId: string
  tenantId: string
  turns: ConversationTurn[]
}

export const MemoryCurationRequestSchema: z.ZodType<MemoryCurationRequest> = z
  .object({
    actorId: MemoryCurationIdentifierSchema,
    authorization: MemoryAuthorizationSchema,
    conversationId: MemoryCurationIdentifierSchema,
    formationSignal: MemoryFormationSignalSchema,
    purpose: PurposeCodeSchema,
    requestId: MemoryCurationIdentifierSchema,
    subjectId: MemoryCurationIdentifierSchema,
    tenantId: MemoryCurationIdentifierSchema,
    turns: z.array(ConversationTurnSchema).min(1).max(100)
  })
  .strict()
  .superRefine((request, context) => {
    const turnIds = new Set<string>()

    request.turns.forEach((turn, index) => {
      if (turnIds.has(turn.id)) {
        context.addIssue({
          code: 'custom',
          message: 'Conversation turn IDs must be unique',
          path: ['turns', index, 'id']
        })
      }

      turnIds.add(turn.id)
    })
  })

export interface PreparedConversationTurn {
  id: string
  observedAt: string
  text: string
}

export const PreparedConversationTurnSchema: z.ZodType<PreparedConversationTurn> =
  z
    .object({
      id: MemoryCurationIdentifierSchema,
      observedAt: z.string().datetime({ offset: true }),
      text: z.string().min(1).max(20_000)
    })
    .strict()

export interface PreparedMemorySource {
  characterCount: number
  estimatedInputTokens: number
  inputEstimatorVersion: string
  sourceFingerprint: string
  truncated: boolean
  turns: PreparedConversationTurn[]
}

export const PreparedMemorySourceSchema: z.ZodType<PreparedMemorySource> = z
  .object({
    characterCount: z.number().int().nonnegative(),
    estimatedInputTokens: z.number().int().nonnegative(),
    inputEstimatorVersion: z.string().min(1).max(100),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    truncated: z.boolean(),
    turns: z.array(PreparedConversationTurnSchema).min(1).max(100)
  })
  .strict()

export const MemoryCurationSkipReasonSchema = z.enum([
  'authorization-window-too-short',
  'authorization-expired',
  'authorization-not-permitted',
  'below-minimum-content',
  'extraction-deadline',
  'extraction-failed',
  'input-over-budget',
  'no-formation-signal',
  'no-person-source',
  'source-claim-expired',
  'source-claim-lost',
  'source-claim-window-too-short',
  'source-in-progress'
])
export type MemoryCurationSkipReason = z.infer<
  typeof MemoryCurationSkipReasonSchema
>

export interface MemoryCurationGateDecision {
  eligible: boolean
  reason: MemoryCurationSkipReason | null
}

export const MemoryCurationGateDecisionSchema: z.ZodType<MemoryCurationGateDecision> =
  z
    .object({
      eligible: z.boolean(),
      reason: MemoryCurationSkipReasonSchema.nullable()
    })
    .strict()

export interface MemoryCurationUsage {
  actualInputTokens: number | null
  actualOutputTokens: number | null
  actualTotalTokens: number | null
  candidateCount: number
  estimatedInputTokens: number
  inputEstimatorVersion: string
  modelId: string
  modelCalls: 0 | 1
  providerId: string
  sourceWasTruncated: false
}

export const MemoryCurationUsageSchema: z.ZodType<MemoryCurationUsage> = z
  .object({
    actualInputTokens: z.number().int().nonnegative().nullable(),
    actualOutputTokens: z.number().int().nonnegative().nullable(),
    actualTotalTokens: z.number().int().nonnegative().nullable(),
    candidateCount: z.number().int().min(0).max(5),
    estimatedInputTokens: z.number().int().nonnegative(),
    inputEstimatorVersion: z.string().min(1).max(100),
    modelId: z.string().min(1).max(200),
    modelCalls: z.union([z.literal(0), z.literal(1)]),
    providerId: z.string().min(1).max(200),
    sourceWasTruncated: z.literal(false)
  })
  .strict()
  .superRefine((usage, context) => {
    if (
      usage.actualTotalTokens !== null &&
      usage.actualInputTokens !== null &&
      usage.actualTotalTokens < usage.actualInputTokens
    ) {
      context.addIssue({
        code: 'custom',
        message: 'actualTotalTokens must not be lower than actualInputTokens',
        path: ['actualTotalTokens']
      })
    }

    if (
      usage.actualTotalTokens !== null &&
      usage.actualOutputTokens !== null &&
      usage.actualTotalTokens < usage.actualOutputTokens
    ) {
      context.addIssue({
        code: 'custom',
        message: 'actualTotalTokens must not be lower than actualOutputTokens',
        path: ['actualTotalTokens']
      })
    }

    if (
      usage.actualInputTokens !== null &&
      usage.actualOutputTokens !== null &&
      usage.actualTotalTokens !== null &&
      usage.actualTotalTokens !==
        usage.actualInputTokens + usage.actualOutputTokens
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'actualTotalTokens must equal actualInputTokens + actualOutputTokens',
        path: ['actualTotalTokens']
      })
    }

    if (
      usage.modelCalls === 0 &&
      (usage.actualInputTokens !== null ||
        usage.actualOutputTokens !== null ||
        usage.actualTotalTokens !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Actual token usage requires one extractor invocation',
        path: ['modelCalls']
      })
    }

    if (usage.modelCalls === 0 && usage.candidateCount !== 0) {
      context.addIssue({
        code: 'custom',
        message: 'Candidate usage requires one extractor invocation',
        path: ['candidateCount']
      })
    }
  })

export const MemoryCurationStatusSchema = z.enum([
  'deferred',
  'duplicate',
  'persisted',
  'skipped'
])
export type MemoryCurationStatus = z.infer<typeof MemoryCurationStatusSchema>

const EmptyCandidateIdsSchema = z.array(z.never()).length(0)
const DeferredMemoryCurationResultSchema = z
  .object({
    candidateIds: EmptyCandidateIdsSchema,
    reason: z.enum([
      'authorization-window-too-short',
      'extraction-deadline',
      'extraction-failed',
      'input-over-budget',
      'source-claim-expired',
      'source-claim-lost',
      'source-claim-window-too-short',
      'source-in-progress'
    ]),
    retryAt: z.string().datetime({ offset: true }).nullable(),
    runId: z.null(),
    status: z.literal('deferred'),
    usage: MemoryCurationUsageSchema
  })
  .strict()
  .superRefine((result, context) => {
    const retryMatchesReason =
      result.reason === 'source-in-progress'
        ? result.retryAt !== null
        : result.retryAt === null

    if (!retryMatchesReason) {
      context.addIssue({
        code: 'custom',
        message: 'retryAt must be present only for an in-progress source claim',
        path: ['retryAt']
      })
    }
  })

export const MemoryCurationResultSchema = z.union([
  DeferredMemoryCurationResultSchema,
  z
    .object({
      candidateIds: EmptyCandidateIdsSchema,
      reason: z.null(),
      retryAt: z.null(),
      runId: MemoryCurationIdentifierSchema,
      status: z.literal('duplicate'),
      usage: MemoryCurationUsageSchema
    })
    .strict(),
  z
    .object({
      candidateIds: z.array(MemoryCurationIdentifierSchema).max(5),
      reason: z.null(),
      retryAt: z.null(),
      runId: MemoryCurationIdentifierSchema,
      status: z.literal('persisted'),
      usage: MemoryCurationUsageSchema
    })
    .strict(),
  z
    .object({
      candidateIds: EmptyCandidateIdsSchema,
      reason: z.enum([
        'authorization-expired',
        'authorization-not-permitted',
        'below-minimum-content',
        'no-formation-signal',
        'no-person-source'
      ]),
      retryAt: z.null(),
      runId: z.null(),
      status: z.literal('skipped'),
      usage: MemoryCurationUsageSchema
    })
    .strict()
])
export type MemoryCurationResult = z.infer<typeof MemoryCurationResultSchema>
