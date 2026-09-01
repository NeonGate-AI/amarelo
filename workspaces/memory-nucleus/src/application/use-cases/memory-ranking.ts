import type { RepositoryMemoryRecord } from '#application/ports/memory-repository.port'
import type {
  AuthorizedMemoryQuery,
  MemoryMatchType,
  MemoryProvenance
} from '#application/contracts/memory-retrieval.contract'
import {
  cloneMemoryProvenance,
  hasBoundedSerializedSize,
  hasValidMemoryProvenance,
  isBoundedNonEmptyString,
  isNonEmptyString,
  isStringArray,
  MAX_CATEGORIES,
  MAX_RECORD_CHARACTERS
} from '#application/validation/memory-record-shape.validate'
import {
  hasValidMemoryTemporalSemantics,
  isMemoryEligibleForTimeWindow,
  parseStoredTimestamp,
  resolveMemoryTemporalSortEpoch
} from '#application/validation/memory-temporal-state.validate'

const LEXICAL_STOP_WORDS = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'com',
  'como',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'ela',
  'ele',
  'em',
  'eu',
  'foi',
  'me',
  'meu',
  'minha',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'para',
  'por',
  'que',
  'se',
  'um',
  'uma'
])

export interface RankComparableMemoryRecord {
  readonly record: { readonly id: string }
  readonly exactSemanticKey: boolean
  readonly lexicalScore: number
  readonly temporalSortEpoch: number | null
}

export interface RankedMemoryRecord extends RankComparableMemoryRecord {
  readonly record: RepositoryMemoryRecord & {
    readonly provenance: MemoryProvenance
  }
  readonly match: MemoryMatchType
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function lexicalMemoryTokens(value: string): ReadonlySet<string> {
  const normalized = normalizeSearchText(value)
  const matches = normalized.match(/[\p{L}\p{N}]+/gu) ?? []
  return new Set(
    matches.filter(
      (token) => token.length > 1 && !LEXICAL_STOP_WORDS.has(token)
    )
  )
}

export function lexicalMemoryOverlapScore(
  queryTokens: ReadonlySet<string>,
  record: RepositoryMemoryRecord
): number {
  if (queryTokens.size === 0) return 0
  const recordTokens = lexicalMemoryTokens(
    `${record.semanticKey ?? ''} ${record.text}`
  )
  let overlap = 0
  for (const token of queryTokens) if (recordTokens.has(token)) overlap += 1
  return overlap
}

export function hasExactSemanticKeyMatch(
  record: RepositoryMemoryRecord,
  normalizedSemanticKeys: ReadonlySet<string>
): boolean {
  return (
    record.kind === 'semantic' &&
    isNonEmptyString(record.semanticKey) &&
    normalizedSemanticKeys.has(normalizeSearchText(record.semanticKey))
  )
}

function compareStableIds(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function compareRankedMemoryRecords(
  left: RankComparableMemoryRecord,
  right: RankComparableMemoryRecord
): number {
  if (left.exactSemanticKey !== right.exactSemanticKey)
    return left.exactSemanticKey ? -1 : 1
  if (left.lexicalScore !== right.lexicalScore)
    return right.lexicalScore - left.lexicalScore
  if (left.temporalSortEpoch !== right.temporalSortEpoch) {
    if (left.temporalSortEpoch === null) return 1
    if (right.temporalSortEpoch === null) return -1
    return right.temporalSortEpoch - left.temporalSortEpoch
  }
  return compareStableIds(left.record.id, right.record.id)
}

export function normalizedSemanticMemoryKeySet(
  semanticKeys: readonly string[]
): ReadonlySet<string> {
  return new Set(
    semanticKeys
      .filter(isNonEmptyString)
      .map((semanticKey) => normalizeSearchText(semanticKey))
  )
}

export function rankEligibleMemoryRecord(
  record: RepositoryMemoryRecord,
  query: AuthorizedMemoryQuery,
  fromInclusiveEpoch: number | null,
  toExclusiveEpoch: number | null,
  normalizedSemanticKeys: ReadonlySet<string>,
  queryTokens: ReadonlySet<string>
): RankedMemoryRecord | null {
  if (
    !isBoundedNonEmptyString(record.id) ||
    record.tenantId !== query.tenantId ||
    record.subjectId !== query.subjectId ||
    !isStringArray(record.purposes) ||
    record.purposes.length > MAX_CATEGORIES ||
    !record.purposes.every(isBoundedNonEmptyString) ||
    !isStringArray(record.viewIds) ||
    record.viewIds.length > MAX_CATEGORIES ||
    !record.viewIds.every(isBoundedNonEmptyString) ||
    !record.purposes.includes(query.purpose) ||
    !record.viewIds.includes(query.viewId) ||
    !query.kinds.includes(record.kind) ||
    !isBoundedNonEmptyString(record.category) ||
    !query.categories.includes(record.category) ||
    (record.semanticKey !== null &&
      record.semanticKey !== undefined &&
      !isBoundedNonEmptyString(record.semanticKey)) ||
    record.lifecycle !== 'accepted' ||
    (record.supersededById !== null && record.supersededById !== undefined) ||
    !isNonEmptyString(record.text) ||
    Array.from(record.text).length > MAX_RECORD_CHARACTERS ||
    !hasBoundedSerializedSize(record) ||
    !hasValidMemoryProvenance(record.provenance) ||
    !hasValidMemoryTemporalSemantics(record)
  )
    return null

  const observedAtEpoch = parseStoredTimestamp(record.observedAt)
  if (
    observedAtEpoch === null ||
    !isMemoryEligibleForTimeWindow(
      record,
      fromInclusiveEpoch,
      toExclusiveEpoch
    )
  )
    return null

  const exactSemanticKey = hasExactSemanticKeyMatch(
    record,
    normalizedSemanticKeys
  )
  const lexicalScore = lexicalMemoryOverlapScore(queryTokens, record)
  if (!exactSemanticKey && lexicalScore === 0) return null

  return {
    record: Object.freeze({
      ...record,
      purposes: Object.freeze([...record.purposes]),
      viewIds: Object.freeze([...record.viewIds]),
      provenance: cloneMemoryProvenance(record.provenance)
    }),
    match: exactSemanticKey ? 'exact-semantic-key' : 'lexical',
    exactSemanticKey,
    lexicalScore,
    temporalSortEpoch: resolveMemoryTemporalSortEpoch(record)
  }
}
