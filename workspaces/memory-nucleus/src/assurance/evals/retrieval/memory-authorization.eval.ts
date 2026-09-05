import assert from 'node:assert/strict'

import { retrieveAuthorizedMemory } from '@application/use-cases'
import { InMemoryMemoryAuthorizationResolver } from '@infrastructure/adapters/testing'
import { InMemoryScopedMemoryRepository } from '@infrastructure/adapters/testing'
import type {
  AuthorizedRepositorySearch,
  ScopedMemoryRepository
} from '@application/ports'
import {
  InvalidAuthorizedMemoryQueryError,
  MemoryAuthorizationDecisionError,
  type MemoryAuthorizationDecisionFailure
} from '@application/contracts'
import type { MemoryRetrievalEvalCase } from './memory-retrieval.contract.ts'
import {
  authorizedMemoryQuery,
  FIXED_RETRIEVAL_NOW,
  memoryRetrievalDependencies,
  silentMemoryRetrievalObserver,
  syntheticMemoryAuthorizationDecision
} from './memory-retrieval.fixtures.ts'
import { SCOPED_CORPUS } from './memory-scope.fixtures.ts'

async function assertAuthorizationFailure(
  promise: Promise<unknown>,
  reason: MemoryAuthorizationDecisionFailure
): Promise<void> {
  await assert.rejects(
    promise,
    (error: unknown) =>
      error instanceof MemoryAuthorizationDecisionError &&
      error.reason === reason
  )
}

const evalMissingAndUnknownDecisionFailBeforeRepository: MemoryRetrievalEvalCase =
  async () => {
    const missingRepository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
    const missingResolver = new InMemoryMemoryAuthorizationResolver([
      syntheticMemoryAuthorizationDecision()
    ])

    await assert.rejects(
      retrieveAuthorizedMemory(
        authorizedMemoryQuery({ authorizationDecisionId: '' }),
        {
          authorizationResolver: missingResolver,
          observer: silentMemoryRetrievalObserver,
          repository: missingRepository,
          now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
        }
      ),
      InvalidAuthorizedMemoryQueryError
    )
    assert.equal(missingResolver.diagnostics.resolveCalls, 0)
    assert.equal(missingRepository.diagnostics.searchCalls, 0)

    await assert.rejects(
      retrieveAuthorizedMemory(
        authorizedMemoryQuery({ traceId: 'private text\nnot-an-id' }),
        {
          authorizationResolver: missingResolver,
          observer: silentMemoryRetrievalObserver,
          repository: missingRepository,
          now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
        }
      ),
      InvalidAuthorizedMemoryQueryError
    )
    assert.equal(missingResolver.diagnostics.resolveCalls, 0)
    assert.equal(missingRepository.diagnostics.searchCalls, 0)

    const unknownRepository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
    const unknownResolver = new InMemoryMemoryAuthorizationResolver([])

    await assertAuthorizationFailure(
      retrieveAuthorizedMemory(authorizedMemoryQuery(), {
        authorizationResolver: unknownResolver,
        observer: silentMemoryRetrievalObserver,
        repository: unknownRepository,
        now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
      }),
      'unknown-decision'
    )
    assert.equal(unknownResolver.diagnostics.resolveCalls, 1)
    assert.equal(unknownRepository.diagnostics.searchCalls, 0)

    return {
      name: 'missing and unknown decisions fail before repository access'
    }
  }

const evalRevokedAndExpiredDecisionFailBeforeRepository: MemoryRetrievalEvalCase =
  async () => {
    for (const scenario of [
      {
        decision: syntheticMemoryAuthorizationDecision({ status: 'revoked' }),
        reason: 'revoked-decision' as const
      },
      {
        decision: syntheticMemoryAuthorizationDecision({
          expiresAt: FIXED_RETRIEVAL_NOW.toISOString()
        }),
        reason: 'expired-decision' as const
      }
    ]) {
      const repository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
      const resolver = new InMemoryMemoryAuthorizationResolver([
        scenario.decision
      ])

      await assertAuthorizationFailure(
        retrieveAuthorizedMemory(authorizedMemoryQuery(), {
          authorizationResolver: resolver,
          observer: silentMemoryRetrievalObserver,
          repository,
          now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
        }),
        scenario.reason
      )
      assert.equal(resolver.diagnostics.resolveCalls, 1)
      assert.equal(repository.diagnostics.searchCalls, 0)
    }

    return {
      name: 'revoked and expired decisions fail before repository access'
    }
  }

