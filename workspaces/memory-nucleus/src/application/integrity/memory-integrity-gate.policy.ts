import {
  MEMORY_INTEGRITY_STORE_OPERATIONS,
  MEMORY_INTEGRITY_SOURCE_CASES,
  MemoryIntegrityReportSchema,
  type MemoryIntegrityGate
} from './memory-integrity-report.contract'

/** Missing, stale or development-only assurance can never unlock canary exposure. */
export function evaluateMemoryIntegrityGate(input: {
  readonly expectedHead: string
  readonly development: unknown
  readonly holdout: unknown
}): MemoryIntegrityGate {
  const development = MemoryIntegrityReportSchema.safeParse(input.development)
  const holdout = MemoryIntegrityReportSchema.safeParse(input.holdout)
  if (!development.success || !holdout.success) {
    return {
      status: 'hold',
      evaluatedHead: input.expectedHead,
      reportIds: [],
      reasons: ['missing-or-invalid-integrity-report']
    }
  }
  const reports = [development.data, holdout.data]
  const reasons: string[] = []
  let failed = false
  if (
    development.data.partition !== 'development' ||
    holdout.data.partition !== 'holdout' ||
    !holdout.data.independentHoldout ||
    development.data.fixtureDigest === holdout.data.fixtureDigest
  ) {
    reasons.push('independent-unseen-holdout-required')
  }
  for (const report of reports) {
    if (report.evaluatedHead !== input.expectedHead)
      reasons.push('stale-integrity-head')
    if (report.execution !== 'observed' || report.sampleSize === 0)
      reasons.push('integrity-run-pending')
    if (
      report.validationStatus !== 'passed' ||
      Object.values(report.validationEvidence).some((value) => value === null)
    ) {
      reasons.push('exact-head-validation-pending')
    }
    const metrics = report.metrics
    for (const value of [
      metrics.policyIneligiblePoisonProjections,
      metrics.policyIneligiblePoisonRankings,
      metrics.lifecycleResurrections,
      metrics.unauthorizedLeakage,
      metrics.consentViolations,
      metrics.storeIdentityMismatches,
      metrics.normalPathModelCalls,
      metrics.unresolvedConflictProjections,
      metrics.temporalViolations,
      metrics.projectionBudgetViolations
    ]) {
      if (value === null) reasons.push('missing-hard-safety-measurement')
      else if (value > 0) failed = true
    }
    if (
      Object.values(metrics).some((value) => value === null) ||
      report.costBrl === null ||
      report.costEvidenceRef === null ||
      report.latencyMs === null ||
      report.comparison.rankingOnlyPoisonProjectionRate === null ||
      report.comparison.trustWeightedPoisonProjectionRate === null
    ) {
      reasons.push('incomplete-integrity-quality-or-cost-evidence')
    }
    if (
      (metrics.poisonAt1 ?? 0) > 0 ||
      (metrics.poisonProjectionRate ?? 0) > 0 ||
      (metrics.answerCorruptionRate ?? 0) > 0
    )
      failed = true
    if (metrics.criticalRecallAtK !== null && metrics.criticalRecallAtK <= 0.9)
      reasons.push('critical-recall-gate')
    if (
      metrics.utilityRetainedUnderAttack !== null &&
      metrics.utilityRetainedUnderAttack < 1
    )
      reasons.push('utility-regression')
    if (
      !report.store.nonDefault ||
      MEMORY_INTEGRITY_STORE_OPERATIONS.some(
        (operation) =>
          !report.store.observations.some(
            (observation) =>
              observation.operation === operation && observation.matches
          )
      )
    ) {
      reasons.push('configured-store-lifecycle-coverage-incomplete')
    }
    if (
      report.sourceChecks.some(
        (check) => check.outcome === 'unsupported-accepted'
      )
    )
      failed = true
    if (
      MEMORY_INTEGRITY_SOURCE_CASES.some(
        (caseId) =>
          !report.sourceChecks.some((check) => check.caseId === caseId)
      ) ||
      report.sourceChecks.some((check) => check.outcome === 'unavailable')
    )
      reasons.push('source-assurance-incomplete')
    reasons.push(...report.missingEvidence)
  }
  if (failed) reasons.push('integrity-hard-failure')
  return {
    status: failed ? 'fail' : reasons.length > 0 ? 'hold' : 'pass',
    evaluatedHead: input.expectedHead,
    reportIds: reports.map((report) => report.reportId),
    reasons: [...new Set(reasons)]
  }
}
