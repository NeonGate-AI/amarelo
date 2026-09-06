import { z } from 'zod'

const Rate = z.number().finite().min(0).max(1).nullable()
const Count = z.number().int().nonnegative().safe().nullable()
const Digest = z.string().regex(/^[a-f0-9]{64}$/)

export const MEMORY_INTEGRITY_STORE_OPERATIONS = [
  'write',
  'retrieve',
  'supersede',
  'suppress',
  'replay',
  'restore',
  'reindex',
  'rebuild'
] as const

export const MEMORY_INTEGRITY_SOURCE_CASES = [
  'assistant-only',
  'assistant-acknowledgment',
  'assistant-repetition',
  'forged-role',
  'delegate',
  'inactivity'
] as const

export const MemoryIntegrityReportSchema = z
  .object({
    schemaVersion: z.literal('memory-integrity-report-v1'),
    reportId: z.string().uuid(),
    evaluatedHead: z.string().regex(/^[a-f0-9]{40}$/),
    fixtureVersion: z.string().min(1).max(200),
    fixtureDigest: Digest,
    partition: z.enum(['development', 'holdout']),
    independentHoldout: z.boolean(),
    sampleSize: z.number().int().nonnegative().safe(),
    corpusSize: z.number().int().positive().safe(),
    poisonFraction: z.number().min(0.01).max(0.02),
    execution: z.enum(['pending', 'observed']),
    validationStatus: z.enum(['pending', 'passed']),
    validationEvidence: z
      .object({
        ciRun: z.string().min(1).nullable(),
        standardsReview: z.string().min(1).nullable(),
        specFidelityReview: z.string().min(1).nullable()
      })
      .strict(),
    metrics: z
      .object({
        poisonAt1: Rate,
        poisonProjectionRate: Rate,
        answerCorruptionRate: Rate,
        utilityRetainedUnderAttack: Rate,
        criticalRecallAtK: Rate,
        abstentionRate: Rate,
        policyIneligiblePoisonProjections: Count,
        policyIneligiblePoisonRankings: Count,
        lifecycleResurrections: Count,
        unauthorizedLeakage: Count,
        consentViolations: Count,
        storeIdentityMismatches: Count,
        normalPathModelCalls: Count,
        unresolvedConflictProjections: Count,
        temporalViolations: Count,
        projectionBudgetViolations: Count,
        correctSourceAbstentionRate: Rate
      })
      .strict(),
    sourceChecks: z.array(
      z
        .object({
          caseId: z.string().min(1).max(100),
          outcome: z.enum([
            'rejected',
            'skipped',
            'unsupported-accepted',
            'unavailable'
          ])
        })
        .strict()
    ),
    store: z
      .object({
        requestedDigest: Digest,
        nonDefault: z.boolean(),
        observations: z.array(
          z
            .object({
              operation: z.enum(MEMORY_INTEGRITY_STORE_OPERATIONS),
              matches: z.boolean()
            })
            .strict()
        )
      })
      .strict(),
    costBrl: z.number().finite().nonnegative().nullable(),
    costEvidenceRef: z.string().min(1).nullable(),
    latencyMs: z.number().finite().nonnegative().nullable(),
    comparison: z
      .object({
        version: z.literal('lexical-ranking-only-v1'),
        rankingOnlyPoisonProjectionRate: Rate,
        trustWeightedPoisonProjectionRate: Rate,
        modelAssisted: z.enum(['not-run', 'observed']),
        modelAssistedCostBrl: z.number().finite().nonnegative().nullable()
      })
      .strict(),
    missingEvidence: z.array(z.string().min(1).max(200))
  })
  .strict()

/** JSON serialization of the allowlisted, content-free artifact only. */
export function serializeMemoryIntegrityReport(
  report: MemoryIntegrityReport
): string {
  return JSON.stringify(MemoryIntegrityReportSchema.parse(report), null, 2)
}

export type MemoryIntegrityReport = z.infer<typeof MemoryIntegrityReportSchema>
export type MemoryIntegrityStoreOperation =
  (typeof MEMORY_INTEGRITY_STORE_OPERATIONS)[number]

export interface MemoryIntegrityGate {
  readonly status: 'pass' | 'hold' | 'fail'
  readonly evaluatedHead: string
  readonly reportIds: readonly string[]
  readonly reasons: readonly string[]
}
