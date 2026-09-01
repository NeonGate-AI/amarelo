import { ScopedMemoryRepository } from '#application/ports/memory-repository.port'
import type {
  AuthorizedRepositorySearch,
  RepositoryMemoryRecord,
  RepositorySearchResult
} from '#application/ports/memory-repository.port'
import { MemoryRepositoryScopeError } from '#application/contracts/memory-retrieval.error'
import {
  compareRankedMemoryRecords,
  hasExactSemanticKeyMatch,
  lexicalMemoryOverlapScore,
  lexicalMemoryTokens,
  normalizedSemanticMemoryKeySet
} from '#application/use-cases/memory-ranking'
import {
  hasValidMemoryProvenance,
  hasValidMemoryTemporalSemantics,
  hasBoundedSerializedSize,
  isBoundedNonEmptyString,
  isMemoryEligibleForTimeWindow,
  isNonEmptyString,
  isStringArray,
  MAX_CATEGORIES,
  parseOptionalTimestamp,
  parseStoredTimestamp,
  resolveMemoryTemporalSortEpoch
} from '#application/services/memory-record.validator'

/**
 * Offline/reference adapter used by evals. Production adapters should express
 * the same filters in SQL/RLS and return only rows in the authorized scope.
 */
export class InMemoryScopedMemoryRepository extends ScopedMemoryRepository {
  readonly #records: readonly RepositoryMemoryRecord[]
  #searchCalls = 0
  #vectorCalls = 0

  constructor(records: readonly RepositoryMemoryRecord[]) {
    super()
    this.#records = records
  }

  get diagnostics(): Readonly<{
    searchCalls: number
    vectorCalls: number
  }> {
    return {
      searchCalls: this.#searchCalls,
      vectorCalls: this.#vectorCalls
    }
  }

  async searchAuthorized(
    search: AuthorizedRepositorySearch
  ): Promise<RepositorySearchResult> {
    this.#searchCalls += 1

    if (!isNonEmptyString(search.authorizationDecisionId)) {
      throw new MemoryRepositoryScopeError(
        'authorizationDecisionId is required by the repository'
      )
    }

    if (
      search.requiredLifecycle !== 'accepted' ||
      search.requiredProvenance !== true ||
      search.vectorFallback !== false
    ) {
      throw new MemoryRepositoryScopeError(
        'repository searches require accepted lifecycle and no vector fallback'
      )
    }

    const fromInclusiveEpoch = parseOptionalTimestamp(
      search.timeWindow.fromInclusive,
      'timeWindow.fromInclusive'
    )
    const toExclusiveEpoch = parseOptionalTimestamp(
      search.timeWindow.toExclusive,
      'timeWindow.toExclusive'
    )
    const semanticKeys = normalizedSemanticMemoryKeySet(search.semanticKeys)
    const queryTokens = lexicalMemoryTokens(search.queryText)
    const authorizedRows = this.#records.filter((record) => {
      const observedAtEpoch = parseStoredTimestamp(record.observedAt)

      return (
        isBoundedNonEmptyString(record.id) &&
        record.tenantId === search.tenantId &&
        record.subjectId === search.subjectId &&
        isStringArray(record.purposes) &&
        record.purposes.length <= MAX_CATEGORIES &&
        record.purposes.every(isBoundedNonEmptyString) &&
        isStringArray(record.viewIds) &&
        record.viewIds.length <= MAX_CATEGORIES &&
        record.viewIds.every(isBoundedNonEmptyString) &&
        record.purposes.includes(search.purpose) &&
        record.viewIds.includes(search.viewId) &&
        search.kinds.includes(record.kind) &&
        isBoundedNonEmptyString(record.category) &&
        search.categories.includes(record.category) &&
        search.sensitivities.includes(record.sensitivity ?? 'normal') &&
        (record.semanticKey === null ||
          record.semanticKey === undefined ||
          isBoundedNonEmptyString(record.semanticKey)) &&
        record.lifecycle === 'accepted' &&
        hasValidMemoryProvenance(record.provenance) &&
        hasValidMemoryTemporalSemantics(record) &&
        (record.supersededById === null ||
          record.supersededById === undefined) &&
        isNonEmptyString(record.text) &&
        Array.from(record.text).length <=
          search.candidateLimits.maxRecordCharacters &&
        hasBoundedSerializedSize(
          record,
          search.candidateLimits.maxSerializedRecordCharacters
        ) &&
        observedAtEpoch !== null &&
        isMemoryEligibleForTimeWindow(
          record,
          fromInclusiveEpoch,
          toExclusiveEpoch
        )
      )
    })
    const rankedMatches = authorizedRows
      .map((record) => {
        const exactSemanticKey = hasExactSemanticKeyMatch(record, semanticKeys)
        const lexicalScore = lexicalMemoryOverlapScore(queryTokens, record)

        if (!exactSemanticKey && lexicalScore === 0) {
          return null
        }

        return {
          record,
          exactSemanticKey,
          lexicalScore,
          temporalSortEpoch: resolveMemoryTemporalSortEpoch(record)
        }
      })
      .filter(
        (
          record
        ): record is {
          readonly record: RepositoryMemoryRecord
          readonly exactSemanticKey: boolean
          readonly lexicalScore: number
          readonly temporalSortEpoch: number | null
        } => record !== null
      )
      .sort(compareRankedMemoryRecords)
    const matchedRows = [
      ...rankedMatches
        .filter(({ record }) => record.kind === 'semantic')
        .slice(0, search.candidateLimits.maxSemanticCandidates),
      ...rankedMatches
        .filter(({ record }) => record.kind === 'episodic')
        .slice(0, search.candidateLimits.maxEpisodicCandidates)
    ]
      .sort(compareRankedMemoryRecords)
      .map(({ record }) => record)

    return {
      authorizationDecisionId: search.authorizationDecisionId,
      records: matchedRows,
      diagnostics: {
        authorizedRowsConsidered: authorizedRows.length,
        matchedRows: matchedRows.length,
        vectorCalls: this.#vectorCalls
      }
    }
  }
}
