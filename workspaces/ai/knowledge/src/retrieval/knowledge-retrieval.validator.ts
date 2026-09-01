import type {
  KnowledgeRepositorySearch,
  KnowledgeRepositorySearchResult,
  RepositoryKnowledgeChunk
} from './knowledge-repository.contract.ts'
import type {
  KnowledgeRetrievalQuery,
  KnowledgeSourceType
} from './knowledge-retrieval.contract.ts'
import {
  MAX_KNOWLEDGE_DOCS,
  MAX_KNOWLEDGE_TOKENS
} from './knowledge-retrieval.contract.ts'
import {
  InvalidKnowledgeRetrievalQueryError,
  KnowledgeRepositoryScopeError
} from './knowledge-retrieval.error.ts'

export const KNOWLEDGE_CANDIDATE_MULTIPLIER = 4
export const MAX_KNOWLEDGE_CANDIDATES =
  MAX_KNOWLEDGE_DOCS * KNOWLEDGE_CANDIDATE_MULTIPLIER

const MAX_QUERY_CHARACTERS = 4_000
const MAX_SCOPE_VALUES = 16
const MAX_IDENTIFIER_CHARACTERS = 256
const MAX_CANONICAL_URL_CHARACTERS = 2_000
const MAX_CITATION_CHARACTERS = 4_000
const MAX_CHUNK_CHARACTERS = 100_000
const KNOWLEDGE_RETRIEVAL_QUERY_KEYS = new Set<PropertyKey>([
  'asOf',
  'corpusVersion',
  'jurisdiction',
  'maxDocs',
  'maxTokens',
  'purposeCode',
  'queryText',
  'sourceTypes',
  'topicIds',
  'vectorFallback'
])
const UTC_ISO_8601_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u
const SHA_256_HEX = /^[a-f\d]{64}$/iu

export interface KnowledgeChunkRecency {
  readonly publishedAtEpoch: number
  readonly effectiveFromEpoch: number
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isBoundedKnowledgeIdentifier(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    Array.from(value).length <= MAX_IDENTIFIER_CHARACTERS
  )
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function isBoundedKnowledgeIdentifierArray(
  value: unknown
): value is readonly string[] {
  return (
    isStringArray(value) &&
    value.length > 0 &&
    value.length <= MAX_SCOPE_VALUES &&
    value.every(isBoundedKnowledgeIdentifier) &&
    new Set(value).size === value.length
  )
}

function normalizedUtcTimestamp(value: string, epoch: number): string {
  const iso = new Date(epoch).toISOString()
  const fractionalMatch = value.match(/\.(\d{1,3})Z$/u)

  if (fractionalMatch === null) {
    return iso.replace('.000Z', 'Z')
  }

  const requestedDigits = fractionalMatch[1]?.length ?? 0
  return iso.replace(/\.(\d{3})Z$/u, (_, milliseconds: string) => {
    return `.${milliseconds.slice(0, requestedDigits)}Z`
  })
}

function parseStoredTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || !UTC_ISO_8601_TIMESTAMP.test(value)) {
    return null
  }

  const epoch = Date.parse(value)

  if (
    !Number.isFinite(epoch) ||
    normalizedUtcTimestamp(value, epoch) !== value
  ) {
    return null
  }

  return epoch
}

export function parseKnowledgeQueryTimestamp(
  value: string,
  fieldName: string
): number {
  const epoch = parseStoredTimestamp(value)

  if (epoch === null) {
    throw new InvalidKnowledgeRetrievalQueryError(
      `${fieldName} must be a canonical UTC ISO-8601 timestamp`
    )
  }

  return epoch
}

function isCanonicalHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && isNonEmptyString(parsed.hostname)
  } catch {
    return false
  }
}

function hasRequiredProvenance(record: RepositoryKnowledgeChunk): boolean {
  return (
    isBoundedKnowledgeIdentifier(record.corpusVersion) &&
    isBoundedKnowledgeIdentifier(record.documentId) &&
    isBoundedKnowledgeIdentifier(record.versionId) &&
    isBoundedKnowledgeIdentifier(record.chunkId) &&
    isBoundedKnowledgeIdentifier(record.publisher) &&
    isNonEmptyString(record.canonicalUrl) &&
    Array.from(record.canonicalUrl).length <= MAX_CANONICAL_URL_CHARACTERS &&
    isCanonicalHttpsUrl(record.canonicalUrl) &&
    isNonEmptyString(record.citation) &&
    Array.from(record.citation).length <= MAX_CITATION_CHARACTERS &&
    SHA_256_HEX.test(record.contentHash)
  )
}