const evalDecisionCannotWidenOrChangeScope: MemoryRetrievalEvalCase =
  async () => {
    const withinRestrictedScope = {
      kinds: ['semantic'] as const,
      categories: ['preference'] as const,
      timeWindow: {
        fromInclusive: '2026-08-10T00:00:00.000Z',
        toExclusive: '2026-08-20T00:00:00.000Z'
      }
    }
    const mismatchedQueries = [
      authorizedMemoryQuery({
        ...withinRestrictedScope,
        tenantId: 'tenant-not-authorized'
      }),
      authorizedMemoryQuery({
        ...withinRestrictedScope,
        subjectId: 'subject-not-authorized'
      }),
      authorizedMemoryQuery({
        ...withinRestrictedScope,
        purpose: 'purpose-not-authorized'
      }),
      authorizedMemoryQuery({
        ...withinRestrictedScope,
        viewId: 'view-not-authorized'
      }),
      authorizedMemoryQuery({
        ...withinRestrictedScope,
        categories: ['category-not-authorized']
      }),
      authorizedMemoryQuery({
        ...withinRestrictedScope,
        kinds: ['episodic']
      }),
      authorizedMemoryQuery({
        ...withinRestrictedScope,
        timeWindow: {
          fromInclusive: '2026-07-01T00:00:00.000Z',
          toExclusive: '2026-09-01T00:00:00.000Z'
        }
      })
    ]
    const restrictedDecision = syntheticMemoryAuthorizationDecision({
      kinds: ['semantic'],
      categories: ['preference'],
      timeWindow: {
        fromInclusive: '2026-08-01T00:00:00.000Z',
        toExclusive: '2026-09-01T00:00:00.000Z'
      }
    })

    for (const query of mismatchedQueries) {
      const repository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
      const resolver = new InMemoryMemoryAuthorizationResolver([
        restrictedDecision
      ])

      await assertAuthorizationFailure(
        retrieveAuthorizedMemory(query, {
          authorizationResolver: resolver,
          observer: silentMemoryRetrievalObserver,
          repository,
          now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
        }),
        'scope-mismatch'
      )
      assert.equal(resolver.diagnostics.resolveCalls, 1)
      assert.equal(repository.diagnostics.searchCalls, 0)
    }

    const wrongRecordRepository = new InMemoryScopedMemoryRepository(
      SCOPED_CORPUS
    )
    let wrongRecordResolveCalls = 0

    await assertAuthorizationFailure(
      retrieveAuthorizedMemory(authorizedMemoryQuery(withinRestrictedScope), {
        authorizationResolver: {
          async resolve() {
            wrongRecordResolveCalls += 1
            return { ...restrictedDecision, id: 'different-decision-id' }
          }
        },
        observer: silentMemoryRetrievalObserver,
        repository: wrongRecordRepository,
        now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
      }),
      'scope-mismatch'
    )
    assert.equal(wrongRecordResolveCalls, 1)
    assert.equal(wrongRecordRepository.diagnostics.searchCalls, 0)

    return {
      name: 'one decision cannot change identity or widen its granted scope'
    }
  }

const evalRepositoryReceivesResolvedImmutableScope: MemoryRetrievalEvalCase =
  async () => {
    let captured: AuthorizedRepositorySearch | undefined
    const repository: ScopedMemoryRepository = {
      async searchAuthorized(search) {
        captured = search
        return {
          authorizationDecisionId: search.authorizationDecisionId,
          records: [],
          diagnostics: {
            authorizedRowsConsidered: 0,
            matchedRows: 0,
            vectorCalls: 0
          }
        }
      }
    }

    await retrieveAuthorizedMemory(
      authorizedMemoryQuery({
        kinds: ['semantic'],
        categories: ['preference'],
        timeWindow: {
          fromInclusive: '2026-08-10T00:00:00.000Z',
          toExclusive: '2026-08-20T00:00:00.000Z'
        },
        queryText: '',
        semanticKeys: ['preference.beverage'],
        budgets: {}
      }),
      memoryRetrievalDependencies(repository, [
        syntheticMemoryAuthorizationDecision({
          kinds: ['semantic'],
          categories: ['preference'],
          timeWindow: {
            fromInclusive: '2026-08-01T00:00:00.000Z',
            toExclusive: '2026-09-01T00:00:00.000Z'
          }
        })
      ])
    )

    assert.ok(captured)
    assert.equal(
      captured.authorizationDecisionId,
      'synthetic-authorization-decision-1'
    )
    assert.equal(captured.viewId, 'view-ana')
    assert.equal(captured.traceId, 'synthetic-memory-trace-1')
    assert.deepEqual(captured.kinds, ['semantic'])
    assert.deepEqual(captured.categories, ['preference'])
    assert.equal(captured.requiredLifecycle, 'accepted')
    assert.equal(captured.requiredProvenance, true)
    assert.equal(captured.vectorFallback, false)
    assert.deepEqual(captured.candidateLimits, {
      maxEpisodicCandidates: 6,
      maxRecordCharacters: 1_200,
      maxSemanticCandidates: 16,
      maxSerializedRecordCharacters: 2_400
    })
    assert.ok(Object.isFrozen(captured))
    assert.ok(Object.isFrozen(captured.kinds))
    assert.ok(Object.isFrozen(captured.categories))
    assert.ok(Object.isFrozen(captured.timeWindow))
    assert.ok(Object.isFrozen(captured.semanticKeys))
    assert.ok(Object.isFrozen(captured.candidateLimits))

    return {
      name: 'repository receives an immutable scope after decision resolution'
    }
  }

