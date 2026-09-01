import assert from 'node:assert/strict'

import {
  InMemoryScopedKnowledgeRepository,
  InvalidKnowledgeRetrievalQueryError,
  retrieveKnowledge,
  type KnowledgeRetrievalResult
} from '#knowledge'
import type { KnowledgeEvalCase } from './knowledge-evaluation.contract.ts'
import { knowledgeQuery } from './knowledge.fixtures.ts'
import { TEMPORAL_CORPUS } from './knowledge-temporal.fixtures.ts'

function chunkIds(result: KnowledgeRetrievalResult): string[] {
  return result.items.map((item) => item.chunkId)
}

const evalTemporalAsOfBoundaries: KnowledgeEvalCase = async () => {
  const scientificResult = await retrieveKnowledge(
    knowledgeQuery({
      queryText: 'observatório calibração',
      sourceTypes: ['scientific']
    }),
    new InMemoryScopedKnowledgeRepository(TEMPORAL_CORPUS)
  )
  const regulatoryResult = await retrieveKnowledge(
    knowledgeQuery({
      queryText: 'observatório calibração',
      sourceTypes: ['regulatory']
    }),
    new InMemoryScopedKnowledgeRepository(TEMPORAL_CORPUS)
  )

  assert.deepEqual(
    new Set(chunkIds(scientificResult)),
    new Set(['published-at-as-of'])
  )
  assert.deepEqual(
    new Set(chunkIds(regulatoryResult)),
    new Set(['effective-from-as-of'])
  )
  assert.ok(
    !chunkIds(scientificResult).includes('published-one-millisecond-later')
  )
  assert.ok(!chunkIds(regulatoryResult).includes('effective-to-as-of'))

  await assert.rejects(
    retrieveKnowledge(
      knowledgeQuery({ asOf: '2026-08-20 12:00:00' }),
      new InMemoryScopedKnowledgeRepository(TEMPORAL_CORPUS)
    ),
    InvalidKnowledgeRetrievalQueryError
  )

  return { name: 'published/effective as-of boundaries are reproducible' }
}

export const KNOWLEDGE_TEMPORAL_EVALS: readonly KnowledgeEvalCase[] = [
  evalTemporalAsOfBoundaries
]
