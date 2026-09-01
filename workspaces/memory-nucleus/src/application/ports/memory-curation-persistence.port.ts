import { z } from 'zod'

import {
  MemoryCandidateSchema,
  type MemoryCandidate
} from '@domain/entities/memory-candidate.entity'
import { createCurationIdempotencyKey } from '@application/use-cases/memory-curation.fingerprint'
import {
  MemoryCurationUsageSchema,
  type MemoryCurationUsage,
  MemoryCurationIdentifierSchema,
  PurposeCodeSchema,
  type PurposeCode
} from '@application/contracts/memory-curation.contract'

export interface SourceClaimRequest {
  actorId: string
  authorizationDecisionId: string
  conversationId: string
  extractorVersion: string
  idempotencyKey: string
  modelId: string
  policyVersion: string
  promptVersion: string
  providerId: string
  purpose: PurposeCode
  requestId: string
  schemaVersion: string
  sourceFingerprint: string
  subjectId: string
  tenantId: string
}

const hasCanonicalIdempotencyKey = (input: {
  extractorVersion: string
  idempotencyKey: string
  modelId: string
  policyVersion: string
  promptVersion: string
  providerId: string
  schemaVersion: string
  sourceFingerprint: string
  subjectId: string
  tenantId: string
}): boolean =>
  input.idempotencyKey ===
  createCurationIdempotencyKey({
    extractorVersion: input.extractorVersion,
    modelId: input.modelId,
    policyVersion: input.policyVersion,
    promptVersion: input.promptVersion,
    providerId: input.providerId,
    schemaVersion: input.schemaVersion,
    sourceFingerprint: input.sourceFingerprint,
    subjectId: input.subjectId,
    tenantId: input.tenantId
  })

const requireCanonicalIdempotencyKey = (
  input: Parameters<typeof hasCanonicalIdempotencyKey>[0],
  context: z.RefinementCtx
): void => {
  if (!hasCanonicalIdempotencyKey(input)) {
    context.addIssue({
      code: 'custom',
      message: 'Idempotency key does not match the canonical run binding',
      path: ['idempotencyKey']
    })
  }
}

export const SourceClaimRequestSchema: z.ZodType<SourceClaimRequest> = z
  .object({
    actorId: MemoryCurationIdentifierSchema,
    authorizationDecisionId: MemoryCurationIdentifierSchema,
    conversationId: MemoryCurationIdentifierSchema,
    extractorVersion: z.string().min(1).max(100),
    idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
    modelId: z.string().trim().min(1).max(200),
    policyVersion: z.string().min(1).max(100),
    promptVersion: z.string().trim().min(1).max(100),
    providerId: z.string().trim().min(1).max(200),
    purpose: PurposeCodeSchema,
    requestId: MemoryCurationIdentifierSchema,
    schemaVersion: z.string().trim().min(1).max(100),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    subjectId: MemoryCurationIdentifierSchema,
    tenantId: MemoryCurationIdentifierSchema
  })
  .strict()
  .superRefine(requireCanonicalIdempotencyKey)

export const SourceClaimStatusSchema = z.enum([
  'claimed',
  'duplicate',
  'in-progress'
])
export type SourceClaimStatus = z.infer<typeof SourceClaimStatusSchema>

export const SourceClaimResultSchema = z.discriminatedUnion('status', [
  z
    .object({
      claimExpiresAt: z.string().datetime({ offset: true }),
      claimId: MemoryCurationIdentifierSchema,
      runId: z.null(),
      status: z.literal('claimed')
    })
    .strict(),
  z
    .object({
      claimExpiresAt: z.null(),
      claimId: z.null(),
      runId: MemoryCurationIdentifierSchema,
      status: z.literal('duplicate')
    })
    .strict(),
  z
    .object({
      claimExpiresAt: z.string().datetime({ offset: true }),
      claimId: z.null(),
      runId: z.null(),
      status: z.literal('in-progress')
    })
    .strict()
])
export type SourceClaimResult = z.infer<typeof SourceClaimResultSchema>

