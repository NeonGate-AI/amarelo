import { z } from 'zod'

import {
  MemoryIdentifierSchema,
  MemoryPurposeSchema,
  MemoryRecordSchema,
  MemoryTemporalPrecisionSchema,
  MemoryTimestampSchema,
  type MemoryProvenance,
  type MemoryRecord,
  type MemoryTemporalPrecision
} from './memory-record.contract.js'

export { MemoryTemporalPrecisionSchema }
export type { MemoryTemporalPrecision }

const NullableUncertaintySchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .nullable()
  .optional()
  .default(null)

const ExplicitMemoryBaseShape = {
  category: MemoryIdentifierSchema,
  purpose: MemoryPurposeSchema,
  statement: z.string().trim().min(1).max(4_000),
  uncertainty: NullableUncertaintySchema
}

const InexactExplicitTemporalPrecisionSchema =
  MemoryTemporalPrecisionSchema.exclude(['exact'])

const ExplicitExactEpisodicMemoryInputSchema = z
  .object({
    ...ExplicitMemoryBaseShape,
    kind: z.literal('episodic'),
    occurredAt: MemoryTimestampSchema,
    semanticKey: z.null().optional().default(null),
    temporalPrecision: z.literal('exact'),
    temporalReference: z.null().optional().default(null),
    validFrom: z.null().optional().default(null)
  })
  .strict()

const ExplicitInexactEpisodicMemoryInputSchema = z
  .object({
    ...ExplicitMemoryBaseShape,
    kind: z.literal('episodic'),
    occurredAt: z.null().optional().default(null),
    semanticKey: z.null().optional().default(null),
    temporalPrecision: InexactExplicitTemporalPrecisionSchema,
    temporalReference: z.string().trim().min(1).max(160),
    validFrom: z.null().optional().default(null)
  })
  .strict()

const ExplicitSemanticMemoryInputSchema = z
  .object({
    ...ExplicitMemoryBaseShape,
    kind: z.literal('semantic'),
    occurredAt: z.null().optional().default(null),
    semanticKey: MemoryIdentifierSchema,
    temporalPrecision: z.null().optional().default(null),
    temporalReference: z.null().optional().default(null),
    validFrom: MemoryTimestampSchema.nullable().optional().default(null)
  })
  .strict()

export const ExplicitMemoryInputSchema = z.union([
  ExplicitExactEpisodicMemoryInputSchema,
  ExplicitInexactEpisodicMemoryInputSchema,
  ExplicitSemanticMemoryInputSchema
])
export type ExplicitMemoryInput = z.input<typeof ExplicitMemoryInputSchema>
export type ValidatedExplicitMemoryInput = z.output<
  typeof ExplicitMemoryInputSchema
>

export const ExplicitMemoryOptionsSchema = z
  .object({
    idempotencyKey: z
      .string()
      .min(8)
      .max(200)
      .regex(/^[A-Za-z0-9._:-]+$/)
      .optional()
  })
  .strict()
export type ExplicitMemoryOptions = z.input<typeof ExplicitMemoryOptionsSchema>

type ExplicitUserProvenance = Omit<
  MemoryProvenance,
  'actorType' | 'sourceType' | 'transformation'
> & {
  readonly actorType: 'user'
  readonly sourceType: 'explicit_user'
  readonly transformation: null
}

type ExplicitMemoryRecord<TMemory extends MemoryRecord> =
  TMemory extends MemoryRecord
    ? Omit<TMemory, 'provenance' | 'state'> & {
        readonly provenance: ExplicitUserProvenance
        readonly state: 'active'
      }
    : never

type NarrowExplicitMemoryResult = ExplicitMemoryRecord<MemoryRecord>

export const ExplicitMemoryResultSchema = MemoryRecordSchema.superRefine(
  (memory, context) => {
    if (memory.state !== 'active') {
      context.addIssue({
        code: 'custom',
        message: 'explicit memory result must be active',
        path: ['state']
      })
    }

    if (
      memory.provenance.actorType !== 'user' ||
      memory.provenance.sourceType !== 'explicit_user' ||
      memory.provenance.transformation !== null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'explicit memory result must preserve user provenance',
        path: ['provenance']
      })
    }
  }
).transform(
  (memory): NarrowExplicitMemoryResult => memory as NarrowExplicitMemoryResult
)
export type ExplicitMemoryResult = z.output<typeof ExplicitMemoryResultSchema>