function isSupportedSourceType(value: unknown): value is KnowledgeSourceType {
  return value === 'scientific' || value === 'regulatory'
}

function assertExactQueryShape(query: KnowledgeRetrievalQuery): void {
  const candidate: unknown = query

  if (
    candidate === null ||
    typeof candidate !== 'object' ||
    Array.isArray(candidate) ||
    (Object.getPrototypeOf(candidate) !== Object.prototype &&
      Object.getPrototypeOf(candidate) !== null)
  ) {
    throw new InvalidKnowledgeRetrievalQueryError(
      'knowledge retrieval query must be a plain object'
    )
  }

  const keys = Reflect.ownKeys(candidate)
  const hasExactKeys =
    keys.length === KNOWLEDGE_RETRIEVAL_QUERY_KEYS.size &&
    keys.every((key) => KNOWLEDGE_RETRIEVAL_QUERY_KEYS.has(key))

  if (!hasExactKeys) {
    throw new InvalidKnowledgeRetrievalQueryError(
      'knowledge retrieval query contains unknown or missing properties'
    )
  }
}

export function assertKnowledgeRetrievalQuery(
  query: KnowledgeRetrievalQuery
): number {
  assertExactQueryShape(query)

  for (const [fieldName, value] of [
    ['corpusVersion', query.corpusVersion],
    ['purposeCode', query.purposeCode],
    ['jurisdiction', query.jurisdiction]
  ] as const) {
    if (!isBoundedKnowledgeIdentifier(value)) {
      throw new InvalidKnowledgeRetrievalQueryError(
        `${fieldName} is required and must be at most ${MAX_IDENTIFIER_CHARACTERS} characters`
      )
    }
  }

  if (
    !isNonEmptyString(query.queryText) ||
    Array.from(query.queryText).length > MAX_QUERY_CHARACTERS
  ) {
    throw new InvalidKnowledgeRetrievalQueryError(
      `queryText is required and must be at most ${MAX_QUERY_CHARACTERS} characters`
    )
  }

  if (!isBoundedKnowledgeIdentifierArray(query.topicIds)) {
    throw new InvalidKnowledgeRetrievalQueryError(
      'topicIds must contain unique, bounded topic identifiers'
    )
  }

  if (
    !Array.isArray(query.sourceTypes) ||
    query.sourceTypes.length === 0 ||
    query.sourceTypes.length > MAX_SCOPE_VALUES ||
    query.sourceTypes.some(
      (sourceType) => !isSupportedSourceType(sourceType)
    ) ||
    new Set(query.sourceTypes).size !== query.sourceTypes.length
  ) {
    throw new InvalidKnowledgeRetrievalQueryError(
      'sourceTypes must contain unique supported source types'
    )
  }

  if (query.vectorFallback !== false) {
    throw new InvalidKnowledgeRetrievalQueryError(
      'vectorFallback must be explicitly false'
    )
  }

  if (!Number.isSafeInteger(query.maxDocs) || query.maxDocs < 0) {
    throw new InvalidKnowledgeRetrievalQueryError(
      'maxDocs must be a non-negative safe integer'
    )
  }

  if (!Number.isSafeInteger(query.maxTokens) || query.maxTokens < 0) {
    throw new InvalidKnowledgeRetrievalQueryError(
      'maxTokens must be a non-negative safe integer'
    )
  }

  return parseKnowledgeQueryTimestamp(query.asOf, 'asOf')
}

export function snapshotKnowledgeQuery(
  query: KnowledgeRetrievalQuery
): KnowledgeRetrievalQuery {
  return Object.freeze({
    ...query,
    sourceTypes: Object.freeze([...query.sourceTypes]),
    topicIds: Object.freeze([...query.topicIds])
  })
}

