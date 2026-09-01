import type {
  AuthorizedMemoryQuery,
  EffectiveMemoryRetrievalBudgets,
  MemoryRetrievalBudgets
} from '#application/contracts/memory-retrieval.contract'
import { DEFAULT_MEMORY_RETRIEVAL_BUDGETS } from '#application/contracts/memory-retrieval.contract'
import { InvalidAuthorizedMemoryQueryError } from '#application/contracts/memory-retrieval.error'
import {
  isBoundedNonEmptyString,
  isNonEmptyString,
  isStringArray,
  MAX_CATEGORIES,
  MAX_IDENTIFIER_CHARACTERS
} from '#application/validation/memory-record-shape.validate'
import { parseOptionalTimestamp } from '#application/validation/memory-temporal-state.validate'

const MAX_QUERY_CHARACTERS = 4_000
const MAX_SEMANTIC_KEYS = 64

function clampRequestedBudget(
  requested: number | undefined,
  hardCap: number,
  fieldName: string
): number {
  if (requested === undefined) return hardCap

  if (!Number.isFinite(requested) || requested < 0) {
    throw new InvalidAuthorizedMemoryQueryError(
      `${fieldName} must be a finite non-negative number`
    )
  }

  return Math.min(Math.floor(requested), hardCap)
}

export function resolveEffectiveMemoryRetrievalBudgets(
  budgets: MemoryRetrievalBudgets
): EffectiveMemoryRetrievalBudgets {
  return {
    maxTokens: clampRequestedBudget(
      budgets.maxTokens,
      DEFAULT_MEMORY_RETRIEVAL_BUDGETS.maxTokens,
      'budgets.maxTokens'
    ),
    maxSemanticItems: clampRequestedBudget(
      budgets.maxSemanticItems,
      DEFAULT_MEMORY_RETRIEVAL_BUDGETS.maxSemanticItems,
      'budgets.maxSemanticItems'
    ),
    maxEpisodicItems: clampRequestedBudget(
      budgets.maxEpisodicItems,
      DEFAULT_MEMORY_RETRIEVAL_BUDGETS.maxEpisodicItems,
      'budgets.maxEpisodicItems'
    )
  }
}

export function assertAuthorizedMemoryQuery(
  query: AuthorizedMemoryQuery
): void {
  const requiredStrings: ReadonlyArray<readonly [string, string]> = [
    ['authorizationDecisionId', query.authorizationDecisionId],
    ['traceId', query.traceId],
    ['tenantId', query.tenantId],
    ['subjectId', query.subjectId],
    ['purpose', query.purpose],
    ['viewId', query.viewId]
  ]

  for (const [fieldName, value] of requiredStrings) {
    if (!isBoundedNonEmptyString(value)) {
      throw new InvalidAuthorizedMemoryQueryError(
        `${fieldName} must be a canonical ASCII identifier of at most ${MAX_IDENTIFIER_CHARACTERS} characters`
      )
    }
  }

  if (query.vectorFallback !== false) {
    throw new InvalidAuthorizedMemoryQueryError(
      'vectorFallback must be explicitly false'
    )
  }

  if (!Array.isArray(query.kinds) || query.kinds.length === 0) {
    throw new InvalidAuthorizedMemoryQueryError(
      'kinds must contain at least one memory kind'
    )
  }

  if (query.kinds.some((kind) => kind !== 'semantic' && kind !== 'episodic')) {
    throw new InvalidAuthorizedMemoryQueryError(
      'kinds contains an unsupported memory kind'
    )
  }

  if (new Set(query.kinds).size !== query.kinds.length) {
    throw new InvalidAuthorizedMemoryQueryError(
      'kinds must not contain duplicates'
    )
  }

  if (
    !isStringArray(query.categories) ||
    query.categories.length === 0 ||
    query.categories.length > MAX_CATEGORIES ||
    query.categories.some((category) => !isBoundedNonEmptyString(category))
  ) {
    throw new InvalidAuthorizedMemoryQueryError(
      `categories must contain 1-${MAX_CATEGORIES} canonical category IDs`
    )
  }

  if (new Set(query.categories).size !== query.categories.length) {
    throw new InvalidAuthorizedMemoryQueryError(
      'categories must not contain duplicates'
    )
  }

  if (query.budgets === null || typeof query.budgets !== 'object') {
    throw new InvalidAuthorizedMemoryQueryError('budgets is required')
  }

  if (
    query.timeWindow === null ||
    typeof query.timeWindow !== 'object' ||
    !('fromInclusive' in query.timeWindow) ||
    !('toExclusive' in query.timeWindow)
  ) {
    throw new InvalidAuthorizedMemoryQueryError('timeWindow is required')
  }

  if (
    typeof query.queryText !== 'string' ||
    Array.from(query.queryText).length > MAX_QUERY_CHARACTERS
  ) {
    throw new InvalidAuthorizedMemoryQueryError(
      `queryText must be a string of at most ${MAX_QUERY_CHARACTERS} characters`
    )
  }

  if (
    query.semanticKeys !== undefined &&
    (!isStringArray(query.semanticKeys) ||
      query.semanticKeys.length > MAX_SEMANTIC_KEYS ||
      query.semanticKeys.some(
        (semanticKey) => !isBoundedNonEmptyString(semanticKey)
      ))
  ) {
    throw new InvalidAuthorizedMemoryQueryError(
      `semanticKeys must contain at most ${MAX_SEMANTIC_KEYS} canonical keys`
    )
  }

  const fromInclusiveEpoch = parseOptionalTimestamp(
    query.timeWindow.fromInclusive,
    'timeWindow.fromInclusive'
  )
  const toExclusiveEpoch = parseOptionalTimestamp(
    query.timeWindow.toExclusive,
    'timeWindow.toExclusive'
  )

  if (
    fromInclusiveEpoch !== null &&
    toExclusiveEpoch !== null &&
    fromInclusiveEpoch >= toExclusiveEpoch
  ) {
    throw new InvalidAuthorizedMemoryQueryError(
      'timeWindow.fromInclusive must precede timeWindow.toExclusive'
    )
  }

  const semanticKeys = query.semanticKeys ?? []
  if (
    !isNonEmptyString(query.queryText) &&
    !semanticKeys.some(isNonEmptyString)
  ) {
    throw new InvalidAuthorizedMemoryQueryError(
      'queryText or at least one semantic key is required'
    )
  }

  resolveEffectiveMemoryRetrievalBudgets(query.budgets)
}

export function snapshotAuthorizedMemoryQuery(
  query: AuthorizedMemoryQuery
): AuthorizedMemoryQuery {
  return Object.freeze({
    ...query,
    kinds: Object.freeze([...query.kinds]),
    categories: Object.freeze([...query.categories]),
    timeWindow: Object.freeze({ ...query.timeWindow }),
    budgets: Object.freeze({ ...query.budgets }),
    semanticKeys:
      query.semanticKeys === undefined
        ? undefined
        : Object.freeze([...query.semanticKeys])
  })
}