const evalDecisionExpiryDuringResolutionFailsClosed: MemoryRetrievalEvalCase =
  async () => {
    const repository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
    let decisionResolved = false

    await assertAuthorizationFailure(
      retrieveAuthorizedMemory(authorizedMemoryQuery(), {
        authorizationResolver: {
          async resolve() {
            decisionResolved = true
            return syntheticMemoryAuthorizationDecision({
              expiresAt: '2026-08-27T12:00:01.000Z'
            })
          }
        },
        observer: silentMemoryRetrievalObserver,
        repository,
        now: () =>
          new Date(
            decisionResolved
              ? '2026-08-27T12:00:02.000Z'
              : '2026-08-27T12:00:00.000Z'
          )
      }),
      'expired-decision'
    )
    assert.equal(repository.diagnostics.searchCalls, 0)

    return {
      name: 'decision expiry during resolution fails before repository access'
    }
  }

const evalRevocationDuringRepositoryBlocksRelease: MemoryRetrievalEvalCase =
  async () => {
    const repository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
    let resolveCalls = 0
    let observerCalls = 0

    await assertAuthorizationFailure(
      retrieveAuthorizedMemory(authorizedMemoryQuery(), {
        authorizationResolver: {
          async resolve() {
            resolveCalls += 1
            return syntheticMemoryAuthorizationDecision({
              status: resolveCalls === 1 ? 'active' : 'revoked'
            })
          }
        },
        observer: {
          record() {
            observerCalls += 1
          }
        },
        repository,
        now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
      }),
      'revoked-decision'
    )
    assert.equal(resolveCalls, 2)
    assert.equal(repository.diagnostics.searchCalls, 1)
    assert.equal(observerCalls, 0)

    return {
      name: 'revocation during repository access blocks result release'
    }
  }

const evalRevocationDuringSelectionBlocksObservation: MemoryRetrievalEvalCase =
  async () => {
    const repository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
    let resolveCalls = 0
    let observerCalls = 0

    await assertAuthorizationFailure(
      retrieveAuthorizedMemory(authorizedMemoryQuery(), {
        authorizationResolver: {
          async resolve() {
            resolveCalls += 1
            return syntheticMemoryAuthorizationDecision({
              status: resolveCalls < 3 ? 'active' : 'revoked'
            })
          }
        },
        observer: {
          record() {
            observerCalls += 1
          }
        },
        repository,
        now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
      }),
      'revoked-decision'
    )
    assert.equal(resolveCalls, 3)
    assert.equal(repository.diagnostics.searchCalls, 1)
    assert.equal(observerCalls, 0)

    return {
      name: 'revocation during selection blocks trace and result release'
    }
  }

const evalRevocationDuringObservationBlocksRelease: MemoryRetrievalEvalCase =
  async () => {
    const repository = new InMemoryScopedMemoryRepository(SCOPED_CORPUS)
    let resolveCalls = 0
    let observerCalls = 0

    await assertAuthorizationFailure(
      retrieveAuthorizedMemory(authorizedMemoryQuery(), {
        authorizationResolver: {
          async resolve() {
            resolveCalls += 1
            return syntheticMemoryAuthorizationDecision({
              status: resolveCalls < 4 ? 'active' : 'revoked'
            })
          }
        },
        observer: {
          record() {
            observerCalls += 1
          }
        },
        repository,
        now: () => new Date(FIXED_RETRIEVAL_NOW.getTime())
      }),
      'revoked-decision'
    )
    assert.equal(resolveCalls, 4)
    assert.equal(repository.diagnostics.searchCalls, 1)
    assert.equal(observerCalls, 1)

    return {
      name: 'revocation during trace observation blocks result release'
    }
  }

export const MEMORY_AUTHORIZATION_EVALS: readonly MemoryRetrievalEvalCase[] = [
  evalMissingAndUnknownDecisionFailBeforeRepository,
  evalRevokedAndExpiredDecisionFailBeforeRepository,
  evalDecisionCannotWidenOrChangeScope,
  evalRepositoryReceivesResolvedImmutableScope,
  evalDecisionExpiryDuringResolutionFailsClosed,
  evalRevocationDuringRepositoryBlocksRelease,
  evalRevocationDuringSelectionBlocksObservation,
  evalRevocationDuringObservationBlocksRelease
]
