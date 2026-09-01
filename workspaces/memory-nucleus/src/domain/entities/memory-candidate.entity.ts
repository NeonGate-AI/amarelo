import { z } from 'zod'

import {
  MemoryIdentifierSchema,
  PurposeCodeSchema,
  type PurposeCode
} from '#domain/value-objects/memory-identifiers.value-object'

export const MemoryKindSchema = z.enum(['episodic', 'semantic'])
export type MemoryKind = z.infer<typeof MemoryKindSchema>

export const MEMORY_CANDIDATE_SCHEMA_VERSION = 'memory-candidate-schema-v1'

export const MemoryConfidenceSchema = z.enum(['low', 'medium', 'high'])
export type MemoryConfidence = z.infer<typeof MemoryConfidenceSchema>

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

interface MemoryCandidateContent {
  confidence: MemoryConfidence
  kind: MemoryKind
  occurredAt: string | null
  statement: string
  tags: string[]
  temporalPrecision: MemoryTemporalPrecision | null
  temporalReference: string | null
  uncertainty: string | null
  validFrom: string | null
}

const MemoryCandidateContentShape = {
  confidence: MemoryConfidenceSchema,
  kind: MemoryKindSchema,
  occurredAt: z.string().datetime({ offset: true }).nullable(),
  statement: z.string().trim().min(1).max(320),
  tags: z.array(z.string().trim().min(1).max(40)).max(5),
  temporalPrecision: MemoryTemporalPrecisionSchema.nullable(),
  temporalReference: z.string().trim().min(1).max(160).nullable(),
  uncertainty: z.string().trim().min(1).max(160).nullable(),
  validFrom: z.string().datetime({ offset: true }).nullable()
}

const validateMemoryCandidateContent = (
  candidate: MemoryCandidateContent,
  context: z.RefinementCtx
) => {
  if (candidate.kind === 'episodic') {
    if (candidate.occurredAt === null && candidate.temporalReference === null) {
      context.addIssue({
        code: 'custom',
        message: 'Episodic candidates require occurredAt or temporalReference',
        path: ['temporalReference']
      })
    }

    if (candidate.temporalPrecision === null) {
      context.addIssue({
        code: 'custom',
        message: 'Episodic candidates require temporalPrecision',
        path: ['temporalPrecision']
      })
    }

    if (candidate.occurredAt !== null && candidate.temporalReference !== null) {
      context.addIssue({
        code: 'custom',
        message:
          'Episodic candidates must not combine occurredAt and temporalReference',
        path: ['temporalReference']
      })
    }

    if (
      candidate.temporalPrecision === 'exact' &&
      candidate.occurredAt === null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Exact episodic candidates require occurredAt',
        path: ['occurredAt']
      })
    }

    if (
      candidate.temporalPrecision !== null &&
      candidate.temporalPrecision !== 'exact' &&
      candidate.temporalReference === null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Inexact episodic candidates require a temporalReference',
        path: ['temporalReference']
      })
    }

    if (
      candidate.temporalPrecision !== null &&
      candidate.temporalPrecision !== 'exact' &&
      candidate.occurredAt !== null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Inexact episodic candidates must not use occurredAt',
        path: ['occurredAt']
      })
    }

    if (candidate.validFrom !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Episodic candidates must not use validFrom',
        path: ['validFrom']
      })
    }
  }

  if (candidate.kind === 'semantic') {
    if (candidate.occurredAt !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic candidates must not use occurredAt',
        path: ['occurredAt']
      })
    }

    if (
      candidate.temporalPrecision !== null ||
      candidate.temporalReference !== null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic candidates must not use episodic temporal fields',
        path: ['temporalReference']
      })
    }
  }
}

export interface ExtractedMemoryCandidate extends MemoryCandidateContent {
  sourceTurnIds: string[]
}

export const ExtractedMemoryCandidateSchema: z.ZodType<ExtractedMemoryCandidate> =
  z
    .object({
      ...MemoryCandidateContentShape,
      sourceTurnIds: z.array(MemoryIdentifierSchema).min(1).max(3)
    })
    .strict()
    .superRefine(validateMemoryCandidateContent)

export interface MemoryCandidateProvenance {
  conversationId: string
  sourceFingerprint: string
  sourceTurnIds: string[]
}

export const MemoryCandidateProvenanceSchema: z.ZodType<MemoryCandidateProvenance> =
  z
    .object({
      conversationId: MemoryIdentifierSchema,
      sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
      sourceTurnIds: z.array(MemoryIdentifierSchema).min(1).max(3)
    })
    .strict()

export interface MemoryCandidate extends MemoryCandidateContent {
  actorId: string
  authorizationDecisionId: string
  candidateFingerprint: string
  createdAt: string
  provenance: MemoryCandidateProvenance
  purpose: PurposeCode
  sensitivity: 'restricted'
  status: 'candidate'
  subjectId: string
  tenantId: string
}

export const MemoryCandidateSchema: z.ZodType<MemoryCandidate> = z
  .object({
    ...MemoryCandidateContentShape,
    actorId: MemoryIdentifierSchema,
    authorizationDecisionId: MemoryIdentifierSchema,
    candidateFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.string().datetime({ offset: true }),
    provenance: MemoryCandidateProvenanceSchema,
    purpose: PurposeCodeSchema,
    sensitivity: z.literal('restricted'),
    status: z.literal('candidate'),
    subjectId: MemoryIdentifierSchema,
    tenantId: MemoryIdentifierSchema
  })
  .strict()
  .superRefine(validateMemoryCandidateContent)

/** Candidate entity: semantic inference may propose it, but it has no authority to activate itself. */
export class MemoryCandidateEntity {
  readonly #snapshot: MemoryCandidate

  private constructor(snapshot: MemoryCandidate) {
    this.#snapshot = Object.freeze({ ...snapshot })
  }

  static from(snapshot: MemoryCandidate): MemoryCandidateEntity {
    return new MemoryCandidateEntity(MemoryCandidateSchema.parse(snapshot))
  }

  get snapshot(): MemoryCandidate {
    return this.#snapshot
  }
  get kind(): MemoryKind {
    return this.#snapshot.kind
  }
  get isCanonical(): false {
    return false
  }
}
