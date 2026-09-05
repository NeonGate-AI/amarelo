import { MemoryPairVersionsSchema, type MemoryPairVersions, type MemoryGateDecision } from '../shadow'
import { MemoryExperimentMetricsSchema, type MemoryExperimentPolicy } from './memory-experiment.contract'

/** A measured cost report is useful even when the technical advancement decision is hold. */
export function evaluateMemoryExperimentMetrics(
  raw: unknown,
  expectedVersions: MemoryPairVersions,
  policy: MemoryExperimentPolicy,
  verify: (evidence: unknown) => boolean,
  now = new Date()
): MemoryGateDecision {
  const hold = (reason: string): MemoryGateDecision => ({ status: 'hold', reasons: [reason] })
  try {
    const parsed = MemoryExperimentMetricsSchema.safeParse(raw)
    if (!parsed.success) return hold('experiment-metrics-missing')
    const metrics = parsed.data
    if (!verify(metrics) || JSON.stringify(metrics.versions) !== JSON.stringify(MemoryPairVersionsSchema.parse(expectedVersions))) return hold('experiment-evidence-untrusted-or-unpaired')
    if (!Number.isFinite(now.getTime()) || Date.parse(metrics.measuredAt) > now.getTime() || Date.parse(metrics.expiresAt) <= now.getTime()) return hold('experiment-evidence-stale')
    if ([metrics.unauthorizedLeaks, metrics.consentViolations, metrics.policyIneligibleProjections, metrics.lifecycleResurrections].some((value) => value !== null && value > 0)) return { status: 'rollback', reasons: ['privacy-integrity-or-lifecycle-violation'] }
    const measured = [metrics.comparableContextReduction, metrics.criticalRecall, metrics.qualityDelta, metrics.temporalErrors, metrics.unauthorizedLeaks, metrics.consentViolations, metrics.policyIneligibleProjections, metrics.lifecycleResurrections, metrics.memoryRoi, metrics.latencyDeltaMs, metrics.errorRate, metrics.callsPerTurn, metrics.costBrlPerTurn]
    if (measured.some((value) => value === null) || metrics.sampleSize < policy.minimumSamples) return hold('experiment-metrics-unknown-or-insufficient')
    if (metrics.qualityDelta! < 0 || metrics.temporalErrors! > 0 || metrics.latencyDeltaMs! > policy.maximumLatencyDeltaMs || metrics.errorRate! > policy.maximumErrorRate || metrics.callsPerTurn! > policy.maximumCallsPerTurn || metrics.costBrlPerTurn! > policy.maximumCostBrlPerTurn) return { status: 'rollback', reasons: ['experiment-regression'] }
    if (metrics.comparableContextReduction! < 0.5 || metrics.criticalRecall! <= 0.9 || metrics.memoryRoi! <= 3) return hold('context-recall-or-memory-roi-gate')
    return { status: 'pass', reasons: metrics.memoryRoi! > 5 ? ['memory-roi-target-achieved'] : [] }
  } catch { return hold('experiment-evidence-unavailable') }
}
