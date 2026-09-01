import assert from 'node:assert/strict'

import type { MemoryRetrievalTrace } from '#application/ports/memory-retrieval-observer.port'
import { retrieveAuthorizedMemory } from '#application/use-cases/retrieve-memory.use-case'
import { InMemoryScopedMemoryRepository } from '#infrastructure/adapters/testing/in-memory-memory.repository.adapter'
import { MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION } from '#application/use-cases/memory-projection'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  memoryRetrievalDependencies,
  syntheticDirectReportMemoryRecord
} from './memory-retrieval.fixtures.ts'

const TRACE_FIXTURE_TEXT =
  'A personagem Lumen guarda um caderno amarelo para observações lunares.'
const TRACE_QUERY_TEXT = 'caderno amarelo observações lunares'

const traceRecord = syntheticDirectReportMemoryRecord({
  category: 'collection',
  id: 'semantic-observability-fixture',
  kind: 'semantic',
  semanticKey: 'collection.lunar-notebook',
  text: TRACE_FIXTURE_TEXT
})

const evalRetrievalRecordsPayloadFreeTrace: MemoryRetrievalEvalCase =
  async () => {
    const repository = new InMemoryScopedMemoryRepository([
      traceRecord,
      traceRecord
    ])
    const traces: MemoryRetrievalTrace[] = []
    const dependencies = memoryRetrievalDependencies(repository)
    const monotonicValues = [200, 207]

    const result = await retrieveAuthorizedMemory(
      authorizedMemoryQuery({
        budgets: { maxEpisodicItems: 3, maxSemanticItems: 8, maxTokens: 600 },
        categories: ['collection'],
        kinds: ['semantic'],
        queryText: TRACE_QUERY_TEXT,
        semanticKeys: ['collection.lunar-notebook']
      }),
      {
        ...dependencies,
        monotonicClock: () => monotonicValues.shift() ?? Number.NaN,
        observer: {
          record(trace) {
            traces.push(trace)
          }
        }
      }
    )

    assert.equal(traces.length, 1)
    const trace = traces[0]
    assert.ok(trace)
    assert.equal(trace.traceId, result.traceId)
    assert.equal(trace.selectionElapsedMilliseconds, 7)
    assert.equal(trace.vectorCalls, 0)
    assert.equal(
      trace.tokenEstimatorVersion,
      MEMORY_RETRIEVAL_TOKEN_ESTIMATOR_VERSION
    )
    assert.deepEqual(
      trace.selectedMemoryIds,
      result.items.map(({ id }) => id)
    )
    assert.deepEqual(
      trace.candidateDecisions.map(({ decision }) => decision).sort(),
      ['duplicate', 'selected']
    )
    assert.equal('tenantId' in trace, false)
    assert.equal('subjectId' in trace, false)
    assert.equal('queryText' in trace, false)
    assert.equal(JSON.stringify(trace).includes(TRACE_QUERY_TEXT), false)
    assert.equal(JSON.stringify(trace).includes(TRACE_FIXTURE_TEXT), false)

    return { name: 'successful retrieval records one payload-free trace' }
  }

const evalObserverFailureDoesNotBreakServing: MemoryRetrievalEvalCase =
  async () => {
    const repository = new InMemoryScopedMemoryRepository([traceRecord])
    const dependencies = memoryRetrievalDependencies(repository)
    const result = await retrieveAuthorizedMemory(
      authorizedMemoryQuery({
        categories: ['collection'],
        kinds: ['semantic'],
        queryText: TRACE_QUERY_TEXT,
        semanticKeys: ['collection.lunar-notebook']
      }),
      {
        ...dependencies,
        observer: {
          async record() {
            throw new Error('synthetic sink unavailable')
          }
        }
      }
    )
    assert.equal(result.items.length, 1)
    return {
      name: 'observability failure never becomes a serving authority failure'
    }
  }

const evalObserverDeadlineDoesNotBlockServing: MemoryRetrievalEvalCase =
  async () => {
    const repository = new InMemoryScopedMemoryRepository([traceRecord])
    const dependencies = memoryRetrievalDependencies(repository)
    const result = await retrieveAuthorizedMemory(
      authorizedMemoryQuery({
        categories: ['collection'],
        kinds: ['semantic'],
        queryText: TRACE_QUERY_TEXT,
        semanticKeys: ['collection.lunar-notebook']
      }),
      {
        ...dependencies,
        observer: {
          record(_trace, { signal }) {
            return new Promise<void>((resolve) => {
              signal.addEventListener('abort', () => resolve(), { once: true })
            })
          }
        },
        observerTimeoutMilliseconds: 5
      }
    )
    assert.equal(result.items.length, 1)
    return {
      name: 'observability deadline bounds telemetry without blocking retrieval'
    }
  }

export const MEMORY_OBSERVABILITY_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalRetrievalRecordsPayloadFreeTrace,
  evalObserverFailureDoesNotBreakServing,
  evalObserverDeadlineDoesNotBlockServing
]
