import { z } from 'zod'
import type { MemoryClient, MemorySearchInput } from '@repo/memory-sdk'
import type { ConversationAgentInvocation, ConversationModelUsage } from '../ports'

const Version = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/)
export const MemoryPairVersionsSchema = z.object({
  fixtureVersion: Version,
  timestamp: z.string().datetime({ offset: true }),
  modelId: Version,
  providerId: Version,
  configurationVersion: Version,
  routeVersion: Version,
  instructionVersion: Version,
  evaluatorVersion: Version,
  workloadVersion: Version,
  capabilityProfile: Version,
  durationBasis: Version,
  recentBufferVersion: Version,
  spec009Reference: Version
}).strict()
export type MemoryPairVersions = z.infer<typeof MemoryPairVersionsSchema>

export interface MemoryShadowRequest {
  readonly reportId: string
  readonly audience: 'synthetic' | 'internal'
  readonly memory: MemoryClient
  readonly query: MemorySearchInput
  readonly expectedViewId: string
  readonly versions: MemoryPairVersions
  readonly candidateVersions: MemoryPairVersions
  readonly recentBufferTokens: number
}
export interface MemoryShadowTask extends MemoryShadowRequest {
  readonly invocation: ConversationAgentInvocation
  readonly controlUsage: ConversationModelUsage | null
}
export interface MemoryGateDecision {
  readonly status: 'pass' | 'hold' | 'rollback'
  readonly reasons: readonly string[]
}
/** Redacted metrics only: neither dialogue, Memory content nor full invocation crosses this seam. */
export interface MemoryShadowReport {
  readonly schemaVersion: 'memory-shadow-report-v1'
  readonly specId: 'SPEC-011'
  readonly reportId: string
  readonly versions: MemoryPairVersions
  readonly status: 'observed' | 'unavailable'
  readonly reason: 'projection-only' | 'deadline' | 'dependency-or-contract'
  readonly controlHash: string
  readonly treatmentHash: string | null
  readonly controlComparableTokensEstimated: number
  readonly treatmentComparableTokensEstimated: number | null
  readonly controlTotalInputTokens: number | null
  readonly treatmentTotalInputTokens: null
  readonly retrievalLatencyMs: number | null
  readonly fullTextCalls: number | null
  readonly modelCallsInShadow: 0
  readonly vectorCalls: 0 | null
  readonly webCalls: 0 | null
  readonly costBrl: null
  readonly voiceEvidence: 'not-measured'
  readonly sampleSize: 1
  readonly decision: MemoryGateDecision
}

const NullableRate = z.number().min(0).max(1).nullable()
export const MemoryShadowEvidenceSchema = z.object({
  schemaVersion: z.literal('memory-shadow-evidence-v1'),
  artifactId: Version,
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  versions: MemoryPairVersionsSchema,
  sampleSize: z.number().int().positive(),
  measuredAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  criticalRecall: NullableRate,
  qualityDelta: z.number().finite().nullable(),
  temporalErrors: z.number().int().nonnegative().nullable(),
  unauthorizedLeaks: z.number().int().nonnegative().nullable(),
  consentViolations: z.number().int().nonnegative().nullable(),
  latencyDeltaMs: z.number().finite().nullable(),
  maximumLatencyDeltaMs: z.number().finite().nonnegative()
}).strict()
export type MemoryShadowEvidence = z.infer<typeof MemoryShadowEvidenceSchema>
