import assert from 'node:assert/strict'

import { retrieveAuthorizedMemory } from '@application/use-cases/retrieve-memory.use-case'
import { InMemoryScopedMemoryRepository } from '@infrastructure/adapters/testing/in-memory-memory.repository.adapter'
import {
  estimateMemoryTokens,
  MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION
} from '@application/use-cases'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  memoryRetrievalDependencies,
  memoryResultIds,
  syntheticMemoryRecord
} from './memory-retrieval.fixtures.ts'
import { SCOPED_CORPUS } from './memory-scope.fixtures.ts'
import { TOKEN_BUDGET_CORPUS } from './memory-token-budget.fixtures.ts'

const evalTokenBudgetWithoutTruncation: MemoryRetrievalEvalCase = async () => {
  const longText = `Cartão prioritário ${'longo '.repeat(80)}`
  const shortText = 'Cartão estrela compacto e integral.'
  const corpus = [
    syntheticMemoryRecord({
      id: 'oversized-exact',
      kind: 'semantic',
      category: 'catalog',
      semanticKey: 'catalog.priority',
      text: longText,
      observedAt: '2026-08-25T00:00:00.000Z'
    }),
    syntheticMemoryRecord({
      id: 'fitting-lexical',
      kind: 'semantic',
      category: 'catalog',
      semanticKey: 'catalog.compact',
      text: shortText,
      observedAt: '2026-08-20T00:00:00.000Z'
    })
  ]
  const result = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['semantic'],
      categories: ['catalog'],
      queryText: 'cartão estrela',
      semanticKeys: ['catalog.priority'],
      budgets: { maxTokens: 600, maxSemanticItems: 8, maxEpisodicItems: 0 }
    }),
    memoryRetrievalDependencies(new InMemoryScopedMemoryRepository(corpus))
  )

  assert.deepEqual(memoryResultIds(result), ['fitting-lexical'])
  assert.equal(result.items[0]?.text, shortText)
  assert.equal(result.items[0]?.context.statement, shortText)
  assert.equal(result.items[0]?.context.trust, 'untrusted-memory-data')
  assert.equal(result.items[0]?.context.authorType, 'subject')
  assert.equal('id' in (result.items[0]?.context ?? {}), false)
  assert.equal('authorId' in (result.items[0]?.context ?? {}), false)
  assert.equal('sourceArtifactIds' in (result.items[0]?.context ?? {}), false)
  assert.ok(!('truncated' in (result.items[0] ?? {})))
  assert.ok(result.totalEstimatedTokens <= 600)

  const budgetCorpusResult = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      categories: ['catalog'],
      queryText: 'catálogo amarelo cartão',
      semanticKeys: [],
      budgets: { maxTokens: 600, maxSemanticItems: 8, maxEpisodicItems: 3 }
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository(TOKEN_BUDGET_CORPUS)
    )
  )
  assert.ok(budgetCorpusResult.items.length > 0)
  assert.ok(budgetCorpusResult.totalEstimatedTokens <= 600)
  assert.equal(
    budgetCorpusResult.totalEstimatedTokens,
    budgetCorpusResult.items.reduce(
      (total, item) => total + item.estimatedTokens,
      0
    )
  )

  return { name: 'whole records are omitted, never truncated, at token cap' }
}

const evalDefaultHardCaps: MemoryRetrievalEvalCase = async () => {
  const result = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['semantic'],
      categories: ['preference'],
      queryText: '',
      semanticKeys: ['preference.beverage'],
      budgets: {}
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
    )
  )

  assert.deepEqual(result.diagnostics.effectiveBudgets, {
    maxTokens: 600,
    maxSemanticItems: 8,
    maxEpisodicItems: 3
  })
  assert.ok(result.diagnostics.semanticItems <= 8)
  assert.ok(result.diagnostics.episodicItems <= 3)
  assert.equal(
    result.diagnostics.tokenEstimatorVersion,
    MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION
  )
  assert.ok(result.totalEstimatedTokens <= 600)

  return { name: 'default 8/3/600 hard caps' }
}

const evalUtf8BudgetDoesNotUndercountUnicode: MemoryRetrievalEvalCase =
  async () => {
    assert.ok(estimateMemoryTokens('😀') > estimateMemoryTokens('a'))
    assert.equal(
      MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION,
      'memory-nucleus-compact-context-projection-json-utf8-byte-upper-bound-v1'
    )

    return { name: 'UTF-8 byte estimator does not undercount non-ASCII input' }
  }

export const MEMORY_TOKEN_BUDGET_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalTokenBudgetWithoutTruncation,
  evalDefaultHardCaps,
  evalUtf8BudgetDoesNotUndercountUnicode
]