export function knowledgeChunkRecency(
  record: RepositoryKnowledgeChunk,
  query: KnowledgeRetrievalQuery,
  asOfEpoch: number
): KnowledgeChunkRecency | null {
  const publishedAtEpoch = parseStoredTimestamp(record.publishedAt)
  const effectiveFromEpoch = parseStoredTimestamp(record.effectiveFrom)
  const effectiveToEpoch =
    record.effectiveToExclusive === null
      ? null
      : parseStoredTimestamp(record.effectiveToExclusive)

  // Current safety overrides historical applicability.
  if (
    publishedAtEpoch === null ||
    effectiveFromEpoch === null ||
    (record.effectiveToExclusive !== null && effectiveToEpoch === null) ||
    (effectiveToEpoch !== null && effectiveFromEpoch >= effectiveToEpoch) ||
    publishedAtEpoch > asOfEpoch ||
    effectiveFromEpoch > asOfEpoch ||
    (effectiveToEpoch !== null && asOfEpoch >= effectiveToEpoch) ||
    record.verificationStatus !== 'verified' ||
    (record.retractedAt !== null && record.retractedAt !== undefined) ||
    (record.supersededBy !== null && record.supersededBy !== undefined) ||
    record.corpusVersion !== query.corpusVersion ||
    !isBoundedKnowledgeIdentifierArray(record.topicIds) ||
    !query.topicIds.every((topicId) => record.topicIds.includes(topicId)) ||
    !isStringArray(record.purposeCodes) ||
    record.purposeCodes.length === 0 ||
    record.purposeCodes.length > MAX_SCOPE_VALUES ||
    !record.purposeCodes.every(isBoundedKnowledgeIdentifier) ||
    !record.purposeCodes.includes(query.purposeCode) ||
    !isStringArray(record.jurisdictions) ||
    record.jurisdictions.length === 0 ||
    record.jurisdictions.length > MAX_SCOPE_VALUES ||
    !record.jurisdictions.every(isBoundedKnowledgeIdentifier) ||
    !record.jurisdictions.includes(query.jurisdiction) ||
    !query.sourceTypes.includes(record.sourceType) ||
    !hasRequiredProvenance(record) ||
    !isNonEmptyString(record.text) ||
    Array.from(record.text).length > MAX_CHUNK_CHARACTERS
  ) {
    return null
  }

  return { publishedAtEpoch, effectiveFromEpoch }
}

export function assertKnowledgeRepositorySearch(
  search: KnowledgeRepositorySearch
): number {
  if (
    search.requiredVerificationStatus !== 'verified' ||
    search.requireCitation !== true ||
    search.requireProvenance !== true ||
    search.excludeRetracted !== true ||
    search.excludeSuperseded !== true ||
    search.distinctDocuments !== true ||
    !isBoundedKnowledgeIdentifier(search.corpusVersion) ||
    !isBoundedKnowledgeIdentifierArray(search.topicIds) ||
    !Number.isSafeInteger(search.maxChunkTokens) ||
    search.maxChunkTokens < 0 ||
    search.maxChunkTokens > MAX_KNOWLEDGE_TOKENS ||
    !Number.isSafeInteger(search.candidateLimit) ||
    search.candidateLimit <= 0 ||
    search.candidateLimit > MAX_KNOWLEDGE_CANDIDATES ||
    search.vectorFallback !== false
  ) {
    throw new KnowledgeRepositoryScopeError(
      'repository search is missing mandatory knowledge safeguards'
    )
  }

  return parseKnowledgeQueryTimestamp(search.asOf, 'asOf')
}

export function validateKnowledgeRepositoryResult(
  result: KnowledgeRepositorySearchResult,
  candidateLimit: number,
  expectedCorpusVersion: string
): readonly RepositoryKnowledgeChunk[] {
  if (
    result === null ||
    typeof result !== 'object' ||
    !Array.isArray(result.records) ||
    result.diagnostics === null ||
    typeof result.diagnostics !== 'object'
  ) {
    throw new KnowledgeRepositoryScopeError(
      'repository returned an invalid scoped-search result'
    )
  }

  if (result.corpusVersion !== expectedCorpusVersion) {
    throw new KnowledgeRepositoryScopeError(
      'repository returned a different corpus snapshot'
    )
  }

  if (
    result.diagnostics.vectorCalls !== 0 ||
    result.diagnostics.modelCalls !== 0 ||
    result.diagnostics.webCalls !== 0
  ) {
    throw new KnowledgeRepositoryScopeError(
      'knowledge retrieval forbids vector, model, and web calls'
    )
  }

  if (result.records.length > candidateLimit) {
    throw new KnowledgeRepositoryScopeError(
      'repository exceeded the authorized candidate limit'
    )
  }

  return [...result.records]
}
