import type { MemoryUsageLedgerEntry } from '@application/contracts'
import {
  MEMORY_COST_COMPONENTS,
  MemoryEconomicsReportInputSchema,
  type MemoryEconomicsReportInput
} from './memory-economics-report.contract'

const finite = (value: number): number => {
  if (!Number.isFinite(value))
    throw new Error('Economics aggregate exceeds numeric bounds')
  return value
}
const total = (values: readonly (number | null)[]): number | null =>
  values.length === 0 || values.some((value) => value === null)
    ? null
    : finite(values.reduce<number>((sum, value) => sum + (value ?? 0), 0))
const brl = (entry: MemoryUsageLedgerEntry): number | null => {
  if (entry.cost.brlAmount !== null) return entry.cost.brlAmount
  if (entry.cost.sourceAmount === null) return null
  if (entry.cost.sourceCurrency === 'BRL') return entry.cost.sourceAmount
  return entry.brlConversionSnapshot === null
    ? null
    : finite(
        entry.cost.sourceAmount *
          entry.brlConversionSnapshot.brlPerSourceCurrencyUnit
      )
}
const unique = (values: readonly string[]): string[] =>
  [...new Set(values)].sort()

/** Pure aggregation. It accepts evidence, never runs experiments or changes historical prices. */
export function createMemoryEconomicsReport(value: unknown) {
  const input = MemoryEconomicsReportInputSchema.parse(value)
  const hold = new Set<string>()
  const rollback = new Set<string>()
  const from = Date.parse(input.window.from)
  const to = Date.parse(input.window.to)
  if (from >= to) throw new Error('Economics report window is invalid')
  if (
    input.scenario.kind === 'free-investor' &&
    (input.scenario.backgroundFormation || input.scenario.monthlyPriceBrl !== 0)
  )
    throw new Error(
      'Free requires zero scenario revenue and no background formation'
    )
  if (
    input.scenario.evidenceMode !== 'simulated' &&
    input.workload.simulation !== null
  )
    throw new Error('Simulation assumptions require a simulated scenario')
  const subjects = new Set(input.cohort.subjectIds)
  const entries = new Map<string, MemoryUsageLedgerEntry>()
  const immutable = new Map<string, string>()
  const retain = (key: string, snapshot: unknown): void => {
    const serialized = JSON.stringify(snapshot)
    if (immutable.has(key) && immutable.get(key) !== serialized)
      throw new Error('Conflicting immutable economics evidence')
    immutable.set(key, serialized)
  }
  for (const entry of input.ledger) {
    const usage = entry.usageEvent
    if (
      usage.tenantId !== input.cohort.tenantId ||
      !subjects.has(usage.subjectId) ||
      Date.parse(usage.occurredAt) < from ||
      Date.parse(usage.occurredAt) >= to
    )
      throw new Error(
        'Economics ledger is outside its declared cohort or window'
      )
    retain(`entry:${entry.ledgerEntryId}`, entry)
    retain(`event:${usage.subjectId}:${usage.eventId}`, usage)
    const price = entry.pricingSnapshot
    if (price !== null)
      retain(
        JSON.stringify([
          'price',
          price.providerId,
          price.modelId,
          price.pricingVersion
        ]),
        price
      )
    const fx = entry.brlConversionSnapshot
    if (fx !== null)
      retain(JSON.stringify(['fx', fx.sourceCurrency, fx.rateVersion]), fx)
    entries.set(entry.ledgerEntryId, entry)
  }
  const entryFor = (id: string): MemoryUsageLedgerEntry => {
    const entry = entries.get(id)
    if (entry === undefined)
      throw new Error('Economics evidence references an absent ledger entry')
    return entry
  }
  const requestedAllocations = new Set(
    input.allocations.map(({ ledgerEntryId }) => ledgerEntryId)
  )
  const backgroundAttempts = new Map<string, MemoryUsageLedgerEntry[]>()
  for (const entry of entries.values()) {
    const event = entry.usageEvent
    if (event.operation !== 'curation') continue
    const key = JSON.stringify([
      event.tenantId,
      event.subjectId,
      event.attemptId
    ])
    backgroundAttempts.set(key, [...(backgroundAttempts.get(key) ?? []), entry])
  }
  const completedForIntent = new Map<string, string>()
  for (const attempt of backgroundAttempts.values()) {
    const completions = attempt.filter(
      ({ usageEvent }) => usageEvent.calls.llm !== null
    )
    if (
      new Set(completions.map(({ usageEvent }) => usageEvent.eventId)).size > 1
    )
      throw new Error(
        'Conflicting completion observations for one background attempt'
      )
    const selectedCompletions = completions.filter(({ ledgerEntryId }) =>
      requestedAllocations.has(ledgerEntryId)
    )
    const candidates =
      selectedCompletions.length > 0 ? selectedCompletions : completions
    if (candidates.length > 1)
      throw new Error('Select one background completion valuation')
    const completion = candidates[0]
    if (completion === undefined) continue
    for (const intent of attempt) {
      if (
        intent.usageEvent.calls.llm === null &&
        intent.usageEvent.providerUsage === null
      )
        completedForIntent.set(intent.ledgerEntryId, completion.ledgerEntryId)
    }
  }
  const allocations = input.allocations.flatMap((allocation) => {
    const completion = completedForIntent.get(allocation.ledgerEntryId)
    if (completion !== undefined && requestedAllocations.has(completion))
      return []
    return [
      { ...allocation, ledgerEntryId: completion ?? allocation.ledgerEntryId }
    ]
  })
  const fractions = new Map<string, number>()
  const valuationByEvent = new Map<string, string>()
  for (const allocation of allocations) {
    const entry = entryFor(allocation.ledgerEntryId)
    fractions.set(
      allocation.ledgerEntryId,
      finite(
        (fractions.get(allocation.ledgerEntryId) ?? 0) + allocation.fraction
      )
    )
    const eventKey = `${entry.usageEvent.subjectId}:${entry.usageEvent.eventId}`
    const previous = valuationByEvent.get(eventKey)
    if (previous !== undefined && previous !== allocation.ledgerEntryId)
      throw new Error(
        'Select one valuation per usage event; revaluations cannot be added together'
      )
    valuationByEvent.set(eventKey, allocation.ledgerEntryId)
    if (
      input.scenario.kind === 'free-investor' &&
      entry.usageEvent.operation === 'curation'
    )
      throw new Error('Background formation cannot be relabeled as Free usage')
  }
  if ([...fractions.values()].some((fraction) => Math.abs(fraction - 1) > 1e-9))
    throw new Error(
      'Component allocation must cover each selected cost exactly once'
    )
  const selected = [...fractions.keys()].sort().map(entryFor)
  if (selected.length === 0) hold.add('missing-ledger-allocation')
  const allocatedCost = (
    allocation: MemoryEconomicsReportInput['allocations'][number]
  ): number | null => {
    const amount = brl(entryFor(allocation.ledgerEntryId))
    return amount === null ? null : finite(amount * allocation.fraction)
  }
  const components = (['operational', 'experiment'] as const).map(
    (costClass) => ({
      costClass,
      components: MEMORY_COST_COMPONENTS.map((component) => {
        const matching = allocations.filter(
          (allocation) =>
            allocation.component === component &&
            entryFor(allocation.ledgerEntryId).usageEvent.costClass ===
              costClass
        )
        const amounts = matching.map(allocatedCost)
        const known = amounts.filter(
          (amount): amount is number => amount !== null
        )
        return {
          component,
          coverage: input.componentCoverage[component],
          costBrl:
            input.componentCoverage[component] === 'complete'
              ? total(amounts)
              : null,
          knownSubtotalBrl: total(known),
          unknownAllocations: amounts.filter((amount) => amount === null)
            .length,
          selectedEntries: unique(
            matching.map(({ ledgerEntryId }) => ledgerEntryId)
          ).length
        }
      })
    })
  )
  const operationalComponents = components.find(
    (group) => group.costClass === 'operational'
  )!.components
  const operationalCostBrl = total(
    operationalComponents.map(({ costBrl }) => costBrl)
  )
  const operationalKnownSubtotalBrl = total(
    operationalComponents
      .map(({ knownSubtotalBrl }) => knownSubtotalBrl)
      .filter((amount): amount is number => amount !== null)
  )
  const processingAllocations = allocations.filter(
    ({ memoryProcessing }) => memoryProcessing
  )
  const memoryProcessingCostBrl =
    input.componentCoverage.memory === 'complete' &&
    input.componentCoverage.infrastructure === 'complete'
      ? total(processingAllocations.map(allocatedCost))
      : null

  let avoidedServingCostBrl: number | null = null
  let comparableMeasuredUsage = false
  const comparison = input.comparison
  if (comparison !== null && comparison.measuredPaired) {
    const control = comparison.controlEntryIds.map(entryFor)
    const treatment = comparison.treatmentEntryIds.map(entryFor)
    const ids = [...comparison.controlEntryIds, ...comparison.treatmentEntryIds]
    const signature = (group: readonly MemoryUsageLedgerEntry[]) =>
      JSON.stringify(
        unique(
          group.map((entry) =>
            JSON.stringify([
              entry.usageEvent.workloadVersion,
              entry.usageEvent.providerUsage?.providerId,
              entry.usageEvent.providerUsage?.modelId,
              entry.usageEvent.providerUsage?.modelVersion,
              entry.pricingSnapshot?.pricingVersion,
              entry.pricingSnapshot?.currency,
              entry.brlConversionSnapshot?.rateVersion
            ])
          )
        )
      )
    comparableMeasuredUsage =
      new Set(ids).size === ids.length &&
      [...control, ...treatment].every(
        (entry) =>
          entry.usageEvent.operation === 'conversation-serving' &&
          entry.usageEvent.workloadVersion === input.workload.version &&
          entry.usageEvent.providerUsage?.provenance === 'provider-reported' &&
          entry.pricingSnapshot?.provenance === 'published' &&
          brl(entry) !== null
      ) &&
      signature(control) === signature(treatment)
    if (comparableMeasuredUsage)
      avoidedServingCostBrl = finite(
        total(control.map(brl))! - total(treatment.map(brl))!
      )
  }
  if (!comparableMeasuredUsage)
    hold.add('missing-comparable-measured-serving-costs')
  const netMemoryCostBrl =
    memoryProcessingCostBrl === null || avoidedServingCostBrl === null
      ? null
      : finite(memoryProcessingCostBrl - avoidedServingCostBrl)
  const memoryRoi =
    memoryProcessingCostBrl === null ||
    memoryProcessingCostBrl === 0 ||
    avoidedServingCostBrl === null
      ? null
      : finite(avoidedServingCostBrl / memoryProcessingCostBrl)

  const durationEntries = input.workload.durationEntryIds.map(entryFor)
  const conversations = durationEntries.map(
    ({ usageEvent }) => `${usageEvent.subjectId}:${usageEvent.conversationId}`
  )
  if (new Set(conversations).size !== conversations.length)
    throw new Error(
      'Duration selection requires one non-overlapping conversation aggregate'
    )
  const durationTotals = {
    patientSpeechMilliseconds: total(
      durationEntries.map(
        ({ usageEvent }) => usageEvent.durations.patientSpeechMilliseconds
      )
    ),
    assistantSpeechMilliseconds: total(
      durationEntries.map(
        ({ usageEvent }) => usageEvent.durations.assistantSpeechMilliseconds
      )
    ),
    inactivityMilliseconds: total(
      durationEntries.map(
        ({ usageEvent }) => usageEvent.durations.inactivityMilliseconds
      )
    )
  }
  const basis = input.workload.durationBasis
  const basisMilliseconds =
    basis === null
      ? null
      : total(
          basis === 'patient-speech'
            ? [durationTotals.patientSpeechMilliseconds]
            : basis === 'patient-and-assistant-speech'
              ? [
                  durationTotals.patientSpeechMilliseconds,
                  durationTotals.assistantSpeechMilliseconds
                ]
              : Object.values(durationTotals)
        )
  const measuredMinutesPerFamily =
    basisMilliseconds === null
      ? null
      : finite(basisMilliseconds / 60_000 / input.cohort.activeFamilies)
  const synthetic = [...selected, ...durationEntries].some(
    (entry) =>
      entry.usageEvent.sourceKind === 'synthetic-transcript' ||
      entry.usageEvent.providerUsage?.provenance === 'synthetic' ||
      entry.pricingSnapshot?.provenance === 'synthetic'
  )
  const evidenceMode = synthetic ? 'simulated' : input.scenario.evidenceMode
  const distribution = input.workload.distribution
  const distributionKnown =
    Object.values(distribution).every((item) => item !== null) &&
    (distribution.sessions ?? 0) > 1 &&
    (distribution.turns ?? 0) > 1
  const sourceMinutesPerFamily =
    evidenceMode === 'simulated' && input.workload.simulation !== null
      ? input.workload.simulation.sourceMinutesPerFamily
      : measuredMinutesPerFamily
  let monthlyFactor: number | null = null
  const durationConsistent = durationEntries.every(
    ({ usageEvent }) => usageEvent.durationBasis === basis
  )
  if (
    basis !== null &&
    sourceMinutesPerFamily !== null &&
    sourceMinutesPerFamily > 0 &&
    durationConsistent &&
    (evidenceMode === 'simulated' ||
      (input.workload.durationCoverage === 'complete' && distributionKnown))
  ) {
    if (evidenceMode === 'observed') {
      const days = (to - from) / 86_400_000
      if (
        days >= 28 &&
        days <= 31 &&
        Math.abs(sourceMinutesPerFamily - 260) < 1e-6
      )
        monthlyFactor = 1
    } else monthlyFactor = finite(260 / sourceMinutesPerFamily)
  }
  const voice = input.voiceEvidence
  const measuredVoiceCoverage =
    voice.version !== null &&
    voice.authorizedBridge &&
    voice.patientAudioMeasured &&
    voice.assistantAudioMeasured &&
    voice.interruptionsAccounted &&
    voice.cancellationResidueAccounted &&
    voice.lifecycleSpec034Complete &&
    durationEntries.length > 0 &&
    durationEntries.every(
      ({ usageEvent }) => usageEvent.sourceKind === 'observed-voice'
    )
  const familyProjection = (amount: number | null): number | null =>
    amount === null || monthlyFactor === null
      ? null
      : finite((amount / input.cohort.activeFamilies) * monthlyFactor)
  const monthlyCostBrl =
    measuredVoiceCoverage || evidenceMode === 'simulated'
      ? familyProjection(operationalCostBrl)
      : null
  const monthlyKnownSubtotalBrl = familyProjection(operationalKnownSubtotalBrl)
  const revenue = input.scenario.revenueAuthorized
    ? input.scenario.monthlyPriceBrl
    : null
  const aiCogsRatio =
    revenue === null || revenue === 0 || monthlyCostBrl === null
      ? null
      : finite(monthlyCostBrl / revenue)

  const requireMetric = (
    name: string,
    metric: number | null,
    passes: (metric: number) => boolean,
    unsafe = false
  ): void => {
    if (metric === null) hold.add(`missing-${name}`)
    else if (!passes(metric)) (unsafe ? rollback : hold).add(`failed-${name}`)
  }
  const metrics = input.metrics
  const thresholds = input.thresholds
  requireMetric(
    'context-reduction',
    metrics.contextReduction,
    (metric) => metric >= thresholds.minimumContextReduction
  )
  requireMetric(
    'critical-recall',
    metrics.criticalRecallAtK,
    (metric) => metric > thresholds.minimumCriticalRecall
  )
  requireMetric(
    'escalation',
    metrics.strongModelEscalationRate,
    (metric) => metric < thresholds.maximumEscalationRate
  )
  requireMetric('quality', metrics.qualityDelta, (metric) => metric >= 0, true)
  for (const key of [
    'leakage',
    'consentViolations',
    'policyIneligiblePoisonProjections',
    'lifecycleResurrections',
    'answerCorruptionRate'
  ] as const)
    requireMetric(key, metrics[key], (metric) => metric === 0, true)
  for (const key of ['poisonAt1', 'poisonProjectionRate'] as const)
    requireMetric(key, metrics[key], (metric) => metric === 0, true)
  for (const key of ['utilityRetainedUnderAttack', 'abstentionRate'] as const)
    requireMetric(key, metrics[key], () => true)
  const maxima = [
    [
      'irrelevant-rate',
      metrics.irrelevantRate,
      thresholds.maximumIrrelevantRate
    ],
    [
      'temporal-errors',
      metrics.temporalErrors,
      thresholds.maximumTemporalErrors
    ],
    [
      'latency',
      metrics.latencyP95Milliseconds,
      thresholds.maximumLatencyP95Milliseconds
    ],
    ['queue-backlog', metrics.queueBacklog, thresholds.maximumQueueBacklog],
    [
      'queue-age',
      metrics.queueOldestMilliseconds,
      thresholds.maximumQueueOldestMilliseconds
    ],
    ['retry-rate', metrics.retryRate, thresholds.maximumRetryRate],
    ['failure-rate', metrics.failureRate, thresholds.maximumFailureRate]
  ] as const
  for (const [name, metric, maximum] of maxima) {
    if (maximum === null) hold.add(`missing-threshold-${name}`)
    requireMetric(name, metric, (value) => maximum !== null && value <= maximum)
  }
  requireMetric(
    'memory-roi',
    memoryRoi,
    (metric) => metric > thresholds.minimumMemoryRoi
  )
  for (const specId of [
    'SPEC-011',
    'SPEC-017',
    'SPEC-043',
    'SPEC-012'
  ] as const) {
    const gates = input.gates.filter((gate) => gate.specId === specId)
    const gate = gates[0]
    if (
      gates.length !== 1 ||
      gate === undefined ||
      gate.sampleSize === null ||
      gate.sampleSize === 0 ||
      gate.digest === null ||
      input.evaluatedHead === null ||
      gate.evaluatedHead !== input.evaluatedHead ||
      gate.workloadVersion !== input.workload.version ||
      gate.profileVersion !== input.workload.profileVersion
    )
      hold.add(`missing-or-inconsistent-${specId}`)
    else if (gate.status === 'rollback') rollback.add(`upstream-${specId}`)
    else if (gate.status !== 'pass') hold.add(`upstream-${specId}`)
  }
  const modelMitigation = allocations.filter(
    ({ mitigation }) => mitigation === 'model-assisted'
  )
  const deterministicMitigation = allocations.filter(
    ({ mitigation }) => mitigation === 'deterministic'
  )
  const modelMitigationCostBrl = total(modelMitigation.map(allocatedCost))
  if (
    modelMitigation.length > 0 &&
    (modelMitigationCostBrl === null ||
      metrics.modelMitigationInputTokens === null ||
      metrics.modelMitigationOutputTokens === null ||
      metrics.modelMitigationLatencyMilliseconds === null)
  )
    rollback.add('unaccounted-model-mitigation-overhead')
  if (
    input.scenario.scaleScope === 'voice-exposure' &&
    (!measuredVoiceCoverage || monthlyCostBrl === null)
  )
    hold.add('missing-measured-voice-affordability')
  if (evidenceMode === 'simulated')
    hold.add('simulated-evidence-cannot-authorize-scale')
  if (aiCogsRatio !== null && aiCogsRatio > 0.2)
    hold.add('ai-cogs-above-scenario-ceiling')
  if (
    input.uncertainty.sampleSize === null ||
    input.uncertainty.sampleSize === 0 ||
    input.uncertainty.methodVersion === null
  )
    hold.add('missing-sample-or-uncertainty-evidence')
  const usage = (['operational', 'experiment'] as const).map((costClass) => {
    const group = selected.filter(
      ({ usageEvent }) => usageEvent.costClass === costClass
    )
    const calls = Object.fromEntries(
      (['llm', 'web', 'fullText', 'vector'] as const).map((kind) => [
        kind,
        total(group.map(({ usageEvent }) => usageEvent.calls[kind]))
      ])
    )
    return {
      costClass,
      events: group.length,
      calls,
      llmCallsPerTurn:
        calls.llm === null || calls.llm === undefined || !distribution.turns
          ? null
          : calls.llm / distribution.turns,
      providerReportedTokens: total(
        group
          .filter(
            ({ usageEvent }) =>
              usageEvent.providerUsage?.provenance === 'provider-reported'
          )
          .map(
            ({ usageEvent }) => usageEvent.providerUsage?.totalTokens ?? null
          )
      ),
      syntheticProviderTokens: total(
        group
          .filter(
            ({ usageEvent }) =>
              usageEvent.providerUsage?.provenance === 'synthetic'
          )
          .map(
            ({ usageEvent }) => usageEvent.providerUsage?.totalTokens ?? null
          )
      ),
      estimatedTokens: total(
        group.map(
          ({ usageEvent }) => usageEvent.estimatedUsage?.totalTokens ?? null
        )
      )
    }
  })
  return {
    schemaVersion: 'memory-economics-report-v1' as const,
    reportId: input.reportId,
    generatedAt: input.generatedAt,
    evaluatedHead: input.evaluatedHead,
    cohortId: input.cohort.cohortId,
    activeFamilies: input.cohort.activeFamilies,
    window: input.window,
    scenario: input.scenario,
    monthly: {
      weeklyMinutes: 60,
      averageMonthlyMinutes: 260,
      normalization: '52/12',
      durationBasis: basis,
      sourceMinutesPerFamily,
      factor: monthlyFactor,
      evidenceMode,
      costPerActiveFamilyBrl: monthlyCostBrl,
      knownSubtotalPerActiveFamilyBrl: monthlyKnownSubtotalBrl,
      coverage: monthlyCostBrl === null ? 'partial' : evidenceMode,
      projectionAvailable: monthlyFactor !== null,
      revenueScenarioBrl: revenue,
      aiCogsRatio,
      aiCogsTarget: 0.1,
      aiCogsCeiling: 0.2,
      aiCogsTargetAchieved: aiCogsRatio === null ? null : aiCogsRatio <= 0.1,
      freeSubsidyBrl:
        input.scenario.kind === 'free-investor' ? monthlyCostBrl : null,
      commercialCommitment: false
    },
    workload: {
      ...input.workload,
      durationEntryIds: [...input.workload.durationEntryIds].sort()
    },
    durationTotals,
    measuredVoiceCoverage,
    voiceExperience: voice.experienceMeasured ? 'measured' : 'not-measured',
    components,
    usage,
    memory: {
      comparableMeasuredUsage,
      avoidedServingCostBrl,
      processingCostBrl: memoryProcessingCostBrl,
      netMemoryCostBrl,
      memoryRoi,
      healthy:
        memoryRoi === null ? null : memoryRoi > thresholds.minimumMemoryRoi,
      targetAchieved:
        memoryRoi === null ? null : memoryRoi > thresholds.targetMemoryRoi,
      deterministicMitigationCostBrl: total(
        deterministicMitigation.map(allocatedCost)
      ),
      modelMitigationCostBrl,
      allocationVersion: input.allocationVersion,
      comparison
    },
    metrics,
    thresholds,
    gates: input.gates,
    uncertainty: input.uncertainty,
    provenance: {
      reconciliationVersion: 'memory-background-attempt-reconciliation-v1',
      supersededIntentLedgerEntryIds: [...completedForIntent.keys()].sort(),
      selectedLedgerEntryIds: [...fractions.keys()].sort(),
      excludedLedgerEntryIds: [...entries.keys()]
        .filter((id) => !fractions.has(id))
        .sort(),
      usageSchemaVersions: unique(
        selected.map(({ usageEvent }) => usageEvent.schemaVersion)
      ),
      pricingSnapshots: [
        ...new Map(
          selected
            .filter(({ pricingSnapshot }) => pricingSnapshot !== null)
            .map(({ pricingSnapshot }) => [
              JSON.stringify(pricingSnapshot),
              pricingSnapshot
            ])
        ).values()
      ],
      brlConversionSnapshots: [
        ...new Map(
          selected
            .filter(
              ({ brlConversionSnapshot }) => brlConversionSnapshot !== null
            )
            .map(({ brlConversionSnapshot }) => [
              JSON.stringify(brlConversionSnapshot),
              brlConversionSnapshot
            ])
        ).values()
      ]
    },
    decision: {
      scope: input.scenario.scaleScope,
      status:
        rollback.size > 0
          ? ('rollback' as const)
          : hold.size > 0
            ? ('hold' as const)
            : ('scale' as const),
      reasons: [...rollback, ...hold].sort()
    }
  }
}

export type MemoryEconomicsReport = ReturnType<
  typeof createMemoryEconomicsReport
>