export interface SaveCurationRunRequest {
  actorId: string
  authorizationDecisionId: string
  candidates: MemoryCandidate[]
  claimId: string
  conversationId: string
  extractorVersion: string
  idempotencyKey: string
  modelId: string
  policyVersion: string
  promptVersion: string
  providerId: string
  purpose: PurposeCode
  requestId: string
  schemaVersion: string
  sourceFingerprint: string
  subjectId: string
  tenantId: string
  usage: MemoryCurationUsage
}

export const SaveCurationRunRequestSchema: z.ZodType<SaveCurationRunRequest> = z
  .object({
    actorId: MemoryCurationIdentifierSchema,
    authorizationDecisionId: MemoryCurationIdentifierSchema,
    candidates: z.array(MemoryCandidateSchema).max(5),
    claimId: MemoryCurationIdentifierSchema,
    conversationId: MemoryCurationIdentifierSchema,
    extractorVersion: z.string().min(1).max(100),
    idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
    modelId: z.string().trim().min(1).max(200),
    policyVersion: z.string().min(1).max(100),
    promptVersion: z.string().trim().min(1).max(100),
    providerId: z.string().trim().min(1).max(200),
    purpose: PurposeCodeSchema,
    requestId: MemoryCurationIdentifierSchema,
    schemaVersion: z.string().trim().min(1).max(100),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    subjectId: MemoryCurationIdentifierSchema,
    tenantId: MemoryCurationIdentifierSchema,
    usage: MemoryCurationUsageSchema
  })
  .strict()
  .superRefine((run, context) => {
    requireCanonicalIdempotencyKey(run, context)

    if (run.usage.candidateCount !== run.candidates.length) {
      context.addIssue({
        code: 'custom',
        message: 'Usage candidateCount must match persisted candidates',
        path: ['usage', 'candidateCount']
      })
    }

    run.candidates.forEach((candidate, index) => {
      const isBoundToRun =
        candidate.actorId === run.actorId &&
        candidate.authorizationDecisionId === run.authorizationDecisionId &&
        candidate.provenance.conversationId === run.conversationId &&
        candidate.provenance.sourceFingerprint === run.sourceFingerprint &&
        candidate.purpose === run.purpose &&
        candidate.subjectId === run.subjectId &&
        candidate.tenantId === run.tenantId

      if (!isBoundToRun) {
        context.addIssue({
          code: 'custom',
          message: 'Candidate scope and provenance must match the curation run',
          path: ['candidates', index]
        })
      }
    })
  })

export const SaveCurationRunResultSchema = z
  .discriminatedUnion('status', [
    z
      .object({
        candidateIds: z.array(MemoryCurationIdentifierSchema).max(5),
        runId: MemoryCurationIdentifierSchema,
        status: z.literal('completed')
      })
      .strict(),
    z
      .object({
        candidateIds: z.array(z.never()).length(0),
        runId: z.null(),
        status: z.literal('claim-lost')
      })
      .strict()
  ])
  .superRefine((result, context) => {
    if (
      result.status === 'completed' &&
      new Set(result.candidateIds).size !== result.candidateIds.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Completed candidate IDs must be unique',
        path: ['candidateIds']
      })
    }
  })
export type SaveCurationRunResult = z.infer<typeof SaveCurationRunResultSchema>

export abstract class MemoryPersistenceClient {
  /**
   * Claims the scoped idempotency key before any model call. The backing
   * adapter must allow at most one active claim for that key in this MVP.
   * A duplicate result is valid only when the completed run matches the
   * canonical tenant, subject, purpose, source, policy, and extractor binding;
   * a key collision with different canonical bindings must fail closed.
   */
  abstract claimSource(input: SourceClaimRequest): Promise<SourceClaimResult>
  /**
   * The adapter must require the current unexpired claim and revalidate
   * authorization plus every run/candidate scope in one transaction.
   */
  abstract saveCurationRun(
    input: SaveCurationRunRequest
  ): Promise<SaveCurationRunResult>
}
