import assert from 'node:assert/strict'

import { retrieveAuthorizedMemory } from '@application/use-cases/retrieve-memory.use-case'
import { InMemoryScopedMemoryRepository } from '@infrastructure/adapters/testing/in-memory-memory.repository.adapter'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  memoryRetrievalDependencies,
  memoryResultIds
} from './memory-retrieval.fixtures.ts'
import { SCOPED_CORPUS } from './memory-scope.fixtures.ts'

const evalLexicalPathAvoidsVectors: MemoryRetrievalEvalCase = async () => {
  const repository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
  const result = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['episodic'],
      categories: ['activity'],
      queryText: 'planetário agosto',
      semanticKeys: [],
      vectorFallback: false
    }),
    memoryRetrievalDependencies(repository)
  )

  assert.deepEqual(
    new Set(memoryResultIds(result)),
    new Set(['episode-planetarium-august'])
  )
  assert.equal(result.diagnostics.vectorFallbackUsed, false)
  assert.equal(result.diagnostics.vectorCalls, 0)
  assert.equal(repository.diagnostics.vectorCalls, 0)
  assert.equal(repository.diagnostics.searchCalls, 1)

  return { name: 'lexical match makes zero vector calls' }
}

export const MEMORY_COST_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalLexicalPathAvoidsVectors
]
