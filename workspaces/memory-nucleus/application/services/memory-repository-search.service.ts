import type {
  AuthorizedRepositorySearch,
  ScopedMemoryRepository
} from '#application/ports/memory-repository.port'
import type {
  AuthorizedMemoryQuery,
  EffectiveMemoryRetrievalBudgets
} from '#application/contracts/memory-retrieval.contract'
import { MemoryRepositoryScopeError } from '#application/contracts/memory-retrieval.error'
import {
  hasBoundedSerializedSize,
  MAX_RECORD_CHARACTERS,
  MAX_SERIALIZED_RECORD_CHARACTERS
} from '#application/services/memory-record.validator'

const MAX_REPOSITORY_CANDIDATE_MULTIPLIER = 2

export function createAuthorizedRepositorySearch(
  query: AuthorizedMemoryQuery,
  budgets: EffectiveMemoryRetrievalBudgets,
  sensitivities: readonly ('normal' | 'sensitive' | 'highly-sensitive')[]
): AuthorizedRepositorySearch {
  return Object.freeze({
    authorizationDecisionId: query.authorizationDecisionId,
    traceId: query.traceId,
    tenantId: query.tenantId,
    subjectId: query.subjectId,
    purpose: query.purpose,
    viewId: query.viewId,
    kinds: Object.freeze([...query.kinds]),
    categories: Object.freeze([...query.categories]),
    sensitivities: Object.freeze([...sensitivities]),
    timeWindow: Object.freeze({ ...query.timeWindow }),
    queryText: query.queryText,
    semanticKeys: Object.freeze([...(query.semanticKeys ?? [])]),
    requiredLifecycle: 'accepted',
    requiredProvenance: true,
    candidateLimits: Object.freeze({
      maxRecordCharacters: MAX_RECORD_CHARACTERS,
      maxSemanticCandidates:
        budgets.maxSemanticItems * MAX_REPOSITORY_CANDIDATE_MULTIPLIER,
      maxEpisodicCandidates:
        budgets.maxEpisodicItems * MAX_REPOSITORY_CANDIDATE_MULTIPLIER,
      maxSerializedRecordCharacters: MAX_SERIALIZED_RECORD_CHARACTERS
    }),
    vectorFallback: false
  })
}

export function assertRepositorySearchResult(
  result: unknown,
  search: AuthorizedRepositorySearch
): asserts result is Awaited<
  ReturnType<ScopedMemoryRepository['searchAuthorized']>
> {
  if (
    result === null ||
    typeof result !== 'object' ||
    !('records' in result) ||
    !Array.isArray(result.records) ||
    !('diagnostics' in result) ||
    result.diagnostics === null ||
    typeof result.diagnostics !== 'object'
  ) {
    throw new MemoryRepositoryScopeError(
      'repository returned an invalid scoped-search result'
    )
  }

  if (
    !('authorizationDecisionId' in result) ||
    result.authorizationDecisionId !== search.authorizationDecisionId
  ) {
    throw new MemoryRepositoryScopeError(
      'repository did not apply the requested authorization decision'
    )
  }

  if (
    !('vectorCalls' in result.diagnostics) ||
    result.diagnostics.vectorCalls !== 0
  ) {
    throw new MemoryRepositoryScopeError(
      'repository used vector retrieval while vectorFallback was false'
    )
  }
}

export function assertRepositoryCandidateLimits(
  records: readonly { readonly kind: string; readonly text: string }[],
  search: AuthorizedRepositorySearch
): void {
  const semanticCandidates = records.filter(
    ({ kind }) => kind === 'semantic'
  ).length
  const episodicCandidates = records.filter(
    ({ kind }) => kind === 'episodic'
  ).length

  if (
    records.some(
      ({ text }) =>
        Array.from(text).length > search.candidateLimits.maxRecordCharacters
    ) ||
    records.some(
      (record) =>
        !hasBoundedSerializedSize(
          record,
          search.candidateLimits.maxSerializedRecordCharacters
        )
    ) ||
    semanticCandidates > search.candidateLimits.maxSemanticCandidates ||
    episodicCandidates > search.candidateLimits.maxEpisodicCandidates ||
    records.length >
      search.candidateLimits.maxSemanticCandidates +
        search.candidateLimits.maxEpisodicCandidates
  ) {
    throw new MemoryRepositoryScopeError(
      'repository exceeded an authorized per-kind candidate limit'
    )
  }
}
