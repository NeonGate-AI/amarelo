import assert from 'node:assert/strict'

import { retrieveAuthorizedMemory } from '#application/use-cases/retrieve-memory.use-case'
import { InMemoryScopedMemoryRepository } from '#infrastructure/adapters/testing/in-memory-memory.repository.adapter'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  memoryResultIds,
  memoryRetrievalDependencies,
  syntheticMemoryRecord
} from './memory-retrieval.fixtures.ts'
import { retrieveScopedMemory } from './memory-scope.fixtures.ts'

const AUGUST_WINDOW = Object.freeze({
  fromInclusive: '2026-08-01T00:00:00.000Z',
  toExclusive: '2026-09-01T00:00:00.000Z'
})

const evalOccurrenceTimeWindow: MemoryRetrievalEvalCase = async () => {
  const result = await retrieveScopedMemory(
    authorizedMemoryQuery({
      kinds: ['episodic'],
      categories: ['activity'],
      timeWindow: AUGUST_WINDOW,
      queryText: 'início',
      semanticKeys: []
    })
  )

  assert.deepEqual(memoryResultIds(result), ['episode-from-boundary'])

  const planetarium = await retrieveScopedMemory(
    authorizedMemoryQuery({
      kinds: ['episodic'],
      categories: ['activity'],
      timeWindow: AUGUST_WINDOW,
      queryText: 'agosto',
      semanticKeys: []
    })
  )
  assert.deepEqual(memoryResultIds(planetarium), ['episode-planetarium-august'])

  const before = await retrieveScopedMemory(
    authorizedMemoryQuery({
      kinds: ['episodic'],
      categories: ['activity'],
      timeWindow: AUGUST_WINDOW,
      queryText: 'antes',
      semanticKeys: []
    })
  )
  const atExclusiveEnd = await retrieveScopedMemory(
    authorizedMemoryQuery({
      kinds: ['episodic'],
      categories: ['activity'],
      timeWindow: AUGUST_WINDOW,
      queryText: 'fim',
      semanticKeys: []
    })
  )
  assert.deepEqual(memoryResultIds(before), [])
  assert.deepEqual(memoryResultIds(atExclusiveEnd), [])

  const boundary = result.items.find(({ id }) => id === 'episode-from-boundary')
  assert.ok(boundary?.kind === 'episodic')
  assert.equal(boundary.occurredAt, AUGUST_WINDOW.fromInclusive)
  assert.equal(boundary.context.occurredAt, AUGUST_WINDOW.fromInclusive)
  assert.equal(boundary.observedAt, '2026-09-10T00:00:00.000Z')
  assert.equal('validFrom' in boundary, false)

  await assert.rejects(
    retrieveScopedMemory(
      authorizedMemoryQuery({
        kinds: ['episodic'],
        categories: ['activity'],
        timeWindow: {
          fromInclusive: '2026-08-01 00:00:00',
          toExclusive: null
        },
        queryText: 'planetário'
      })
    ),
    /UTC ISO-8601/
  )
  await assert.rejects(
    retrieveScopedMemory(
      authorizedMemoryQuery({
        kinds: ['episodic'],
        categories: ['activity'],
        timeWindow: {
          fromInclusive: '2026-02-31T00:00:00.000Z',
          toExclusive: null
        },
        queryText: 'planetário'
      })
    ),
    /UTC ISO-8601/
  )

  return {
    name: 'episodic windows use inclusive/exclusive occurrence time, not observation time'
  }
}

