import assert from 'node:assert/strict'

import { scoreRankingAtK } from '@repo/evaluation'

import { retrieveAuthorizedMemory } from '@application/use-cases/retrieve-memory.use-case'
import { InMemoryScopedMemoryRepository } from '@infrastructure/adapters/testing/in-memory-memory.repository.adapter'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  memoryRetrievalDependencies,
  memoryResultIds,
  syntheticMemoryRecord
} from './memory-retrieval.fixtures.ts'
import { RANKING_CORPUS } from './memory-ranking.fixtures.ts'

const evalRankingPrecisionAndRecallAtK: MemoryRetrievalEvalCase = async () => {
  const result = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['semantic'],
      categories: ['collection'],
      queryText: 'coleção cartões estrela',
      semanticKeys: ['collection.favorite-format'],
      budgets: {
        maxTokens: 600,
        maxSemanticItems: 3,
        maxEpisodicItems: 0
      }
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository(RANKING_CORPUS)
    )
  )
  assert.deepEqual(memoryResultIds(result), [
    'rank-exact-older',
    'rank-lexical-newer'
  ])
  const metrics = scoreRankingAtK(
    memoryResultIds(result),
    new Set(['rank-exact-older', 'rank-lexical-newer']),
    2
  )

  assert.equal(metrics.precisionAtK, 1)
  assert.equal(metrics.recallAtK, 1)

  return {
    name: 'exact key then best lexical/recency result inside the context cap',
    metrics
  }
}

const evalLexicalScoreAndStableIdTies: MemoryRetrievalEvalCase = async () => {
  const lexicalCorpus = [
    syntheticMemoryRecord({
      id: 'rank-two-token-old',
      kind: 'semantic',
      category: 'collection',
      text: 'Cartões estrela.',
      validFrom: '2026-01-01T00:00:00.000Z'
    }),
    syntheticMemoryRecord({
      id: 'rank-one-token-new',
      kind: 'semantic',
      category: 'collection',
      text: 'Cartões.',
      validFrom: '2026-08-25T00:00:00.000Z'
    })
  ]
  const stableTieCorpus = [
    syntheticMemoryRecord({
      id: 'rank-stable-b',
      kind: 'semantic',
      category: 'collection',
      text: 'Cartões estrela.',
      observedAt: '2026-01-01T00:00:00.000Z'
    }),
    syntheticMemoryRecord({
      id: 'rank-stable-a',
      kind: 'semantic',
      category: 'collection',
      text: 'Cartões estrela.',
      observedAt: '2026-01-01T00:00:00.000Z'
    })
  ]
  const lexicalResult = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['semantic'],
      categories: ['collection'],
      queryText: 'cartões estrela',
      semanticKeys: [],
      budgets: { maxTokens: 600, maxSemanticItems: 8 }
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository(lexicalCorpus)
    )
  )
  const stableTieResult = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['semantic'],
      categories: ['collection'],
      queryText: 'cartões estrela',
      semanticKeys: [],
      budgets: { maxTokens: 600, maxSemanticItems: 8 }
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository(stableTieCorpus)
    )
  )

  assert.deepEqual(memoryResultIds(lexicalResult), [
    'rank-two-token-old',
    'rank-one-token-new'
  ])
  assert.deepEqual(memoryResultIds(stableTieResult), [
    'rank-stable-a',
    'rank-stable-b'
  ])

  return { name: 'lexical score outranks recency and stable ID breaks ties' }
}

const evalPerKindCandidateFairness: MemoryRetrievalEvalCase = async () => {
  const semanticRecords = Array.from({ length: 20 }, (_, index) =>
    syntheticMemoryRecord({
      id: `candidate-semantic-${String(index).padStart(2, '0')}`,
      kind: 'semantic',
      category: 'catalog',
      semanticKey: `candidate.${index}`,
      text: `Planetário cartão semântico ${index}.`,
      observedAt: '2026-08-25T00:00:00.000Z'
    })
  )
  const episode = syntheticMemoryRecord({
    id: 'candidate-episodic',
    kind: 'episodic',
    category: 'catalog',
    text: 'Planetário recebeu um cartão episódico.',
    observedAt: '2026-08-20T00:00:00.000Z'
  })
  const result = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      categories: ['catalog'],
      queryText: 'planetário cartão',
      semanticKeys: semanticRecords.map(({ semanticKey }) => semanticKey ?? ''),
      budgets: { maxTokens: 600, maxSemanticItems: 1, maxEpisodicItems: 1 }
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository([...semanticRecords, episode])
    )
  )

  assert.equal(result.diagnostics.semanticItems, 1)
  assert.equal(result.diagnostics.episodicItems, 1)
  assert.ok(memoryResultIds(result).includes('candidate-episodic'))

  return { name: 'per-kind candidate limits prevent episodic starvation' }
}

export const MEMORY_RANKING_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalRankingPrecisionAndRecallAtK,
  evalLexicalScoreAndStableIdTies
]

export const MEMORY_CANDIDATE_FAIRNESS_EVALS: readonly MemoryRetrievalEvalCase[] =
  [evalPerKindCandidateFairness]
