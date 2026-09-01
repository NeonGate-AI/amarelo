import type {
  KnowledgeRepositorySearch,
  KnowledgeRepositorySearchResult,
  RepositoryKnowledgeChunk,
  ScopedKnowledgeRepository
} from './knowledge-repository.contract.ts'
import type { KnowledgeRetrievalQuery } from './knowledge-retrieval.contract.ts'
import { MAX_KNOWLEDGE_TOKENS } from './knowledge-retrieval.contract.ts'
import {
  compareRankedKnowledgeChunks,
  distinctRankedKnowledgeDocuments,
  knowledgeLexicalTokens,
  rankEligibleKnowledgeChunk
} from './knowledge-retrieval.ranker.ts'
import { estimateKnowledgeChunkTokens } from './knowledge-token.estimator.ts'
import {
  assertKnowledgeRepositorySearch,
  knowledgeChunkRecency
} from './knowledge-retrieval.validator.ts'

/** Offline reference adapter. Production implementations should use SQL/FTS. */
export class InMemoryScopedKnowledgeRepository
  implements ScopedKnowledgeRepository
{
  readonly #records: readonly RepositoryKnowledgeChunk[]
  #searchCalls = 0

  constructor(records: readonly RepositoryKnowledgeChunk[]) {
    this.#records = records
  }

  get diagnostics(): Readonly<{
    searchCalls: number
    vectorCalls: 0
    modelCalls: 0
    webCalls: 0
  }> {
    return {
      searchCalls: this.#searchCalls,
      vectorCalls: 0,
      modelCalls: 0,
      webCalls: 0
    }
  }

  async searchScoped(
    search: KnowledgeRepositorySearch
  ): Promise<KnowledgeRepositorySearchResult> {
    this.#searchCalls += 1

    const asOfEpoch = assertKnowledgeRepositorySearch(search)
    const query: KnowledgeRetrievalQuery = {
      corpusVersion: search.corpusVersion,
      topicIds: search.topicIds,
      purposeCode: search.purposeCode,
      jurisdiction: search.jurisdiction,
      asOf: search.asOf,
      sourceTypes: search.sourceTypes,
      queryText: search.queryText,
      maxDocs: search.candidateLimit,
      maxTokens: MAX_KNOWLEDGE_TOKENS,
      vectorFallback: false
    }
    const queryTokens = knowledgeLexicalTokens(search.queryText)
    const eligibleRows = this.#records.filter(
      (record) => knowledgeChunkRecency(record, query, asOfEpoch) !== null
    )
    const rankedChunks = eligibleRows
      .map((record) =>
        rankEligibleKnowledgeChunk(record, query, asOfEpoch, queryTokens)
      )
      .filter((record) => record !== null)
      .filter(
        (record) =>
          estimateKnowledgeChunkTokens(record) <= search.maxChunkTokens
      )
      .sort(compareRankedKnowledgeChunks)
    const ranked = distinctRankedKnowledgeDocuments(rankedChunks).slice(
      0,
      search.candidateLimit
    )

    return {
      corpusVersion: search.corpusVersion,
      records: ranked.map(({ record }) => record),
      diagnostics: {
        eligibleRowsConsidered: eligibleRows.length,
        matchedRows: ranked.length,
        vectorCalls: 0,
        modelCalls: 0,
        webCalls: 0
      }
    }
  }
}
