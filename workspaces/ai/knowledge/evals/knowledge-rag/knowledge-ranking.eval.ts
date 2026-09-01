import assert from 'node:assert/strict'

import { scoreRankingAtK, type RankingMetrics } from '@repo/evaluation'

import {
  InMemoryScopedKnowledgeRepository,
  retrieveKnowledge,
  type KnowledgeRetrievalResult,
  type RepositoryKnowledgeChunk
} from '#knowledge'
import type {
  KnowledgeEvalCase,
  KnowledgeEvalResult
} from './knowledge-evaluation.contract.ts'
import { knowledgeQuery } from './knowledge.fixtures.ts'
import { RANKING_CORPUS } from './knowledge-ranking.fixtures.ts'

function identity(
  item: Pick<
    RepositoryKnowledgeChunk,
    'corpusVersion' | 'documentId' | 'versionId' | 'chunkId'
  >
): string {
  return `${item.corpusVersion}\u0000${item.documentId}\u0000${item.versionId}\u0000${item.chunkId}`
}

function chunkIds(result: KnowledgeRetrievalResult): string[] {
  return result.items.map((item) => item.chunkId)
}

function evidenceIds(result: KnowledgeRetrievalResult): string[] {
  return result.items.map(identity)
}

const evalDeterministicRankingPrecisionAndRecallAtK: KnowledgeEvalCase =
  async (): Promise<
    KnowledgeEvalResult & { readonly metrics: RankingMetrics }
  > => {
    const result = await retrieveKnowledge(
      knowledgeQuery({
        queryText: 'observatório calibração pétalas',
        sourceTypes: ['scientific'],
        maxDocs: 2,
        maxTokens: 600
      }),
      new InMemoryScopedKnowledgeRepository(RANKING_CORPUS)
    )

    assert.deepEqual(chunkIds(result), [
      'rank-three-token-old',
      'rank-two-token-newer'
    ])
    const relevant = new Set(
      RANKING_CORPUS.filter(({ chunkId }) =>
        ['rank-three-token-old', 'rank-two-token-newer'].includes(chunkId)
      ).map(identity)
    )
    const metrics = scoreRankingAtK(evidenceIds(result), relevant, 2)

    assert.equal(metrics.precisionAtK, 1)
    assert.equal(metrics.recallAtK, 1)

    return {
      name: 'lexical score, recency, and stable ID rank deterministically',
      metrics
    }
  }

const evalStableIdentityTieBreak: KnowledgeEvalCase = async () => {
  const tieCorpus = RANKING_CORPUS.filter(({ chunkId }) =>
    ['rank-two-token-older-a', 'rank-two-token-older-b'].includes(chunkId)
  )
  const result = await retrieveKnowledge(
    knowledgeQuery({
      queryText: 'calibração pétalas',
      sourceTypes: ['scientific'],
      maxDocs: 1,
      maxTokens: 600
    }),
    new InMemoryScopedKnowledgeRepository(tieCorpus)
  )

  assert.deepEqual(chunkIds(result), ['rank-two-token-older-a'])

  return { name: 'stable evidence identity breaks complete ranking ties' }
}

export const KNOWLEDGE_RANKING_EVALS: readonly KnowledgeEvalCase[] = [
  evalDeterministicRankingPrecisionAndRecallAtK,
  evalStableIdentityTieBreak
]
