import { MemoryShadowEvidenceSchema, MemoryPairVersionsSchema, type MemoryGateDecision, type MemoryPairVersions, type MemoryShadowEvidence } from './memory-shadow.contract'

export function evaluateMemoryShadowEvidence(
  rawEvidence: unknown,
  expectedVersions: MemoryPairVersions,
  verify: (evidence: MemoryShadowEvidence) => boolean,
  now = new Date()
): MemoryGateDecision {
  const held = (reason: string): MemoryGateDecision => ({ status: 'hold', reasons: [reason] })
  try {
    const parsed = MemoryShadowEvidenceSchema.safeParse(rawEvidence)
    if (!parsed.success) return held('missing-or-invalid-shadow-evidence')
    const evidence = parsed.data
    const expected = MemoryPairVersionsSchema.parse(expectedVersions)
    if (!verify(evidence) || JSON.stringify(evidence.versions) !== JSON.stringify(expected)) return held('untrusted-or-unpaired-shadow-evidence')
    if (!Number.isFinite(now.getTime()) || Date.parse(evidence.measuredAt) > now.getTime() || Date.parse(evidence.expiresAt) <= now.getTime()) return held('stale-shadow-evidence')
    if ((evidence.unauthorizedLeaks ?? 0) > 0 || (evidence.consentViolations ?? 0) > 0) return { status: 'rollback', reasons: ['privacy-or-consent-violation'] }
    if ([evidence.criticalRecall, evidence.qualityDelta, evidence.temporalErrors, evidence.unauthorizedLeaks, evidence.consentViolations, evidence.latencyDeltaMs].some((value) => value === null)) return held('shadow-metrics-unknown')
    if (evidence.criticalRecall! <= 0.9 || evidence.qualityDelta! < 0 || evidence.temporalErrors! > 0 || evidence.latencyDeltaMs! > evidence.maximumLatencyDeltaMs) return held('shadow-quality-or-latency-gate')
    return { status: 'pass', reasons: [] }
  } catch {
    return held('shadow-evidence-unavailable')
  }
}
