import {
  estimateMemorySearchItemTokens,
  MEMORY_SEARCH_TOKEN_ESTIMATOR_VERSION,
  MemoryRecordSchema,
  MemorySearchResultSchema,
  type MemoryRecord,
  type MemorySearchInput,
  type MemorySearchResult
} from '@repo/memory-sdk'
import type {
  AuthorizedMemoryRetrievalResult,
  MemoryRequestScope
} from '@application/contracts'
import type {
  MemoryRetrievalTrace,
  OperationalMemorySearch
} from '@application/ports'
import { MEMORY_RETRIEVAL_POLICY_VERSION } from '@application/ports'
import { OperationalMemoryError } from './operational-memory.error'

interface OperationalMemorySearchMapping {
  readonly input: MemorySearchInput
  readonly scope: MemoryRequestScope
  readonly authorization: OperationalMemorySearch
  readonly result: AuthorizedMemoryRetrievalResult
  readonly trace: MemoryRetrievalTrace
  readonly records: readonly MemoryRecord[]
}

/** Re-budget the public SDK projection without replacing authorized retrieval policy. */
export function mapOperationalMemorySearch(
  options: OperationalMemorySearchMapping
): MemorySearchResult {
  const { authorization, input, records, result, scope, trace } = options
  const byId = new Map(records.map((record) => [record.id, record]))
  let omittedByBudget = trace.candidateDecisions.filter(
    ({ decision }) => decision === 'token-budget'
  ).length
  let omittedByLimit = trace.candidateDecisions.filter(
    ({ decision }) => decision === 'item-limit'
  ).length
  let usedTokens = 0
  const items = []
  const effectiveTokens = Math.min(
    input.tokenBudget,
    result.diagnostics.effectiveBudgets.maxTokens
  )

  for (const selected of result.items) {
    const memory = MemoryRecordSchema.parse(byId.get(selected.id))
    if (
      memory.state !== 'active' ||
      memory.kind !== selected.kind ||
      memory.category !== selected.category ||
      memory.statement !== selected.text ||
      memory.purposeIds[0] !== scope.purpose ||
      memory.provenance.authorId !== selected.provenance.authorId ||
      Date.parse(memory.observedAt) !== Date.parse(selected.observedAt) ||
      memory.provenance.sourceArtifactIds.length !==
        selected.provenance.sourceArtifactIds.length ||
      memory.provenance.sourceArtifactIds.some(
        (id) => !selected.provenance.sourceArtifactIds.includes(id)
      )
    ) {
      throw new OperationalMemoryError('invalid-result')
    }
    if (items.length >= (input.maxItems ?? 11)) {
      omittedByLimit += 1
      continue
    }
    const estimatedTokens = estimateMemorySearchItemTokens({
      memory,
      trust: 'untrusted-memory-data'
    })
    if (usedTokens + estimatedTokens > effectiveTokens) {
      omittedByBudget += 1
      continue
    }
    const lexical = selected.lexicalScore / (1 + selected.lexicalScore)
    items.push({
      estimatedTokens,
      memory,
      score: {
        lexical,
        total: selected.match === 'exact-semantic-key' ? 1 : lexical
      },
      trust: 'untrusted-memory-data' as const
    })
    usedTokens += estimatedTokens
  }

  return MemorySearchResultSchema.parse({
    asOf: input.asOf,
    diagnostics: {
      candidateItems: result.diagnostics.repositoryRowsReturned,
      eligibleItems: result.diagnostics.eligibleMatches,
      fullTextCalls: result.diagnostics.fullTextCalls,
      fullTextSearchUsed:
        result.diagnostics.fullTextCalls === null
          ? null
          : result.diagnostics.fullTextCalls > 0,
      modelCalls: 0,
      omittedByBudget,
      omittedByLimit,
      omittedByPolicy:
        result.diagnostics.repositoryRowsReturned -
        result.diagnostics.eligibleMatches,
      rerankerUsed: false,
      returnedItems: items.length,
      vectorCalls: 0,
      vectorSearchUsed: false,
      webCalls: 0
    },
    governance: {
      authorizationDecisionId: result.authorizationDecisionId,
      consentVersion: authorization.consentVersion,
      purpose: scope.purpose,
      viewId: result.viewId
    },
    items,
    policyVersion: MEMORY_RETRIEVAL_POLICY_VERSION,
    requestId: scope.requestId,
    tokenBudget: {
      effectiveTokens,
      estimatorVersion: MEMORY_SEARCH_TOKEN_ESTIMATOR_VERSION,
      remainingTokens: effectiveTokens - usedTokens,
      requestedTokens: input.tokenBudget,
      truncated: omittedByBudget + omittedByLimit > 0,
      usedTokens
    }
  })
}
