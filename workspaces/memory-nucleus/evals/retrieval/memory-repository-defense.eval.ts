import assert from 'node:assert/strict'

import { retrieveAuthorizedMemory } from '#application/use-cases/retrieve-memory.use-case'
import type {
  RepositoryMemoryRecord,
  ScopedMemoryRepository
} from '#application/ports/memory-repository.port'
import type { AuthorizedMemoryRetrievalResult } from '#application/contracts/memory-retrieval.contract'
import { MemoryRepositoryScopeError } from '#application/contracts/memory-retrieval.error'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  memoryRetrievalDependencies,
  memoryResultIds
} from './memory-retrieval.fixtures.ts'
import { SCOPED_CORPUS } from './memory-scope.fixtures.ts'

function assertOnlyMemoryIds(
  result: AuthorizedMemoryRetrievalResult,
  expectedIds: readonly string[]
): void {
  assert.deepEqual(new Set(memoryResultIds(result)), new Set(expectedIds))
}

const evalDefenseInDepthAgainstFaultyRepository: MemoryRetrievalEvalCase =
  async () => {
    const byId = new Map(SCOPED_CORPUS.map((record) => [record.id, record]))
    const fixture = (id: string): RepositoryMemoryRecord => {
      const record = byId.get(id)
      assert.ok(record, `missing fixture: ${id}`)
      return record
    }
    const valid = fixture('semantic-hibiscus-tea')
    assert.equal(valid.kind, 'semantic')
    const faultyRepository: ScopedMemoryRepository = {
      async searchAuthorized(search) {
        const records: readonly RepositoryMemoryRecord[] = [
          valid,
          fixture('other-tenant'),
          fixture('other-subject'),
          fixture('other-category'),
          fixture('other-purpose'),
          fixture('other-view'),
          fixture('rejected-memory'),
          fixture('revoked-memory'),
          fixture('accepted-but-superseded'),
          { ...valid, id: 'missing-provenance-postfilter', provenance: null },
          {
            ...valid,
            id: 'outside-time-postfilter',
            validFrom: '2026-07-01T00:00:00.000Z',
            validUntil: '2026-07-02T00:00:00.000Z'
          },
          {
            ...valid,
            id: 'wrong-kind-postfilter',
            kind: 'episodic'
          } as unknown as RepositoryMemoryRecord
        ]

        return {
          authorizationDecisionId: search.authorizationDecisionId,
          records,
          diagnostics: {
            authorizedRowsConsidered: records.length,
            matchedRows: records.length,
            vectorCalls: 0
          }
        }
      }
    }
    const result = await retrieveAuthorizedMemory(
      authorizedMemoryQuery({
        kinds: ['semantic'],
        categories: ['preference'],
        timeWindow: {
          fromInclusive: '2026-08-01T00:00:00.000Z',
          toExclusive: '2026-09-01T00:00:00.000Z'
        },
        queryText: '',
        semanticKeys: ['preference.beverage']
      }),
      memoryRetrievalDependencies(faultyRepository)
    )

    assertOnlyMemoryIds(result, ['semantic-hibiscus-tea'])
    assert.equal(result.diagnostics.repositoryRowsReturned, 12)
    assert.equal(result.diagnostics.rowsRejectedByDefense, 11)

    return { name: 'defense in depth rejects a faulty repository response' }
  }

const evalRepositoryAttestationFailures: MemoryRetrievalEvalCase = async () => {
  const mismatch: ScopedMemoryRepository = {
    async searchAuthorized() {
      return {
        authorizationDecisionId: 'synthetic-wrong-decision',
        records: [],
        diagnostics: {
          authorizedRowsConsidered: 0,
          matchedRows: 0,
          vectorCalls: 0
        }
      }
    }
  }
  const vectorUsing: ScopedMemoryRepository = {
    async searchAuthorized(search) {
      return {
        authorizationDecisionId: search.authorizationDecisionId,
        records: [],
        diagnostics: {
          authorizedRowsConsidered: 0,
          matchedRows: 0,
          vectorCalls: 1
        }
      }
    }
  }
  const validRecord = SCOPED_CORPUS.find(
    ({ id }) => id === 'semantic-hibiscus-tea'
  )
  assert.ok(validRecord)
  const oversizedRow: ScopedMemoryRepository = {
    async searchAuthorized(search) {
      return {
        authorizationDecisionId: search.authorizationDecisionId,
        records: [
          {
            ...validRecord,
            id: 'oversized-storage-row',
            text: 'x'.repeat(search.candidateLimits.maxRecordCharacters + 1)
          }
        ],
        diagnostics: {
          authorizedRowsConsidered: 1,
          matchedRows: 1,
          vectorCalls: 0
        }
      }
    }
  }
  const oversizedSerializedRow: ScopedMemoryRepository = {
    async searchAuthorized(search) {
      return {
        authorizationDecisionId: search.authorizationDecisionId,
        records: [
          {
            ...validRecord,
            id: 'oversized-serialized-row',
            purposes: [
              search.purpose,
              ...Array.from(
                { length: 20 },
                (_, index) => `scope-${index}-${'x'.repeat(180)}`
              )
            ],
            text: 'Preferência por chá de hibisco.'
          }
        ],
        diagnostics: {
          authorizedRowsConsidered: 1,
          matchedRows: 1,
          vectorCalls: 0
        }
      }
    }
  }
  const query = authorizedMemoryQuery({
    kinds: ['semantic'],
    categories: ['preference'],
    queryText: '',
    semanticKeys: ['preference.beverage']
  })

  await assert.rejects(
    retrieveAuthorizedMemory(query, memoryRetrievalDependencies(mismatch)),
    MemoryRepositoryScopeError
  )
  await assert.rejects(
    retrieveAuthorizedMemory(query, memoryRetrievalDependencies(vectorUsing)),
    MemoryRepositoryScopeError
  )
  await assert.rejects(
    retrieveAuthorizedMemory(query, memoryRetrievalDependencies(oversizedRow)),
    MemoryRepositoryScopeError
  )
  await assert.rejects(
    retrieveAuthorizedMemory(
      query,
      memoryRetrievalDependencies(oversizedSerializedRow)
    ),
    MemoryRepositoryScopeError
  )

  return {
    name: 'decision mismatch, vector use and oversized rows fail closed'
  }
}

export const MEMORY_REPOSITORY_DEFENSE_EVALS: readonly MemoryRetrievalEvalCase[] =
  [evalDefenseInDepthAgainstFaultyRepository, evalRepositoryAttestationFailures]
