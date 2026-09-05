import assert from 'node:assert/strict'

import {
  MAX_MEMORY_SEARCH_TOKENS,
  MEMORY_SEARCH_TOKEN_ESTIMATOR_VERSION,
  MemoryDeletionReceiptSchema,
  MemorySearchInputSchema,
  MemorySearchResultSchema,
  createMemorySearchContextProjection,
  estimateMemorySearchContextTokens,
  type MemoryRecord
} from '@memory-sdk'

const input = MemorySearchInputSchema.parse({
  asOf: '2026-09-01T00:00:00.000Z',
  purpose: 'conversation.personalization',
  query: 'preferred response style',
  tokenBudget: Math.min(400, MAX_MEMORY_SEARCH_TOKENS)
})
assert.equal(input.tokenBudget <= MAX_MEMORY_SEARCH_TOKENS, true)

const observedAt = '2026-09-01T00:00:00.000Z'
const record: MemoryRecord = {
  id: '00000000-0000-4000-8000-000000000001',
  kind: 'semantic',
  category: 'preference',
  statement: 'Prefers concise answers.',
  confidence: 0.95,
  uncertainty: null,
  observedAt,
  semanticKey: 'response.style',
  validFrom: null,
  validUntil: null,
  occurredAt: null,
  temporalPrecision: null,
  temporalReference: null,
  purposeIds: [input.purpose],
  provenance: {
    actorType: 'user',
    authorId: 'user-fixture',
    observedAt,
    sourceArtifactIds: ['turn-fixture'],
    sourceType: 'explicit_user',
    transformation: null
  },
  createdAt: observedAt,
  updatedAt: observedAt,
  version: 1,
  state: 'active'
}
const projection = createMemorySearchContextProjection({
  memory: record,
  trust: 'untrusted-memory-data'
})
assert.equal(estimateMemorySearchContextTokens(projection) > 0, true)
assert.equal(projection.trust, 'untrusted-memory-data')
assert.equal(projection.memory.kind, 'semantic')
// A stop-serving acknowledgement must not invent a physical-purge deadline.
const suppressionReceipt = {
  memoryId: record.id,
  receiptId: 'suppression-fixture-001',
  requestedAt: observedAt,
  tombstonedAt: observedAt,
  purgeBy: null,
  purgeStatus: 'suppression-only'
}
assert.equal(
  MemoryDeletionReceiptSchema.safeParse(suppressionReceipt).success,
  true
)
assert.equal(
  MemoryDeletionReceiptSchema.safeParse({
    ...suppressionReceipt,
    purgeBy: '2026-10-01T00:00:00.000Z'
  }).success,
  false
)

const emptySearch = {
  asOf: observedAt,
  diagnostics: {
    candidateItems: 0,
    eligibleItems: 0,
    modelCalls: 0,
    omittedByBudget: 0,
    omittedByLimit: 0,
    omittedByPolicy: 0,
    rerankerUsed: false,
    returnedItems: 0,
    vectorCalls: 0,
    vectorSearchUsed: false,
    webCalls: 0
  },
  governance: {
    authorizationDecisionId: 'decision-fixture',
    consentVersion: 1,
    purpose: input.purpose,
    viewId: 'personal'
  },
  items: [],
  policyVersion: 'memory-retrieval-v1',
  requestId: 'request-fixture',
  tokenBudget: {
    effectiveTokens: 400,
    estimatorVersion: MEMORY_SEARCH_TOKEN_ESTIMATOR_VERSION,
    remainingTokens: 400,
    requestedTokens: 400,
    truncated: false,
    usedTokens: 0
  }
}
// Historical fixtures remain readable; missing instrumentation does not become zero.
assert.equal(MemorySearchResultSchema.safeParse(emptySearch).success, true)
const searchWithFullText = (
  fullTextCalls: unknown,
  fullTextSearchUsed: unknown
) => ({
  ...emptySearch,
  diagnostics: { ...emptySearch.diagnostics, fullTextCalls, fullTextSearchUsed }
})
assert.equal(
  MemorySearchResultSchema.safeParse(searchWithFullText(2, true)).success,
  true,
  'a zero-hit search must retain its two actual full-text index calls'
)
assert.equal(
  MemorySearchResultSchema.safeParse(searchWithFullText(0, false)).success,
  true
)
assert.equal(
  MemorySearchResultSchema.safeParse(searchWithFullText(null, null)).success,
  true
)
for (const [calls, used] of [
  [2, false],
  [0, true],
  [-1, false],
  [1.5, true],
  [null, false],
  [undefined, true]
]) {
  assert.equal(
    MemorySearchResultSchema.safeParse(searchWithFullText(calls, used)).success,
    false
  )
}
console.log('memory-sdk eval PASS')
