import { z } from 'zod'
import type { MemoryClient, MemorySearchInput } from '@repo/memory-sdk'
import {
  MemoryPairVersionsSchema,
  type MemoryPairVersions,
  type MemoryGateDecision
} from '../shadow'

const Identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/)
export const MemoryExperimentPolicySchema = z
  .object({
    enabled: z.boolean().default(false),
    killSwitch: z.boolean().default(true),
    experimentId: Identifier,
    version: Identifier,
    phase: z.enum(['canary', 'ab']),
    assignmentSalt: z.string().min(32).max(256),
    allowlist: z.array(Identifier).max(1_000),
    treatmentPermille: z.number().int().min(0).max(1_000),
    maximumCanarySubjects: z.number().int().min(1).max(1_000),
    recentBufferTokens: z.number().int().min(1).max(600),
    memoryDeadlineMs: z.number().int().min(1).max(5_000),
    minimumSamples: z.number().int().positive(),
    maximumLatencyDeltaMs: z.number().finite().nonnegative(),
    maximumErrorRate: z.number().min(0).max(1),
    maximumCallsPerTurn: z.number().finite().positive(),
    maximumCostBrlPerTurn: z.number().finite().nonnegative()
  })
  .strict()
export type MemoryExperimentPolicy = z.infer<
  typeof MemoryExperimentPolicySchema
>

/** References are accepted only through the injected server-owned artifact verifier. */
export const MemoryExperimentGateReferenceSchema = z
  .object({
    specId: z.enum(['SPEC-011', 'SPEC-043', 'SPEC-017']),
    artifactId: Identifier,
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    versions: MemoryPairVersionsSchema,
    status: z.enum(['pass', 'hold', 'rollback']),
    sampleSize: z.number().int().positive(),
    measuredAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    hiddenIntegrityPassed: z.boolean().optional()
  })
  .strict()
export type MemoryExperimentGateReference = z.infer<
  typeof MemoryExperimentGateReferenceSchema
>
export const MemoryExperimentEvidenceSchema = z
  .object({
    shadow: MemoryExperimentGateReferenceSchema,
    integrity: MemoryExperimentGateReferenceSchema,
    canary: MemoryExperimentGateReferenceSchema.nullable()
  })
  .strict()

const UnknownNonnegative = z.number().finite().nonnegative().nullable()
export const MemoryExperimentMetricsSchema = z
  .object({
    schemaVersion: z.literal('memory-experiment-metrics-v1'),
    artifactId: Identifier,
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    versions: MemoryPairVersionsSchema,
    sampleSize: z.number().int().nonnegative(),
    measuredAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    comparableContextReduction: z.number().finite().nullable(),
    criticalRecall: z.number().min(0).max(1).nullable(),
    qualityDelta: z.number().finite().nullable(),
    temporalErrors: UnknownNonnegative,
    unauthorizedLeaks: UnknownNonnegative,
    consentViolations: UnknownNonnegative,
    policyIneligibleProjections: UnknownNonnegative,
    lifecycleResurrections: UnknownNonnegative,
    memoryRoi: UnknownNonnegative,
    latencyDeltaMs: z.number().finite().nullable(),
    errorRate: z.number().min(0).max(1).nullable(),
    callsPerTurn: UnknownNonnegative,
    costBrlPerTurn: UnknownNonnegative
  })
  .strict()
export type MemoryExperimentMetrics = z.infer<
  typeof MemoryExperimentMetricsSchema
>

export interface MemoryExperimentRequest {
  readonly reportId: string
  readonly subjectKey: string
  readonly audience: 'synthetic' | 'internal' | 'external'
  readonly memory: MemoryClient
  readonly query: MemorySearchInput
  readonly expectedViewId: string
  readonly versions: MemoryPairVersions
}
export interface MemoryExperimentTurnReport {
  readonly schemaVersion: 'memory-experiment-turn-v1'
  readonly specId: 'SPEC-017'
  readonly reportId: string
  readonly experimentId: string | null
  readonly policyVersion: string | null
  readonly versions: MemoryPairVersions
  readonly assignment: 'control' | 'treatment'
  readonly subjectHash: string | null
  readonly decision: MemoryGateDecision
  readonly controlComparableTokensEstimated: number
  readonly treatmentComparableTokensEstimated: number | null
  readonly totalModelInputTokens: number | null
  readonly invocationLatencyMs: number
  readonly agentInvocations: 1
  readonly modelCalls: null
  readonly costBrl: null
  readonly voiceEvidence: 'not-measured'
  readonly outcome: 'returned' | 'failed'
}
