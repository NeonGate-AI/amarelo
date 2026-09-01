import type { AuthorizedMemoryRetrievalDependencies } from '#application/ports/memory-authorization.port'
import {
  MEMORY_RETRIEVAL_POLICY_VERSION,
  type MemoryRetrievalCandidateDecision,
  type MemoryRetrievalCandidateTrace
} from '#application/ports/memory-retrieval-observer.port'
import { resolveMemoryAuthorization } from '#application/use-cases/resolve-memory-authorization'
import type {
  AuthorizedMemoryQuery,
  AuthorizedMemoryRetrievalResult,
  RetrievedMemoryData
} from '#application/contracts/memory-retrieval.contract'
import { MemoryRepositoryScopeError } from '#application/contracts/memory-retrieval.error'
import {
  compareRankedMemoryRecords,
  lexicalMemoryTokens,
  normalizedSemanticMemoryKeySet,
  rankEligibleMemoryRecord,
  type RankedMemoryRecord
} from '#application/use-cases/memory-ranking'
import {
  createRetrievedMemoryContext,
  estimateRetrievedMemoryRecordTokens,
  MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION
} from '#application/use-cases/memory-projection'
import { parseOptionalTimestamp } from '#application/validation/memory-temporal-state.validate'
import {
  assertAuthorizedMemoryQuery,
  resolveEffectiveMemoryRetrievalBudgets,
  snapshotAuthorizedMemoryQuery
} from '#application/validation/memory-query.validate'
import {
  assertRepositoryCandidateLimits,
  assertRepositorySearchResult,
  createAuthorizedRepositorySearch
} from '#application/services/memory-repository-search.service'
import {
  recordRetrievalTrace,
  resolveObserverTimeoutMilliseconds
} from '#application/services/memory-retrieval-observer.service'

interface DeduplicatedMemoryRecords {
  readonly duplicateDecisions: readonly MemoryRetrievalCandidateTrace[]
  readonly records: readonly RankedMemoryRecord[]
}

function createCandidateTrace(
  rankedRecord: RankedMemoryRecord,
  decision: MemoryRetrievalCandidateDecision,
  estimatedTokens = estimateRetrievedMemoryRecordTokens(rankedRecord)
): MemoryRetrievalCandidateTrace {
  return Object.freeze({
    decision,
    estimatedTokens,
    lexicalScore: rankedRecord.lexicalScore,
    match: rankedRecord.match,
    memoryId: rankedRecord.record.id
  })
}

function removeDuplicateMemoryRecords(
  rankedRecords: readonly RankedMemoryRecord[]
): DeduplicatedMemoryRecords {
  const seenRecordIds = new Set<string>()
  const duplicateDecisions: MemoryRetrievalCandidateTrace[] = []
  const records: RankedMemoryRecord[] = []

  for (const rankedRecord of rankedRecords) {
    if (seenRecordIds.has(rankedRecord.record.id)) {
      duplicateDecisions.push(createCandidateTrace(rankedRecord, 'duplicate'))
      continue
    }
    seenRecordIds.add(rankedRecord.record.id)
    records.push(rankedRecord)
  }

  return Object.freeze({
    duplicateDecisions: Object.freeze(duplicateDecisions),
    records: Object.freeze(records)
  })
}

