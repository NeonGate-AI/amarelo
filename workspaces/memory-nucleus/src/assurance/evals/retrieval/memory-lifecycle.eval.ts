import assert from 'node:assert/strict'

import { retrieveAuthorizedMemory } from '@application/use-cases/retrieve-memory.use-case'
import { InMemoryScopedMemoryRepository } from '@infrastructure/adapters/testing/in-memory-memory.repository.adapter'
import type { MemoryAuthorType } from '@application/contracts/memory-retrieval.contract'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  memoryRetrievalDependencies,
  memoryResultIds,
  SUBJECT_ID,
  syntheticMemoryRecord
} from './memory-retrieval.fixtures.ts'
import { retrieveScopedMemory, SCOPED_CORPUS } from './memory-scope.fixtures.ts'

const evalLifecycleAndProvenanceExclusion: MemoryRetrievalEvalCase =
  async () => {
    const corpus = [
      ...SCOPED_CORPUS,
      syntheticMemoryRecord({
        id: 'missing-provenance',
        kind: 'semantic',
        category: 'preference',
        semanticKey: 'preference.beverage',
        text: 'Registro sintético sem proveniência.',
        provenance: null
      }),
      syntheticMemoryRecord({
        id: 'arbitrary-author-type',
        kind: 'semantic',
        category: 'preference',
        semanticKey: 'preference.beverage',
        text: 'Registro com classe de autoria não governada.',
        provenance: {
          sourceArtifactIds: ['synthetic-source-arbitrary-author-type'],
          authorId: SUBJECT_ID,
          authorType: 'free-form-person-name' as MemoryAuthorType,
          createdAt: '2026-08-20T12:05:00.000Z'
        }
      })
    ]
    const result = await retrieveAuthorizedMemory(
      authorizedMemoryQuery({
        kinds: ['semantic'],
        categories: ['preference'],
        queryText: '',
        semanticKeys: ['preference.beverage']
      }),
      memoryRetrievalDependencies(new InMemoryScopedMemoryRepository(corpus))
    )

    assert.deepEqual(
      new Set(memoryResultIds(result)),
      new Set(['semantic-hibiscus-tea'])
    )
    for (const forbiddenId of [
      'rejected-memory',
      'revoked-memory',
      'superseded-memory',
      'accepted-but-superseded',
      'missing-provenance',
      'arbitrary-author-type'
    ]) {
      assert.ok(
        !memoryResultIds(result).includes(forbiddenId),
        `${forbiddenId} leaked`
      )
    }

    return {
      name: 'lifecycle and provenance exclusion in repository prefilter'
    }
  }

const evalProvenance: MemoryRetrievalEvalCase = async () => {
  const result = await retrieveScopedMemory(
    authorizedMemoryQuery({
      kinds: ['semantic'],
      categories: ['preference'],
      queryText: '',
      semanticKeys: ['preference.beverage']
    })
  )
  const item = result.items.find(({ id }) => id === 'semantic-hibiscus-tea')

  assert.ok(item)
  assert.deepEqual(item.provenance.sourceArtifactIds, [
    'synthetic-source-semantic-hibiscus-tea'
  ])
  assert.equal(item.provenance.authorId, 'subject-lumen')
  assert.equal(item.provenance.authorType, 'authorized-delegate')
  assert.equal(
    result.authorizationDecisionId,
    'synthetic-authorization-decision-1'
  )

  const mutableSources = ['synthetic-source-mutable']
  const mutableRecord = syntheticMemoryRecord({
    id: 'mutable-provenance',
    kind: 'semantic',
    category: 'preference',
    semanticKey: 'preference.mutable',
    text: 'Lumen prefere um marcador sintético mutável.',
    provenance: {
      sourceArtifactIds: mutableSources,
      authorId: SUBJECT_ID,
      authorType: 'subject',
      createdAt: '2026-08-20T12:05:00.000Z'
    }
  })
  const isolated = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['semantic'],
      categories: ['preference'],
      queryText: '',
      semanticKeys: ['preference.mutable']
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository([mutableRecord])
    )
  )
  mutableSources[0] = 'synthetic-source-mutated-after-return'
  assert.deepEqual(isolated.items[0]?.provenance.sourceArtifactIds, [
    'synthetic-source-mutable'
  ])
  assert.ok(Object.isFrozen(isolated.items[0]?.provenance))
  assert.ok(Object.isFrozen(isolated.items[0]?.provenance.sourceArtifactIds))

  return {
    name: 'provenance is preserved, cloned, and immutable after retrieval'
  }
}

export const MEMORY_LIFECYCLE_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalLifecycleAndProvenanceExclusion
]

export const MEMORY_PROVENANCE_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalProvenance
]
