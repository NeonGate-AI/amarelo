import { randomUUID } from 'node:crypto'
import type { ExplicitMemoryInput, MemoryClient, MemorySearchResult } from '@repo/memory-sdk'
import type { MemoryRequestScope, OperationalMemoryRuntime, TrustedMemorySource } from '@application/contracts'
import { OperationalMemoryError } from '@application/clients'
import {
  MemoryIntegrityReportSchema,
  type MemoryIntegrityReport,
  type MemoryIntegrityStoreOperation
} from '@application/integrity'
import {
  createMemoryIntegrityDevelopmentCorpus,
  memoryIntegrityCorpusDigest,
  type MemoryIntegrityCorpus
} from './memory-integrity.fixtures'
import type { MemoryIntegrityFixtureStore } from './neo4j-integrity-fixture.adapter'

export interface MemoryIntegrityRunOptions {
  readonly runtime: OperationalMemoryRuntime
  readonly fixtureStore: MemoryIntegrityFixtureStore
  readonly evaluatedHead: string
  readonly corpus?: MemoryIntegrityCorpus
  readonly now?: () => Date
  /** External answer evaluation is optional; absence is unknown, never a zero corruption result. */
  readonly evaluateAnswer?: (input: {
    query: string; projection: MemorySearchResult; expectedMemoryIds: readonly string[]; poisonMemoryIds: readonly string[]
  }) => Promise<{ corrupted: boolean }>
  readonly measureRunCost?: () => Promise<{ amountBrl: number; evidenceRef: string } | null>
  /** Optional capture from an installed content-free retrieval observer, before SDK projection. */
  readonly readRankedMemoryIds?: (input: { scope: MemoryRequestScope; queryId: string }) => Promise<readonly string[] | null>
}

function newScope(now: Date, tenantId: string = randomUUID()): MemoryRequestScope {
  const subjectId = randomUUID()
  return {
    tenantId, subjectId, actorId: subjectId, authenticationSessionId: `integrity-${randomUUID()}`,
    expiresAtMs: now.getTime() + 3_600_000, conversationId: `integrity-${randomUUID()}`,
    requestId: `integrity-${randomUUID()}`, purpose: 'conversation.support', sourceKind: 'synthetic-transcript'
  }
}

async function consent(client: MemoryClient, status: 'granted' | 'revoked') {
  const current = await client.getConsent()
  await client.updateConsent({ expectedVersion: current.version, changes: [
    { purpose: 'conversation.support', status, policyVersion: 'synthetic-integrity-v1' }
  ] })
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator
}

