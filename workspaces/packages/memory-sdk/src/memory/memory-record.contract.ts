import { z } from 'zod'

const MAX_SAFE_VERSION = Number.MAX_SAFE_INTEGER

export const MemoryIdentifierSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/)
export const MemoryPurposeSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._:-]{0,79}$/)
export const MemoryTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .refine((timestamp) => {
    const fractionalSeconds = timestamp.match(
      /\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/
    )?.[1]

    return fractionalSeconds === undefined || fractionalSeconds.length <= 3
  }, 'timestamps must not exceed millisecond precision')

export function memoryTimestampsRepresentSameInstant(
  left: string | null,
  right: string | null
): boolean {
  if (left === null || right === null) {
    return left === right
  }

  return Date.parse(left) === Date.parse(right)
}

export const MemoryKindSchema = z.enum(['episodic', 'semantic'])
export type MemoryKind = z.infer<typeof MemoryKindSchema>

export const MemoryTemporalPrecisionSchema = z.enum([
  'approximate',
  'day',
  'exact',
  'life-period',
  'month',
  'year'
])
export type MemoryTemporalPrecision = z.infer<
  typeof MemoryTemporalPrecisionSchema
>

export const MemoryStateSchema = z.enum([
  'active',
  'expired',
  'superseded',
  'tombstoned'
])
export type MemoryState = z.infer<typeof MemoryStateSchema>

export const MemorySourceTypeSchema = z.enum([
  'admin',
  'conversation',
  'derived',
  'explicit_user',
  'import',
  'tool_result'
])
export type MemorySourceType = z.infer<typeof MemorySourceTypeSchema>

export const MemoryActorTypeSchema = z.enum([
  'admin',
  'agent',
  'service',
  'user'
])
export type MemoryActorType = z.infer<typeof MemoryActorTypeSchema>

const ScopedPurposeIdsSchema = z.tuple([MemoryPurposeSchema])

export const MemoryTransformationSchema = z
  .object({
    id: MemoryIdentifierSchema,
    model: z.string().trim().min(1).max(200).optional(),
    policyVersion: MemoryIdentifierSchema,
    promptVersion: MemoryIdentifierSchema.optional()
  })
  .strict()
export type MemoryTransformation = z.infer<typeof MemoryTransformationSchema>

export const MemoryProvenanceSchema = z
  .object({
    actorType: MemoryActorTypeSchema,
    authorId: MemoryIdentifierSchema,
    observedAt: MemoryTimestampSchema,
    sourceArtifactIds: z
      .array(MemoryIdentifierSchema)
      .min(1)
      .max(32)
      .superRefine((sourceArtifactIds, context) => {
        if (new Set(sourceArtifactIds).size !== sourceArtifactIds.length) {
          context.addIssue({
            code: 'custom',
            message: 'sourceArtifactIds must not contain duplicates'
          })
        }
      }),
    sourceType: MemorySourceTypeSchema,
    transformation: MemoryTransformationSchema.nullable()
  })
  .strict()
export type MemoryProvenance = z.infer<typeof MemoryProvenanceSchema>

const MemoryRecordBaseSchema = z
  .object({
    category: MemoryIdentifierSchema,
    confidence: z.number().min(0).max(1),
    createdAt: MemoryTimestampSchema,
    id: MemoryIdentifierSchema,
    observedAt: MemoryTimestampSchema,
    provenance: MemoryProvenanceSchema,
    purposeIds: ScopedPurposeIdsSchema,
    state: MemoryStateSchema,
    statement: z.string().trim().min(1).max(4_000),
    uncertainty: z.string().trim().min(1).max(500).nullable(),
    updatedAt: MemoryTimestampSchema,
    version: z.number().int().positive().max(MAX_SAFE_VERSION)
  })
  .strict()

const InexactMemoryTemporalPrecisionSchema =
  MemoryTemporalPrecisionSchema.exclude(['exact'])

const ExactEpisodicMemoryRecordSchema = MemoryRecordBaseSchema.extend({
  kind: z.literal('episodic'),
  occurredAt: MemoryTimestampSchema,
  semanticKey: z.null(),
  temporalPrecision: z.literal('exact'),
  temporalReference: z.null(),
  validFrom: z.null(),
  validUntil: z.null()
})

const InexactEpisodicMemoryRecordSchema = MemoryRecordBaseSchema.extend({
  kind: z.literal('episodic'),
  occurredAt: z.null(),
  semanticKey: z.null(),
  temporalPrecision: InexactMemoryTemporalPrecisionSchema,
  temporalReference: z.string().trim().min(1).max(160),
  validFrom: z.null(),
  validUntil: z.null()
})

const SemanticMemoryRecordSchema = MemoryRecordBaseSchema.extend({
  kind: z.literal('semantic'),
  occurredAt: z.null(),
  semanticKey: MemoryIdentifierSchema,
  temporalPrecision: z.null(),
  temporalReference: z.null(),
  validFrom: MemoryTimestampSchema.nullable(),
  validUntil: MemoryTimestampSchema.nullable()
})

export const MemoryRecordSchema = z
  .union([
    ExactEpisodicMemoryRecordSchema,
    InexactEpisodicMemoryRecordSchema,
    SemanticMemoryRecordSchema
  ])
  .superRefine((memory, context) => {
    if (Date.parse(memory.observedAt) > Date.parse(memory.createdAt)) {
      context.addIssue({
        code: 'custom',
        message: 'createdAt must not precede observedAt',
        path: ['createdAt']
      })
    }

    if (Date.parse(memory.createdAt) > Date.parse(memory.updatedAt)) {
      context.addIssue({
        code: 'custom',
        message: 'updatedAt must not precede createdAt',
        path: ['updatedAt']
      })
    }

    if (
      !memoryTimestampsRepresentSameInstant(
        memory.provenance.observedAt,
        memory.observedAt
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'provenance observedAt must match memory observedAt',
        path: ['provenance', 'observedAt']
      })
    }

    if (
      memory.kind === 'semantic' &&
      memory.validFrom !== null &&
      memory.validUntil !== null &&
      Date.parse(memory.validFrom) >= Date.parse(memory.validUntil)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'validUntil must be later than validFrom',
        path: ['validUntil']
      })
    }
  })
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>
