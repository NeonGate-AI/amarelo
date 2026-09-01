import type {
  MemoryAuthorizationDecision,
  MemoryAuthorizationDecisionResolver,
  ResolvedMemoryAuthorization
} from '#application/ports/memory-authorization.port'
import type {
  AuthorizedMemoryQuery,
  MemoryTimeWindow
} from '#application/contracts/memory-retrieval.contract'
import { MemoryAuthorizationDecisionError } from '#application/contracts/memory-retrieval.error'
import {
  isBoundedNonEmptyString,
  isStringArray,
  MAX_CATEGORIES,
  parseOptionalTimestamp,
  parseStoredTimestamp
} from '#application/services/memory-record.validator'
import { snapshotAuthorizedMemoryQuery } from '#application/services/memory-query.validator'

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

function isValidDecisionScope(
  decision: unknown
): decision is MemoryAuthorizationDecision {
  if (decision === null || typeof decision !== 'object') {
    return false
  }

  return (
    'id' in decision &&
    isBoundedNonEmptyString(decision.id) &&
    'status' in decision &&
    (decision.status === 'active' || decision.status === 'revoked') &&
    'expiresAt' in decision &&
    parseStoredTimestamp(decision.expiresAt) !== null &&
    'tenantId' in decision &&
    isBoundedNonEmptyString(decision.tenantId) &&
    'subjectId' in decision &&
    isBoundedNonEmptyString(decision.subjectId) &&
    'purpose' in decision &&
    isBoundedNonEmptyString(decision.purpose) &&
    'viewId' in decision &&
    isBoundedNonEmptyString(decision.viewId) &&
    'kinds' in decision &&
    Array.isArray(decision.kinds) &&
    decision.kinds.length > 0 &&
    decision.kinds.every(
      (kind) => kind === 'semantic' || kind === 'episodic'
    ) &&
    hasUniqueValues(decision.kinds) &&
    'categories' in decision &&
    isStringArray(decision.categories) &&
    decision.categories.length > 0 &&
    decision.categories.length <= MAX_CATEGORIES &&
    decision.categories.every(isBoundedNonEmptyString) &&
    hasUniqueValues(decision.categories) &&
    'sensitivities' in decision &&
    Array.isArray(decision.sensitivities) &&
    decision.sensitivities.length > 0 &&
    decision.sensitivities.length <= 3 &&
    decision.sensitivities.every(
      (value) =>
        value === 'normal' ||
        value === 'sensitive' ||
        value === 'highly-sensitive'
    ) &&
    hasUniqueValues(decision.sensitivities) &&
    'timeWindow' in decision &&
    decision.timeWindow !== null &&
    typeof decision.timeWindow === 'object' &&
    'fromInclusive' in decision.timeWindow &&
    'toExclusive' in decision.timeWindow
  )
}

function parseDecisionTimeWindow(
  timeWindow: MemoryTimeWindow
): readonly [number | null, number | null] {
  try {
    const fromInclusive = parseOptionalTimestamp(
      timeWindow.fromInclusive,
      'authorization.timeWindow.fromInclusive'
    )
    const toExclusive = parseOptionalTimestamp(
      timeWindow.toExclusive,
      'authorization.timeWindow.toExclusive'
    )

    if (
      fromInclusive !== null &&
      toExclusive !== null &&
      fromInclusive >= toExclusive
    ) {
      throw new Error('invalid authorization time window')
    }

    return [fromInclusive, toExclusive]
  } catch {
    throw new MemoryAuthorizationDecisionError(
      'invalid-decision',
      'authorization decision contains an invalid time window'
    )
  }
}

function isQueryWindowContained(
  query: MemoryTimeWindow,
  decision: MemoryTimeWindow
): boolean {
  const [queryFrom, queryTo] = parseDecisionTimeWindow(query)
  const [decisionFrom, decisionTo] = parseDecisionTimeWindow(decision)

  return (
    (decisionFrom === null ||
      (queryFrom !== null && queryFrom >= decisionFrom)) &&
    (decisionTo === null || (queryTo !== null && queryTo <= decisionTo))
  )
}

function isSubset<Value>(
  requested: readonly Value[],
  permitted: readonly Value[]
): boolean {
  const permittedValues = new Set(permitted)
  return requested.every((value) => permittedValues.has(value))
}

function assertDecisionMatchesQuery(
  decision: MemoryAuthorizationDecision,
  query: AuthorizedMemoryQuery
): void {
  const fixedScopeMatches =
    decision.id === query.authorizationDecisionId &&
    decision.tenantId === query.tenantId &&
    decision.subjectId === query.subjectId &&
    decision.purpose === query.purpose &&
    decision.viewId === query.viewId
  const boundedScopeMatches =
    isSubset(query.kinds, decision.kinds) &&
    isSubset(query.categories, decision.categories) &&
    isQueryWindowContained(query.timeWindow, decision.timeWindow)

  if (!fixedScopeMatches || !boundedScopeMatches) {
    throw new MemoryAuthorizationDecisionError(
      'scope-mismatch',
      'authorization decision does not permit the requested memory scope'
    )
  }
}

function snapshotAuthorizationDecision(
  decision: MemoryAuthorizationDecision
): MemoryAuthorizationDecision {
  return Object.freeze({
    ...decision,
    kinds: Object.freeze([...decision.kinds]),
    categories: Object.freeze([...decision.categories]),
    sensitivities: Object.freeze([...decision.sensitivities]),
    timeWindow: Object.freeze({ ...decision.timeWindow })
  })
}

/** Resolve and validate authorization before any memory repository access. */
export async function resolveMemoryAuthorization(
  query: AuthorizedMemoryQuery,
  resolver: MemoryAuthorizationDecisionResolver,
  clock: () => Date
): Promise<ResolvedMemoryAuthorization> {
  const decision = await resolver.resolve(query.authorizationDecisionId)

  if (decision === null) {
    throw new MemoryAuthorizationDecisionError(
      'unknown-decision',
      'authorization decision is unavailable'
    )
  }

  if (!isValidDecisionScope(decision)) {
    throw new MemoryAuthorizationDecisionError(
      'invalid-decision',
      'authorization decision is malformed'
    )
  }

  if (decision.status === 'revoked') {
    throw new MemoryAuthorizationDecisionError(
      'revoked-decision',
      'authorization decision is revoked'
    )
  }

  const now = clock()

  const nowEpoch = now.getTime()

  if (!Number.isFinite(nowEpoch)) {
    throw new MemoryAuthorizationDecisionError(
      'invalid-clock',
      'authorization clock returned an invalid instant'
    )
  }

  const expiresAtEpoch = parseStoredTimestamp(decision.expiresAt)

  if (expiresAtEpoch === null || expiresAtEpoch <= nowEpoch) {
    throw new MemoryAuthorizationDecisionError(
      'expired-decision',
      'authorization decision is expired'
    )
  }

  assertDecisionMatchesQuery(decision, query)

  return Object.freeze({
    decision: snapshotAuthorizationDecision(decision),
    query: snapshotAuthorizedMemoryQuery(query)
  })
}