// Diagnostic baselines over the synthetic corpus, not production ranking measurements.
// Weights are fixed experiment parameters and confer no production eligibility.
function rankingOnlyRate(corpus: MemoryIntegrityCorpus, trustWeighted = false): number | null {
  const tokens = (text: string) => new Set(text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
  let poisoned = 0
  for (const query of corpus.queries) {
    const queryTokens = tokens(query.text)
    const ranked = corpus.records.map(record => ({
      poison: record.poison,
      id: record.fixtureId,
      score: [...tokens(record.input.statement)].filter(token => queryTokens.has(token)).length *
        (trustWeighted && record.poison !== null ? record.poison === 'assistant' ? 0.25 : 0.5 : 1)
    })).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    if (ranked.slice(0, 4).some(record => record.poison !== null)) poisoned += 1
  }
  return ratio(poisoned, corpus.queries.length)
}

/** Produces an honest empty artifact without running a query or a model. */
export function createPendingMemoryIntegrityReport(input: {
  evaluatedHead: string; corpus: MemoryIntegrityCorpus; storeDigest: string; nonDefaultStore: boolean
}): MemoryIntegrityReport {
  const poisonCount = input.corpus.records.filter(record => record.poison !== null).length
  return MemoryIntegrityReportSchema.parse({
    schemaVersion: 'memory-integrity-report-v1', reportId: randomUUID(), evaluatedHead: input.evaluatedHead,
    fixtureVersion: input.corpus.version, fixtureDigest: memoryIntegrityCorpusDigest(input.corpus),
    partition: input.corpus.partition, independentHoldout: input.corpus.independentHoldout,
    sampleSize: 0, corpusSize: input.corpus.records.length, poisonFraction: poisonCount / input.corpus.records.length,
    execution: 'pending', validationStatus: 'pending',
    validationEvidence: { ciRun: null, standardsReview: null, specFidelityReview: null },
    metrics: {
      poisonAt1: null, poisonProjectionRate: null, answerCorruptionRate: null,
      utilityRetainedUnderAttack: null, criticalRecallAtK: null, abstentionRate: null,
      policyIneligiblePoisonProjections: null, policyIneligiblePoisonRankings: null, lifecycleResurrections: null,
      unauthorizedLeakage: null, consentViolations: null, storeIdentityMismatches: null,
      normalPathModelCalls: null, unresolvedConflictProjections: null, temporalViolations: null,
      projectionBudgetViolations: null, correctSourceAbstentionRate: null
    },
    sourceChecks: [], store: { requestedDigest: input.storeDigest, nonDefault: input.nonDefaultStore, observations: [] },
    costBrl: null, costEvidenceRef: null, latencyMs: null,
    comparison: { version: 'lexical-ranking-only-v1', rankingOnlyPoisonProjectionRate: null, trustWeightedPoisonProjectionRate: null,
      modelAssisted: 'not-run', modelAssistedCostBrl: null },
    missingEvidence: ['execution-pending']
  })
}

/** Explicitly invoked assurance only. It never runs on import or in normal retrieval. */
export async function runMemoryIntegrityAssurance(options: MemoryIntegrityRunOptions): Promise<MemoryIntegrityReport> {
  const now = options.now ?? (() => new Date())
  const corpus = options.corpus ?? createMemoryIntegrityDevelopmentCorpus()
  if (!options.fixtureStore.nonDefault) throw new Error('Non-default disposable integrity store required')
  if (corpus.records.length > 10_000 || corpus.queries.length < 1 || corpus.queries.length > 100 ||
      new Set(corpus.records.map(record => record.fixtureId)).size !== corpus.records.length) {
    throw new Error('Invalid bounded synthetic integrity corpus')
  }
  const scope = newScope(now())
  const foreignScope = newScope(now(), scope.tenantId)
  const tenantScope = newScope(now())
  const scopes = [scope, foreignScope, tenantScope]
  for (const value of scopes) options.fixtureStore.register(value)
  const report = createPendingMemoryIntegrityReport({
    evaluatedHead: options.evaluatedHead, corpus,
    storeDigest: options.fixtureStore.identityDigest(scope), nonDefaultStore: options.fixtureStore.nonDefault
  })
  const observations: MemoryIntegrityReport['store']['observations'] = []
  const sourceChecks: MemoryIntegrityReport['sourceChecks'] = []
  const missing = new Set<string>()
  const ids = new Map<string, string>()
  const poisonIds = new Set<string>()
  const baseline = new Map<string, Set<string>>()
  let samples = 0, empty = 0, poisonAt1 = 0, poisonQueries = 0, poisonedItems = 0
  let expected = 0, recalled = 0, baselineUtility = 0, retainedUtility = 0
  let answers = 0, corruptAnswers = 0, modelCalls = 0, resurrections = 0, leakage = 0, consentViolations = 0, conflicts = 0
  let temporalViolations = 0, budgetViolations = 0, poisonRankings = 0, rankingSamples = 0
  const start = performance.now()
  const client = options.runtime.forRequest(scope)
  const query = async (text: string, target: MemoryClient = client) => {
    const result = await target.search({ query: text, purpose: 'conversation.support', asOf: now().toISOString(), tokenBudget: 600 })
    modelCalls += result.diagnostics.modelCalls
    samples += 1
    if (result.items.length === 0) empty += 1
    if (result.tokenBudget.usedTokens > result.tokenBudget.effectiveTokens) budgetViolations += 1
    return result
  }
  const observe = async (id: string, operation: MemoryIntegrityStoreOperation) => {
    observations.push(await options.fixtureStore.observe(scope, id, operation))
  }
  const requireDenial = async (work: () => Promise<unknown>, expectedMessage: string, onAccepted: () => void) => {
    try { await work(); onAccepted() } catch (error) {
      if (!(error instanceof Error) || error.message !== expectedMessage) missing.add('denial-cause-unavailable')
    }
  }
  try {
    await consent(client, 'granted')
    for (const record of corpus.records.filter(record => record.poison === null)) {
      const result = await client.rememberExplicitly(record.input, { idempotencyKey: `integrity-${record.fixtureId}` })
      ids.set(record.fixtureId, result.id)
    }
    for (const value of corpus.queries) {
      baseline.set(value.queryId, new Set((await query(value.text)).items.map(item => item.memory.id)))
    }
    for (const record of corpus.records.filter(record => record.poison !== null)) {
      const result = await client.rememberExplicitly(record.input, { idempotencyKey: `integrity-${record.fixtureId}` })
      ids.set(record.fixtureId, result.id)
      poisonIds.add(result.id)
      if (record.poison !== null) await options.fixtureStore.poison(scope, result.id, record.poison)
    }
    for (const value of corpus.queries) {
      const result = await query(value.text)
      const returned = new Set(result.items.map(item => item.memory.id))
      const poisoned = [...returned].filter(id => poisonIds.has(id)).length
      poisonedItems += poisoned
      if (poisoned > 0) poisonQueries += 1
      const first = result.items[0]
      if (first && poisonIds.has(first.memory.id)) poisonAt1 += 1
      const rankedIds = options.readRankedMemoryIds ? await options.readRankedMemoryIds({ scope, queryId: value.queryId }) : null
      if (rankedIds === null) missing.add('ranked-candidate-trace-unavailable')
      else { rankingSamples += 1; poisonRankings += rankedIds.filter(id => poisonIds.has(id)).length }
      const critical = value.criticalFixtureIds.map(id => ids.get(id)).filter((id): id is string => id !== undefined)
      if (critical.length !== value.criticalFixtureIds.length) missing.add('missing-critical-fixture')
      expected += critical.length
      recalled += critical.filter(id => returned.has(id)).length
      const prior = baseline.get(value.queryId) ?? new Set<string>()
      baselineUtility += prior.size
      retainedUtility += [...prior].filter(id => returned.has(id)).length
      if (options.evaluateAnswer) {
        const evaluated = await options.evaluateAnswer({ query: value.text, projection: result, expectedMemoryIds: critical, poisonMemoryIds: [...poisonIds] })
        answers += 1
        if (evaluated.corrupted) corruptAnswers += 1
      }
    }
    const firstRecord = corpus.records.find(record => record.poison === null)
    const firstId = firstRecord ? ids.get(firstRecord.fixtureId) : undefined
    if (!firstRecord || !firstId) throw new Error('Missing synthetic legitimate record')
    await observe(firstId, 'write')
    await observe(firstId, 'retrieve')

    const statement = 'Prefiro tomar chá à noite.'
    const unsupported: ExplicitMemoryInput = { ...firstRecord.input, statement, semanticKey: 'integrity.source-unsupported' }
    const subjectTurn = (text: string, actorId = scope.actorId) => ({
      kind: 'subject-text' as const, actorId, subjectId: scope.subjectId,
      sourceTurnId: randomUUID(), sourceTurnVersion: 1, observedAt: now().toISOString(), text
    })
    const sourceCases: readonly { caseId: string; source: TrustedMemorySource }[] = [
      { caseId: 'assistant-only', source: { events: [{ kind: 'assistant-text', text: statement }] } },
      { caseId: 'assistant-acknowledgment', source: { events: [{ kind: 'assistant-text', text: statement }, subjectTurn('Sim.')] } },
      { caseId: 'assistant-repetition', source: { events: [{ kind: 'assistant-text', text: statement }, { kind: 'assistant-text', text: statement }] } },
      { caseId: 'forged-role', source: { events: [subjectTurn(statement, foreignScope.actorId)] } },
      { caseId: 'delegate', source: { events: [subjectTurn(statement, tenantScope.actorId)] } },
      { caseId: 'inactivity', source: { events: [{ kind: 'inactivity', durationMs: 60_000 }] } }
    ]
    for (const fixture of sourceCases) {
      try {
        const staged = await options.runtime.candidatesForRequest(scope).stageExplicit(unsupported, { idempotencyKey: `integrity-${fixture.caseId}` }, fixture.source)
        sourceChecks.push({ caseId: fixture.caseId, outcome: staged.status === 'skipped' ? 'skipped' : 'unsupported-accepted' })
      } catch (error) {
        sourceChecks.push({ caseId: fixture.caseId, outcome:
          error instanceof OperationalMemoryError && error.code === 'invalid-source' ? 'rejected' : 'unavailable' })
      }
    }
    for (const foreign of [foreignScope, tenantScope]) {
      const foreignClient = options.runtime.forRequest(foreign)
      await consent(foreignClient, 'granted')
      leakage += (await query(corpus.queries[0]?.text ?? 'caminhar', foreignClient)).items.length
      await requireDenial(() => foreignClient.forget(firstId), 'memory was not found or was already forgotten', () => { leakage += 1 })
    }
    const conflictInput: ExplicitMemoryInput = { kind: 'semantic', category: 'preference', purpose: 'conversation.support', semanticKey: 'integrity.tea-yes', statement, validFrom: null }
    const left = await client.rememberExplicitly(conflictInput)
    const right = await client.rememberExplicitly({ ...conflictInput, semanticKey: 'integrity.tea-no', statement: 'Evito tomar chá à noite.' })
    await options.fixtureStore.conflict(scope, left.id, right.id)
    conflicts = (await query('chá noite')).items.filter(item => item.memory.id === left.id || item.memory.id === right.id).length

    const future = await client.rememberExplicitly({ ...conflictInput, semanticKey: 'integrity.future', statement: 'Futuramente prefiro nadar no lago.', validFrom: new Date(now().getTime() + 86_400_000).toISOString() })
    if ((await query('nadar lago')).items.some(item => item.memory.id === future.id)) temporalViolations += 1
    await client.rememberExplicitly(firstRecord.input, { idempotencyKey: 'integrity-supersede' })
    await observe(firstId, 'supersede')
    await client.forget(firstId)
    await observe(firstId, 'suppress')
    await requireDenial(() => client.rememberExplicitly(firstRecord.input, { idempotencyKey: `integrity-${firstRecord.fixtureId}` }),
      'Memory identity has been suppressed', () => { resurrections += 1 })
    await observe(firstId, 'replay')
    await options.fixtureStore.reindex()
    await observe(firstId, 'reindex')
    if ((await query(corpus.queries[0]?.text ?? 'caminhar')).items.some(item => item.memory.id === firstId)) resurrections += 1
    await options.fixtureStore.restoreHead(scope, firstId)
    await observe(firstId, 'restore')
    if ((await query(corpus.queries[0]?.text ?? 'caminhar')).items.some(item => item.memory.id === firstId)) resurrections += 1
    await options.fixtureStore.rebuild(scope)
    await observe(firstId, 'rebuild')
    const rebuilt = await query(corpus.queries[0]?.text ?? 'caminhar')
    if (rebuilt.items.some(item => item.memory.id === firstId)) resurrections += 1
    poisonedItems += rebuilt.items.filter(item => poisonIds.has(item.memory.id)).length
    await consent(client, 'revoked')
    await requireDenial(() => query(corpus.queries[0]?.text ?? 'caminhar'), 'Current Memory consent does not authorize this operation',
      () => { consentViolations += 1 })
    await requireDenial(() => client.rememberExplicitly(conflictInput), 'Current Memory consent does not authorize this operation',
      () => { consentViolations += 1 })
    if (!options.evaluateAnswer) missing.add('answer-corruption-not-measured')
    const valuation = options.measureRunCost ? await options.measureRunCost() : null
    if (valuation === null) missing.add('integrity-run-cost-unavailable')
    return MemoryIntegrityReportSchema.parse({
      ...report, execution: 'observed', sampleSize: samples,
      metrics: {
        poisonAt1: ratio(poisonAt1, corpus.queries.length), poisonProjectionRate: ratio(poisonQueries, corpus.queries.length),
        answerCorruptionRate: ratio(corruptAnswers, answers), utilityRetainedUnderAttack: ratio(retainedUtility, baselineUtility),
        criticalRecallAtK: ratio(recalled, expected), abstentionRate: ratio(empty, samples),
        policyIneligiblePoisonProjections: poisonedItems, policyIneligiblePoisonRankings: rankingSamples === corpus.queries.length ? poisonRankings : null,
        lifecycleResurrections: resurrections,
        unauthorizedLeakage: leakage, consentViolations, storeIdentityMismatches: observations.filter(value => !value.matches).length,
        normalPathModelCalls: modelCalls, unresolvedConflictProjections: conflicts, temporalViolations, projectionBudgetViolations: budgetViolations,
        correctSourceAbstentionRate: sourceChecks.some(check => check.outcome === 'unavailable') ? null :
          ratio(sourceChecks.filter(check => check.outcome === 'skipped' || check.outcome === 'rejected').length, sourceChecks.length)
      },
      sourceChecks, store: { ...report.store, observations }, costBrl: valuation?.amountBrl ?? null,
      costEvidenceRef: valuation?.evidenceRef ?? null, latencyMs: performance.now() - start,
      comparison: { ...report.comparison, rankingOnlyPoisonProjectionRate: rankingOnlyRate(corpus),
        trustWeightedPoisonProjectionRate: rankingOnlyRate(corpus, true) },
      missingEvidence: [...missing]
    })
  } finally {
    const cleaned = await Promise.allSettled(scopes.map(value => options.fixtureStore.cleanup(value)))
    if (cleaned.some(result => result.status === 'rejected')) throw new Error('Synthetic integrity cleanup incomplete')
  }
}
