/**
 * Deterministic retrieval for versioned scientific and regulatory knowledge.
 *
 * This module is intentionally separate from personal memory. It does not call
 * models, vector stores, or the web, and it returns untrusted structured data
 * rather than assembling a prompt or interpreting scientific/regulatory text.
 */

import type {
  KnowledgeRepositorySearch,
  ScopedKnowledgeRepository
} from './knowledge-repository.contract.ts'
import type {
  KnowledgeRetrievalQuery,
  KnowledgeRetrievalResult,
  RetrievedKnowledgeData
} from './knowledge-retrieval.contract.ts'
import {
  MAX_KNOWLEDGE_DOCS,
  MAX_KNOWLEDGE_TOKENS
} from './knowledge-retrieval.contract.ts'
import {
  compareRankedKnowledgeChunks,
  distinctRankedKnowledgeDocuments,
  knowledgeLexicalTokens,
  rankEligibleKnowledgeChunk
} from './knowledge-retrieval.ranker.ts'
import { estimateKnowledgeChunkTokens } from './knowledge-token.estimator.ts'
import {
  assertKnowledgeRetrievalQuery,
  KNOWLEDGE_CANDIDATE_MULTIPLIER,
  MAX_KNOWLEDGE_CANDIDATES,
  snapshotKnowledgeQuery,
  validateKnowledgeRepositoryResult
} from './knowledge-retrieval.validator.ts'

function effectiveMaxDocs(query: KnowledgeRetrievalQuery): number {
  return Math.min(query.maxDocs, MAX_KNOWLEDGE_DOCS)
}

function effectiveMaxTokens(query: KnowledgeRetrievalQuery): number {
  return Math.min(query.maxTokens, MAX_KNOWLEDGE_TOKENS)
}

function createRepositorySearch(
  query: KnowledgeRetrievalQuery,
  docsBudget: number,
  tokensBudget: number
): KnowledgeRepositorySearch {
  return Object.freeze({
    corpusVersion: query.corpusVersion,
    topicIds: Object.freeze([...query.topicIds]),
    purposeCode: query.purposeCode,
    jurisdiction: query.jurisdiction,
    asOf: query.asOf,
    sourceTypes: Object.freeze([...query.sourceTypes]),
    queryText: query.queryText,
    requiredVerificationStatus: 'verified',
    requireCitation: true,
    requireProvenance: true,
    excludeRetracted: true,
    excludeSuperseded: true,
    distinctDocuments: true,
    maxChunkTokens: tokensBudget,
    candidateLimit: Math.min(
      docsBudget * KNOWLEDGE_CANDIDATE_MULTIPLIER,
      MAX_KNOWLEDGE_CANDIDATES
    ),
    vectorFallback: false
  })
}

function emptyKnowledgeResult(
  query: KnowledgeRetrievalQuery,
  docsBudget: number,
  tokensBudget: number
): KnowledgeRetrievalResult {
  return Object.freeze({
    corpusVersion: query.corpusVersion,
    topicIds: query.topicIds,
    purposeCode: query.purposeCode,
    jurisdiction: query.jurisdiction,
    asOf: query.asOf,
    sourceTypes: query.sourceTypes,
    items: Object.freeze([]),
    totalEstimatedTokens: 0,
    diagnostics: Object.freeze({
      repositoryRowsReturned: 0,
      rowsRejectedByDefense: 0,
      eligibleMatches: 0,
      effectiveMaxDocs: docsBudget,
      effectiveMaxTokens: tokensBudget,
      vectorFallbackUsed: false,
      vectorCalls: 0,
      modelCalls: 0,
      webCalls: 0
    })
  })
}

/**
 * Retrieves verified evidence as untrusted structured data. Applicability and
 * meaning remain the responsibility of a separate, explicitly governed layer.
 */
export async function retrieveKnowledge(
  query: KnowledgeRetrievalQuery,
  repository: ScopedKnowledgeRepository
): Promise<KnowledgeRetrievalResult> {
  const asOfEpoch = assertKnowledgeRetrievalQuery(query)
  const scopedQuery = snapshotKnowledgeQuery(query)
  const docsBudget = effectiveMaxDocs(scopedQuery)
  const tokensBudget = effectiveMaxTokens(scopedQuery)
  const queryTokens = knowledgeLexicalTokens(scopedQuery.queryText)

  if (docsBudget === 0 || tokensBudget === 0 || queryTokens.size === 0) {
    return emptyKnowledgeResult(scopedQuery, docsBudget, tokensBudget)
  }

  const repositorySearch = createRepositorySearch(
    scopedQuery,
    docsBudget,
    tokensBudget
  )
  const repositoryResult = await repository.searchScoped(repositorySearch)
  const repositoryRecords = validateKnowledgeRepositoryResult(
    repositoryResult,
    repositorySearch.candidateLimit,
    scopedQuery.corpusVersion
  )
  const rankedWithDuplicates = repositoryRecords
    .map((record) =>
      rankEligibleKnowledgeChunk(record, scopedQuery, asOfEpoch, queryTokens)
    )
    .filter((record) => record !== null)
    .filter((record) => estimateKnowledgeChunkTokens(record) <= tokensBudget)
    .sort(compareRankedKnowledgeChunks)
  const ranked = distinctRankedKnowledgeDocuments(rankedWithDuplicates)
  const items: RetrievedKnowledgeData[] = []
  let totalEstimatedTokens = 0

  for (const rankedChunk of ranked) {
    if (items.length >= docsBudget) {
      break
    }

    const estimatedTokens = estimateKnowledgeChunkTokens(rankedChunk)

    if (totalEstimatedTokens + estimatedTokens > tokensBudget) {
      continue
    }

    const { record } = rankedChunk
    items.push(
      Object.freeze({
        corpusVersion: record.corpusVersion,
        topicIds: record.topicIds,
        documentId: record.documentId,
        versionId: record.versionId,
        chunkId: record.chunkId,
        purposeCodes: record.purposeCodes,
        jurisdictions: record.jurisdictions,
        publisher: record.publisher,
        canonicalUrl: record.canonicalUrl,
        citation: record.citation,
        sourceType: record.sourceType,
        publishedAt: record.publishedAt,
        effectiveFrom: record.effectiveFrom,
        effectiveToExclusive: record.effectiveToExclusive,
        contentHash: record.contentHash,
        verificationStatus: 'verified',
        text: record.text,
        lexicalScore: rankedChunk.lexicalScore,
        estimatedTokens,
        trust: 'untrusted-knowledge-data'
      })
    )
    totalEstimatedTokens += estimatedTokens
  }

  return Object.freeze({
    corpusVersion: scopedQuery.corpusVersion,
    topicIds: scopedQuery.topicIds,
    purposeCode: scopedQuery.purposeCode,
    jurisdiction: scopedQuery.jurisdiction,
    asOf: scopedQuery.asOf,
    sourceTypes: scopedQuery.sourceTypes,
    items: Object.freeze(items),
    totalEstimatedTokens,
    diagnostics: Object.freeze({
      repositoryRowsReturned: repositoryRecords.length,
      rowsRejectedByDefense: repositoryRecords.length - ranked.length,
      eligibleMatches: ranked.length,
      effectiveMaxDocs: docsBudget,
      effectiveMaxTokens: tokensBudget,
      vectorFallbackUsed: false,
      vectorCalls: 0,
      modelCalls: 0,
      webCalls: 0
    })
  })
}
