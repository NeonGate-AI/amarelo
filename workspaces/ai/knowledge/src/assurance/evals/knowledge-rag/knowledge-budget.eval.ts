import assert from 'node:assert/strict'

import {
  InMemoryScopedKnowledgeRepository,
  retrieveKnowledge,
  type KnowledgeRetrievalResult
} from '@knowledge'
import type { KnowledgeEvalCase } from './knowledge-evaluation.contract.ts'
import { FILTER_CORPUS } from './knowledge-filter.fixtures.ts'
import { knowledgeQuery, syntheticChunk } from './knowledge.fixtures.ts'

function chunkIds(result: KnowledgeRetrievalResult): string[] {
  return result.items.map((item) => item.chunkId)
}

function assertOnlyChunkIds(
  result: KnowledgeRetrievalResult,
  expectedIds: readonly string[]
): void {
  assert.deepEqual(new Set(chunkIds(result)), new Set(expectedIds))
}

const evalTokenBudgetWithoutTruncation: KnowledgeEvalCase = async () => {
  const longText = `Observatório calibração pétalas ${'muito-longo '.repeat(500)}`
  const shortText = 'Calibração de pétalas em trecho sintético integral.'
  const corpus = [
    syntheticChunk({
      documentId: 'a-oversized',
      versionId: 'v1',
      chunkId: 'oversized-high-score',
      text: longText,
      publishedAt: '2026-08-19T00:00:00.000Z',
      effectiveFrom: '2026-08-19T00:00:00.000Z'
    }),
    syntheticChunk({
      documentId: 'b-fitting',
      versionId: 'v1',
      chunkId: 'fitting-lower-score',
      text: shortText,
      publishedAt: '2026-08-18T00:00:00.000Z',
      effectiveFrom: '2026-08-18T00:00:00.000Z'
    })
  ]
  const result = await retrieveKnowledge(
    knowledgeQuery({
      queryText: 'observatório calibração pétalas',
      maxDocs: 8,
      maxTokens: 400
    }),
    new InMemoryScopedKnowledgeRepository(corpus)
  )

  assert.deepEqual(chunkIds(result), ['fitting-lower-score'])
  assert.equal(result.items[0]?.text, shortText)
  assert.ok(!('truncated' in (result.items[0] ?? {})))
  assert.ok(result.totalEstimatedTokens <= 400)
  assert.equal(
    result.totalEstimatedTokens,
    result.items.reduce((total, item) => total + item.estimatedTokens, 0)
  )

  const compactCorpus = Array.from({ length: 12 }, (_, index) =>
    syntheticChunk({
      documentId: `compact-${String(index).padStart(2, '0')}`,
      versionId: 'v1',
      chunkId: `compact-${String(index).padStart(2, '0')}`,
      text: `Calibração sintética ${index}.`,
      publishedAt: '2026-08-01T00:00:00.000Z',
      effectiveFrom: '2026-08-01T00:00:00.000Z'
    })
  )
  const hardCapResult = await retrieveKnowledge(
    knowledgeQuery({
      queryText: 'calibração sintética',
      maxDocs: 100,
      maxTokens: 50_000
    }),
    new InMemoryScopedKnowledgeRepository(compactCorpus)
  )

  assert.equal(hardCapResult.diagnostics.effectiveMaxDocs, 8)
  assert.equal(hardCapResult.diagnostics.effectiveMaxTokens, 600)
  assert.ok(hardCapResult.items.length <= 8)
  assert.ok(hardCapResult.totalEstimatedTokens <= 600)

  return { name: 'whole chunks are skipped, never truncated, under hard caps' }
}

const evalCandidateRecallUnderCostFilters: KnowledgeEvalCase = async () => {
  const oversized = Array.from({ length: 40 }, (_, index) =>
    syntheticChunk({
      documentId: `oversized-${String(index).padStart(2, '0')}`,
      versionId: 'v1',
      chunkId: 'oversized',
      text: `Observatório calibração pétalas ${'extenso '.repeat(500)}`
    })
  )
  const fitting = syntheticChunk({
    documentId: 'fitting-after-oversized',
    versionId: 'v1',
    chunkId: 'fitting-after-oversized',
    text: 'Observatório calibração pétalas em trecho integral.'
  })
  const afterOversized = await retrieveKnowledge(
    knowledgeQuery({ maxDocs: 8, maxTokens: 400 }),
    new InMemoryScopedKnowledgeRepository([...oversized, fitting])
  )
  assertOnlyChunkIds(afterOversized, ['fitting-after-oversized'])

  const sameDocument = await retrieveKnowledge(
    knowledgeQuery({ maxDocs: 1, maxTokens: 400 }),
    new InMemoryScopedKnowledgeRepository([
      syntheticChunk({
        documentId: 'same-document',
        versionId: 'v1',
        chunkId: 'oversized-best-score',
        text: `Observatório calibração pétalas ${'extenso '.repeat(500)}`
      }),
      syntheticChunk({
        documentId: 'same-document',
        versionId: 'v1',
        chunkId: 'compact-lower-score',
        text: 'Calibração de pétalas em trecho compacto integral.'
      })
    ])
  )
  assertOnlyChunkIds(sameDocument, ['compact-lower-score'])

  const repeatedDocument = Array.from({ length: 40 }, (_, index) =>
    syntheticChunk({
      documentId: 'repeated-document',
      versionId: 'v1',
      chunkId: `repeated-${String(index).padStart(2, '0')}`,
      text: 'Observatório calibração pétalas.'
    })
  )
  const distinctDocuments = await retrieveKnowledge(
    knowledgeQuery({ maxDocs: 2, maxTokens: 600 }),
    new InMemoryScopedKnowledgeRepository([
      ...repeatedDocument,
      syntheticChunk({
        documentId: 'second-document',
        versionId: 'v1',
        chunkId: 'second-document',
        text: 'Observatório calibração pétalas.'
      })
    ])
  )
  assert.deepEqual(
    new Set(distinctDocuments.items.map(({ documentId }) => documentId)),
    new Set(['repeated-document', 'second-document'])
  )

  const zeroBudgetRepository = new InMemoryScopedKnowledgeRepository(
    FILTER_CORPUS
  )
  const zeroBudget = await retrieveKnowledge(
    knowledgeQuery({ maxDocs: 0 }),
    zeroBudgetRepository
  )
  assert.equal(zeroBudget.items.length, 0)
  assert.equal(zeroBudgetRepository.diagnostics.searchCalls, 0)

  const stopWordRepository = new InMemoryScopedKnowledgeRepository(
    FILTER_CORPUS
  )
  const stopWords = await retrieveKnowledge(
    knowledgeQuery({ queryText: 'a de para' }),
    stopWordRepository
  )
  assert.equal(stopWords.items.length, 0)
  assert.equal(stopWordRepository.diagnostics.searchCalls, 0)

  return {
    name: 'cost filters preserve distinct-document recall before LIMIT'
  }
}

export const KNOWLEDGE_BUDGET_EVALS: readonly KnowledgeEvalCase[] = [
  evalTokenBudgetWithoutTruncation,
  evalCandidateRecallUnderCostFilters
]