export async function retrieveAuthorizedMemory(
  query: AuthorizedMemoryQuery,
  dependencies: AuthorizedMemoryRetrievalDependencies
): Promise<AuthorizedMemoryRetrievalResult> {
  assertAuthorizedMemoryQuery(query)
  const observerTimeoutMilliseconds = resolveObserverTimeoutMilliseconds(
    dependencies.observerTimeoutMilliseconds
  )
  const monotonicClock =
    dependencies.monotonicClock ?? (() => performance.now())
  const authorizationClock = dependencies.now ?? (() => new Date())

  const authorization = await resolveMemoryAuthorization(
    snapshotAuthorizedMemoryQuery(query),
    dependencies.authorizationResolver,
    authorizationClock
  )
  const authorizedQuery = authorization.query
  const budgets = resolveEffectiveMemoryRetrievalBudgets(authorizedQuery.budgets)
  const repositorySearch = createAuthorizedRepositorySearch(
    authorizedQuery,
    budgets,
    authorization.decision.sensitivities
  )
  const fromInclusiveEpoch = parseOptionalTimestamp(
    authorizedQuery.timeWindow.fromInclusive,
    'timeWindow.fromInclusive'
  )
  const toExclusiveEpoch = parseOptionalTimestamp(
    authorizedQuery.timeWindow.toExclusive,
    'timeWindow.toExclusive'
  )
  const normalizedSemanticKeys = normalizedSemanticMemoryKeySet(
    authorizedQuery.semanticKeys ?? []
  )
  const queryTokens = lexicalMemoryTokens(authorizedQuery.queryText)
  const repositoryResult =
    await dependencies.repository.searchAuthorized(repositorySearch)

  await resolveMemoryAuthorization(
    authorizedQuery,
    dependencies.authorizationResolver,
    authorizationClock
  )
  assertRepositorySearchResult(repositoryResult, repositorySearch)

  const repositoryRecords = [...repositoryResult.records]
  assertRepositoryCandidateLimits(repositoryRecords, repositorySearch)
  const selectionStartedAt = monotonicClock()
  if (!Number.isFinite(selectionStartedAt)) {
    throw new RangeError('monotonic clock returned an invalid start value')
  }

  const rankedWithPossibleDuplicates = repositoryRecords
    .map((record) =>
      rankEligibleMemoryRecord(
        record,
        authorizedQuery,
        fromInclusiveEpoch,
        toExclusiveEpoch,
        normalizedSemanticKeys,
        queryTokens
      )
    )
    .filter((record): record is RankedMemoryRecord => record !== null)
    .sort(compareRankedMemoryRecords)
  const deduplicated = removeDuplicateMemoryRecords(rankedWithPossibleDuplicates)
  const ranked = deduplicated.records

  const items: RetrievedMemoryData[] = []
  const candidateDecisions: MemoryRetrievalCandidateTrace[] = [
    ...deduplicated.duplicateDecisions
  ]
  let semanticItems = 0
  let episodicItems = 0
  let totalEstimatedTokens = 0

  for (const rankedRecord of ranked) {
    const { record } = rankedRecord
    if (
      (record.kind === 'semantic' && semanticItems >= budgets.maxSemanticItems) ||
      (record.kind === 'episodic' && episodicItems >= budgets.maxEpisodicItems)
    ) {
      candidateDecisions.push(createCandidateTrace(rankedRecord, 'item-limit'))
      continue
    }

    const remainingTokens = budgets.maxTokens - totalEstimatedTokens
    const estimatedTokens = estimateRetrievedMemoryRecordTokens(rankedRecord)
    if (estimatedTokens > remainingTokens) {
      candidateDecisions.push(
        createCandidateTrace(rankedRecord, 'token-budget', estimatedTokens)
      )
      continue
    }

    const context = createRetrievedMemoryContext(record)
    const commonItem = {
      id: record.id,
      category: record.category,
      text: record.text,
      observedAt: record.observedAt,
      provenance: record.provenance,
      match: rankedRecord.match,
      lexicalScore: rankedRecord.lexicalScore,
      estimatedTokens,
      trust: 'untrusted-memory-data'
    } as const

    if (record.kind === 'semantic' && context.kind === 'semantic') {
      items.push(
        Object.freeze({
          ...commonItem,
          context,
          kind: 'semantic',
          semanticKey: record.semanticKey ?? null,
          validFrom: record.validFrom,
          validUntil: record.validUntil
        })
      )
    } else if (
      record.kind === 'episodic' &&
      record.occurredAt !== null &&
      context.kind === 'episodic' &&
      context.occurredAt !== null
    ) {
      items.push(
        Object.freeze({
          ...commonItem,
          context,
          kind: 'episodic',
          semanticKey: null,
          occurredAt: record.occurredAt,
          temporalPrecision: 'exact',
          temporalReference: null
        })
      )
    } else if (
      record.kind === 'episodic' &&
      record.occurredAt === null &&
      context.kind === 'episodic' &&
      context.occurredAt === null
    ) {
      items.push(
        Object.freeze({
          ...commonItem,
          context,
          kind: 'episodic',
          semanticKey: null,
          occurredAt: null,
          temporalPrecision: record.temporalPrecision,
          temporalReference: record.temporalReference
        })
      )
    } else {
      throw new MemoryRepositoryScopeError(
        'repository record temporal projection was inconsistent'
      )
    }
    candidateDecisions.push(
      createCandidateTrace(rankedRecord, 'selected', estimatedTokens)
    )

    totalEstimatedTokens += estimatedTokens
    semanticItems += record.kind === 'semantic' ? 1 : 0
    episodicItems += record.kind === 'episodic' ? 1 : 0
  }

  const result = Object.freeze({
    authorizationDecisionId: authorizedQuery.authorizationDecisionId,
    traceId: authorizedQuery.traceId,
    tenantId: authorizedQuery.tenantId,
    subjectId: authorizedQuery.subjectId,
    purpose: authorizedQuery.purpose,
    viewId: authorizedQuery.viewId,
    categories: authorizedQuery.categories,
    items: Object.freeze(items),
    totalEstimatedTokens,
    diagnostics: Object.freeze({
      vectorFallbackUsed: false,
      vectorCalls: 0,
      repositoryRowsReturned: repositoryRecords.length,
      rowsRejectedByDefense: repositoryRecords.length - ranked.length,
      eligibleMatches: ranked.length,
      semanticItems,
      episodicItems,
      tokenEstimatorVersion: MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION,
      effectiveBudgets: Object.freeze(budgets)
    })
  })

  const finishedAt = monotonicClock()
  if (!Number.isFinite(finishedAt) || finishedAt < selectionStartedAt) {
    throw new RangeError('monotonic clock returned an invalid end value')
  }

  await resolveMemoryAuthorization(
    authorizedQuery,
    dependencies.authorizationResolver,
    authorizationClock
  )
  await recordRetrievalTrace(
    dependencies,
    Object.freeze({
      authorizationDecisionId: authorizedQuery.authorizationDecisionId,
      candidateDecisions: Object.freeze(candidateDecisions),
      selectionElapsedMilliseconds: finishedAt - selectionStartedAt,
      policyVersion: MEMORY_RETRIEVAL_POLICY_VERSION,
      repositoryRowsReturned: repositoryRecords.length,
      selectedMemoryIds: Object.freeze(items.map(({ id }) => id)),
      tokenEstimatorVersion: MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION,
      totalEstimatedTokens,
      traceId: authorizedQuery.traceId,
      vectorCalls: 0
    }),
    observerTimeoutMilliseconds
  )
  await resolveMemoryAuthorization(
    authorizedQuery,
    dependencies.authorizationResolver,
    authorizationClock
  )

  return result
}
