import { z } from 'zod'
import {
  MemoryUsageIdentifierSchema,
  MemoryUsageLedgerEntrySchema
} from '@application/contracts'

const Id = MemoryUsageIdentifierSchema
const Amount = z.number().finite().nonnegative()
const Count = Amount.int().safe()
const Rate = z.number().finite().min(0).max(1)
const Basis = z.enum(['patient-speech', 'patient-and-assistant-speech', 'session-elapsed'])
export const MEMORY_COST_COMPONENTS = ['llm', 'speech', 'memory', 'infrastructure'] as const
const Component = z.enum(MEMORY_COST_COMPONENTS)
const Coverage = z.enum(['complete', 'partial', 'not-measured'])

/** References are redacted attestations from upstream gates, not fabricated execution evidence. */
const GateReference = z.strictObject({
  specId: z.enum(['SPEC-011', 'SPEC-017', 'SPEC-043', 'SPEC-012']),
  artifactId: Id,
  schemaVersion: Id,
  version: Id,
  fixtureVersion: Id,
  workloadVersion: Id,
  profileVersion: Id,
  evaluatedHead: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  digest: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  sampleSize: Count.nullable(),
  status: z.enum(['pass', 'hold', 'rollback'])
})

const Metrics = z.strictObject({
  contextReduction: Rate.nullable(),
  criticalRecallAtK: Rate.nullable(),
  strongModelEscalationRate: Rate.nullable(),
  qualityDelta: z.number().finite().nullable(),
  irrelevantRate: Rate.nullable(),
  temporalErrors: Count.nullable(),
  leakage: Count.nullable(),
  consentViolations: Count.nullable(),
  policyIneligiblePoisonProjections: Count.nullable(),
  lifecycleResurrections: Count.nullable(),
  poisonAt1: Rate.nullable(),
  poisonProjectionRate: Rate.nullable(),
  answerCorruptionRate: Rate.nullable(),
  utilityRetainedUnderAttack: Rate.nullable(),
  abstentionRate: Rate.nullable(),
  latencyP95Milliseconds: Amount.nullable(),
  queueBacklog: Count.nullable(),
  queueOldestMilliseconds: Amount.nullable(),
  retryRate: Rate.nullable(),
  failureRate: Rate.nullable(),
  modelMitigationInputTokens: Count.nullable(),
  modelMitigationOutputTokens: Count.nullable(),
  modelMitigationLatencyMilliseconds: Amount.nullable()
})

export const MemoryEconomicsReportInputSchema = z.strictObject({
  schemaVersion: z.literal('memory-economics-report-input-v1'),
  reportId: Id,
  generatedAt: z.iso.datetime(),
  evaluatedHead: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  cohort: z.strictObject({
    cohortId: Id,
    tenantId: Id,
    subjectIds: z.array(Id).min(1),
    activeFamilies: Count.positive()
  }),
  window: z.strictObject({ from: z.iso.datetime(), to: z.iso.datetime() }),
  scenario: z.strictObject({
    version: Id,
    kind: z.enum(['free-investor', 'internal-memory-enabled', 'paid-research']),
    backgroundFormation: z.boolean(),
    revenueAuthorized: z.boolean(),
    monthlyPriceBrl: Amount.nullable(),
    evidenceMode: z.enum(['observed', 'normalized', 'simulated']),
    scaleScope: z.enum(['text-memory', 'voice-exposure']),
    exclusions: z.array(Id)
  }),
  workload: z.strictObject({
    version: Id,
    profileVersion: Id,
    weeklyMinutes: z.literal(60),
    durationBasis: Basis.nullable(),
    durationAccountingVersion: Id,
    durationEntryIds: z.array(Id),
    durationCoverage: Coverage,
    distribution: z.strictObject({
      version: Id,
      sessions: Count.nullable(),
      turns: Count.nullable(),
      sessionP50Milliseconds: Amount.nullable(),
      sessionP95Milliseconds: Amount.nullable(),
      inputAudioFraction: Rate.nullable(),
      outputAudioFraction: Rate.nullable(),
      formationHorizonDays: Amount.nullable(),
      reuseHorizonDays: Amount.nullable()
    }),
    simulation: z.strictObject({
      version: Id,
      sourceMinutesPerFamily: Amount.positive(),
      assumptionCodes: z.array(Id).min(1)
    }).nullable()
  }),
  voiceEvidence: z.strictObject({
    version: Id.nullable(),
    authorizedBridge: z.boolean(),
    patientAudioMeasured: z.boolean(),
    assistantAudioMeasured: z.boolean(),
    interruptionsAccounted: z.boolean(),
    cancellationResidueAccounted: z.boolean(),
    lifecycleSpec034Complete: z.boolean(),
    experienceMeasured: z.boolean()
  }),
  allocationVersion: Id,
  componentCoverage: z.strictObject({ llm: Coverage, speech: Coverage, memory: Coverage, infrastructure: Coverage }),
  ledger: z.array(MemoryUsageLedgerEntrySchema).max(100_000),
  allocations: z.array(z.strictObject({
    ledgerEntryId: Id,
    component: Component,
    fraction: Rate.positive(),
    memoryProcessing: z.boolean(),
    mitigation: z.enum(['none', 'deterministic', 'model-assisted'])
  })),
  comparison: z.strictObject({
    schemaVersion: z.literal('memory-cost-comparison-v1'),
    artifactId: Id,
    pairingVersion: Id,
    fixtureVersion: Id,
    configurationVersion: Id,
    sampleSize: Count.positive(),
    measuredPaired: z.boolean(),
    controlEntryIds: z.array(Id).min(1),
    treatmentEntryIds: z.array(Id).min(1)
  }).nullable(),
  gates: z.array(GateReference).max(4),
  metrics: Metrics,
  thresholds: z.strictObject({
    version: Id,
    minimumContextReduction: Rate.min(0.5),
    minimumCriticalRecall: Rate.min(0.9),
    maximumEscalationRate: Rate.max(0.05),
    minimumMemoryRoi: Amount.min(3),
    targetMemoryRoi: Amount.min(5),
    maximumIrrelevantRate: Rate.nullable(),
    maximumTemporalErrors: Count.nullable(),
    maximumLatencyP95Milliseconds: Amount.nullable(),
    maximumQueueBacklog: Count.nullable(),
    maximumQueueOldestMilliseconds: Amount.nullable(),
    maximumRetryRate: Rate.nullable(),
    maximumFailureRate: Rate.nullable()
  }),
  uncertainty: z.strictObject({
    sampleSize: Count.nullable(),
    methodVersion: Id.nullable(),
    monthlyCostLowerBrl: Amount.nullable(),
    monthlyCostUpperBrl: Amount.nullable()
  })
})

export type MemoryEconomicsReportInput = z.infer<typeof MemoryEconomicsReportInputSchema>