const evalSemanticApplicationWindow: MemoryRetrievalEvalCase = async () => {
  const records = [
    syntheticMemoryRecord({
      id: 'semantic-valid-during-window',
      kind: 'semantic',
      category: 'preference',
      semanticKey: 'temporal.active',
      text: 'Preferência temporal ativa durante agosto.',
      observedAt: '2026-07-01T00:00:00.000Z',
      validFrom: AUGUST_WINDOW.fromInclusive,
      validUntil: AUGUST_WINDOW.toExclusive
    }),
    syntheticMemoryRecord({
      id: 'semantic-ended-at-from-boundary',
      kind: 'semantic',
      category: 'preference',
      semanticKey: 'temporal.ended',
      text: 'Preferência temporal terminou no início exclusivo da aplicação.',
      observedAt: '2026-08-20T00:00:00.000Z',
      validFrom: null,
      validUntil: AUGUST_WINDOW.fromInclusive
    }),
    syntheticMemoryRecord({
      id: 'semantic-started-at-to-boundary',
      kind: 'semantic',
      category: 'preference',
      semanticKey: 'temporal.future',
      text: 'Preferência temporal começa no fim exclusivo da consulta.',
      observedAt: '2026-08-20T00:00:00.000Z',
      validFrom: AUGUST_WINDOW.toExclusive,
      validUntil: null
    }),
    syntheticMemoryRecord({
      id: 'semantic-invalid-application-range',
      kind: 'semantic',
      category: 'preference',
      semanticKey: 'temporal.invalid',
      text: 'Forma temporal impossível deve falhar fechada.',
      validFrom: AUGUST_WINDOW.toExclusive,
      validUntil: AUGUST_WINDOW.fromInclusive
    })
  ]
  const result = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['semantic'],
      categories: ['preference'],
      timeWindow: AUGUST_WINDOW,
      queryText: '',
      semanticKeys: records.map(({ semanticKey }) => semanticKey ?? '')
    }),
    memoryRetrievalDependencies(new InMemoryScopedMemoryRepository(records))
  )

  assert.deepEqual(memoryResultIds(result), ['semantic-valid-during-window'])
  const item = result.items[0]
  assert.ok(item?.kind === 'semantic')
  assert.equal(item.validFrom, AUGUST_WINDOW.fromInclusive)
  assert.equal(item.validUntil, AUGUST_WINDOW.toExclusive)
  assert.equal(item.context.validFrom, AUGUST_WINDOW.fromInclusive)
  assert.equal(item.context.validUntil, AUGUST_WINDOW.toExclusive)
  assert.equal(item.observedAt, '2026-07-01T00:00:00.000Z')
  assert.equal('occurredAt' in item, false)

  return {
    name: 'semantic windows intersect half-open application intervals and reject impossible ranges'
  }
}

const evalInexactEpisodicFailClosed: MemoryRetrievalEvalCase = async () => {
  const inexact = syntheticMemoryRecord({
    id: 'episode-inexact-life-period',
    kind: 'episodic',
    category: 'activity',
    text: 'A personagem visitava observatórios durante a infância.',
    occurredAt: null,
    temporalPrecision: 'life-period',
    temporalReference: 'durante a infância'
  })
  const impossible = syntheticMemoryRecord({
    id: 'episode-impossible-mixed-time',
    kind: 'episodic',
    category: 'activity',
    text: 'Forma temporal mista deve ser rejeitada.',
    occurredAt: '2026-08-10T00:00:00.000Z',
    temporalPrecision: 'approximate',
    temporalReference: 'aproximadamente em agosto'
  })
  const unbounded = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['episodic'],
      categories: ['activity'],
      queryText: 'observatórios infância temporal mista',
      semanticKeys: []
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository([inexact, impossible])
    )
  )

  assert.deepEqual(memoryResultIds(unbounded), ['episode-inexact-life-period'])
  const item = unbounded.items[0]
  assert.ok(item?.kind === 'episodic')
  assert.equal(item.occurredAt, null)
  assert.equal(item.temporalPrecision, 'life-period')
  assert.equal(item.temporalReference, 'durante a infância')
  assert.equal(item.context.temporalReference, 'durante a infância')

  const bounded = await retrieveAuthorizedMemory(
    authorizedMemoryQuery({
      kinds: ['episodic'],
      categories: ['activity'],
      timeWindow: AUGUST_WINDOW,
      queryText: 'observatórios infância',
      semanticKeys: []
    }),
    memoryRetrievalDependencies(
      new InMemoryScopedMemoryRepository([inexact, impossible])
    )
  )
  assert.deepEqual(memoryResultIds(bounded), [])

  return {
    name: 'inexact episodic references are preserved but fail closed for bounded windows'
  }
}

export const MEMORY_TEMPORAL_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalOccurrenceTimeWindow,
  evalSemanticApplicationWindow,
  evalInexactEpisodicFailClosed
]
