import assert from 'node:assert/strict'

import {
  type MemoryPersistenceClient,
  SaveCurationRunRequestSchema,
  SaveCurationRunResultSchema,
  SourceClaimRequestSchema,
  SourceClaimResultSchema
} from '#application/ports/memory-curation-persistence.port'
import { createCurationIdempotencyKey } from '#application/use-cases/memory-curation.fingerprint'
import type { MemoryCurationEvalCase } from './memory-curation-eval.contract'
import {
  HASH_PATTERN,
  assertCallCounts,
  buildAuthorizationDecision,
  buildRequest,
  createScenario,
  extractionResult,
  semanticCandidate
} from './memory-curation.fixtures'

export const memoryCurationIdempotencyEvalCases: readonly MemoryCurationEvalCase[] =
  [
    {
      name: 'duplicate source claim performs no extractor or persistence call',
      async run() {
        const scenario = createScenario({
          claimResult: {
            claimExpiresAt: null,
            claimId: null,
            runId: 'run-existing',
            status: 'duplicate'
          }
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'duplicate')
        assert.equal(result.reason, null)
        assert.equal(result.retryAt, null)
        assert.equal(result.runId, 'run-existing')
        assert.equal(result.usage.modelCalls, 0)
        assert.deepEqual(scenario.events, ['resolve', 'claim'])
        assertCallCounts(scenario, {
          resolve: 1,
          claim: 1,
          extract: 0,
          persist: 0
        })
      }
    },
    {
      name: 'active source claim defers without an extractor invocation',
      async run() {
        const scenario = createScenario({
          claimResult: {
            claimExpiresAt: '2026-08-27T12:05:00.000Z',
            claimId: null,
            runId: null,
            status: 'in-progress'
          }
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'source-in-progress')
        assert.equal(result.retryAt, '2026-08-27T12:05:00.000Z')
        assert.equal(result.runId, null)
        assert.equal(result.usage.modelCalls, 0)
        assert.deepEqual(scenario.events, ['resolve', 'claim'])
        assertCallCounts(scenario, {
          resolve: 1,
          claim: 1,
          extract: 0,
          persist: 0
        })
      }
    },
    {
      name: 'expired in-progress claim does not expose a stale retry time',
      async run() {
        const scenario = createScenario({
          claimResult: {
            claimExpiresAt: '2026-08-27T12:00:00.000Z',
            claimId: null,
            runId: null,
            status: 'in-progress'
          }
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'source-claim-expired')
        assert.equal(result.retryAt, null)
        assert.equal(result.usage.modelCalls, 0)
        assert.deepEqual(scenario.events, ['resolve', 'claim'])
        assertCallCounts(scenario, {
          resolve: 1,
          claim: 1,
          extract: 0,
          persist: 0
        })
      }
    },
    {
      name: 'expired claim never reaches the extractor or completion',
      async run() {
        const scenario = createScenario({
          claimResult: {
            claimExpiresAt: '2026-08-27T12:00:00.000Z',
            claimId: 'claim-expired',
            runId: null,
            status: 'claimed'
          }
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'source-claim-expired')
        assert.equal(result.retryAt, null)
        assert.deepEqual(scenario.events, ['resolve', 'claim'])
        assertCallCounts(scenario, {
          resolve: 1,
          claim: 1,
          extract: 0,
          persist: 0
        })
      }
    },
    {
      name: 'authorization window must outlive the extractor deadline',
      async run() {
        const scenario = createScenario({
          authorizationDecisions: [
            buildAuthorizationDecision({
              expiresAt: '2026-08-27T12:00:05.000Z'
            })
          ],
          extractorDeadlineMilliseconds: 10_000
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'authorization-window-too-short')
        assert.equal(result.retryAt, null)
        assert.equal(result.usage.modelCalls, 0)
        assert.deepEqual(scenario.events, ['resolve'])
        assertCallCounts(scenario, {
          resolve: 1,
          claim: 0,
          extract: 0,
          persist: 0
        })
      }
    },
    {
      name: 'authorization window is sampled again immediately before claim',
      async run() {
        const instants = [
          new Date('2026-08-27T12:00:00.000Z'),
          new Date('2026-08-27T12:00:10.000Z')
        ]
        const scenario = createScenario({
          authorizationDecisions: [
            buildAuthorizationDecision({
              expiresAt: '2026-08-27T12:00:15.000Z'
            })
          ],
          extractorDeadlineMilliseconds: 10_000,
          now: () => instants.shift() ?? new Date(Number.NaN)
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'authorization-window-too-short')
        assert.equal(result.usage.modelCalls, 0)
        assert.deepEqual(scenario.events, ['resolve'])
        assertCallCounts(scenario, {
          resolve: 1,
          claim: 0,
          extract: 0,
          persist: 0
        })
      }
    },
    {
      name: 'claim window must outlive the extractor deadline',
      async run() {
        const scenario = createScenario({
          claimResult: {
            claimExpiresAt: '2026-08-27T12:00:05.000Z',
            claimId: 'claim-too-short',
            runId: null,
            status: 'claimed'
          },
          extractorDeadlineMilliseconds: 10_000
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'source-claim-window-too-short')
        assert.equal(result.retryAt, null)
        assert.equal(result.usage.modelCalls, 0)
        assert.deepEqual(scenario.events, ['resolve', 'claim', 'resolve'])
        assertCallCounts(scenario, {
          resolve: 2,
          claim: 1,
          extract: 0,
          persist: 0
        })
      }
    },
    {
      name: 'claim expiry after extraction blocks stale completion',
      async run() {
        const instants = [
          new Date('2026-08-27T12:00:00.000Z'),
          new Date('2026-08-27T12:00:01.000Z'),
          new Date('2026-08-27T12:00:02.000Z'),
          new Date('2026-08-27T12:00:03.000Z'),
          new Date('2026-08-27T12:05:00.000Z')
        ]
        const scenario = createScenario({
          now: () => instants.shift() ?? new Date(Number.NaN)
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'source-claim-expired')
        assert.equal(result.usage.modelCalls, 1)
        assert.deepEqual(scenario.events, [
          'resolve',
          'claim',
          'resolve',
          'extract'
        ])
        assertCallCounts(scenario, {
          resolve: 2,
          claim: 1,
          extract: 1,
          persist: 0
        })
      }
    },
    {
      name: 'completion reports a lost claim without claiming persistence',
      async run() {
        const scenario = createScenario({
          saveResult: {
            candidateIds: [],
            runId: null,
            status: 'claim-lost'
          }
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'source-claim-lost')
        assert.equal(result.runId, null)
        assert.equal(result.usage.modelCalls, 1)
        assert.deepEqual(scenario.events, [
          'resolve',
          'claim',
          'resolve',
          'extract',
          'resolve',
          'save'
        ])
        assertCallCounts(scenario, {
          resolve: 3,
          claim: 1,
          extract: 1,
          persist: 1
        })
      }
    },
    {
      name: 'malformed completion adapter response cannot report persistence',
      async run() {
        const scenario = createScenario({
          saveResult: {
            candidateIds: ['candidate-untrusted'],
            runId: 'run-untrusted',
            status: 'unexpected'
          } as unknown as Awaited<
            ReturnType<MemoryPersistenceClient['saveCurationRun']>
          >
        })

        await assert.rejects(scenario.handler.invoke(buildRequest()))
        assertCallCounts(scenario, {
          resolve: 3,
          claim: 1,
          extract: 1,
          persist: 1
        })
      }
    },
    {
      name: 'completion must account for each candidate exactly once',
      async run() {
        assert.equal(
          SaveCurationRunResultSchema.safeParse({
            candidateIds: ['candidate-1', 'candidate-1'],
            runId: 'run-duplicate-candidate-ids',
            status: 'completed'
          }).success,
          false
        )

        const scenario = createScenario({
          saveResult: {
            candidateIds: [],
            runId: 'run-missing-candidate-id',
            status: 'completed'
          }
        })

        await assert.rejects(
          scenario.handler.invoke(buildRequest()),
          /did not account for every candidate/
        )
        assertCallCounts(scenario, {
          resolve: 3,
          claim: 1,
          extract: 1,
          persist: 1
        })
      }
    },
    {
      name: 'claim expiry after authority recheck still blocks completion',
      async run() {
        const instants = [
          new Date('2026-08-27T12:00:00.000Z'),
          new Date('2026-08-27T12:00:01.000Z'),
          new Date('2026-08-27T12:00:02.000Z'),
          new Date('2026-08-27T12:00:03.000Z'),
          new Date('2026-08-27T12:00:04.000Z'),
          new Date('2026-08-27T12:05:00.000Z')
        ]
        const scenario = createScenario({
          now: () => instants.shift() ?? new Date(Number.NaN)
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'source-claim-expired')
        assert.deepEqual(scenario.events, [
          'resolve',
          'claim',
          'resolve',
          'extract',
          'resolve'
        ])
        assertCallCounts(scenario, {
          resolve: 3,
          claim: 1,
          extract: 1,
          persist: 0
        })
      }
    },
    {
      name: 'authorization revoked during claim blocks private model input',
      async run() {
        let resolveCalls = 0
        const scenario = createScenario({
          authorizationResolver: {
            async resolve() {
              resolveCalls += 1
              return buildAuthorizationDecision({
                status: resolveCalls === 1 ? 'active' : 'revoked'
              })
            }
          }
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'skipped')
        assert.equal(result.reason, 'authorization-not-permitted')
        assert.equal(result.usage.modelCalls, 0)
        assert.deepEqual(scenario.events, ['resolve', 'claim', 'resolve'])
        assertCallCounts(scenario, {
          resolve: 2,
          claim: 1,
          extract: 0,
          persist: 0
        })
      }
    },
    {
      name: 'authorization revoked during extraction blocks completion',
      async run() {
        let resolveCalls = 0
        const scenario = createScenario({
          authorizationResolver: {
            async resolve() {
              resolveCalls += 1
              return buildAuthorizationDecision({
                status: resolveCalls < 3 ? 'active' : 'revoked'
              })
            }
          }
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'skipped')
        assert.equal(result.reason, 'authorization-not-permitted')
        assert.equal(result.usage.modelCalls, 1)
        assert.deepEqual(scenario.events, [
          'resolve',
          'claim',
          'resolve',
          'extract',
          'resolve'
        ])
        assertCallCounts(scenario, {
          resolve: 3,
          claim: 1,
          extract: 1,
          persist: 0
        })
      }
    },
    {
      name: 'claim contracts reject impossible status combinations',
      async run() {
        const impossibleClaim = SourceClaimResultSchema.safeParse({
          claimExpiresAt: null,
          claimId: 'claim-impossible',
          runId: 'run-impossible',
          status: 'claimed'
        })

        assert.equal(impossibleClaim.success, false)
      }
    },
    {
      name: 'source, candidate and idempotency fingerprints are stable',
      async run() {
        const firstScenario = createScenario({
          extraction: extractionResult([
            semanticCandidate({
              statement:
                'A pessoa prefere conferir o calendário do planetário com antecedência.'
            })
          ])
        })
        const firstResult = await firstScenario.handler.invoke(buildRequest())

        const secondScenario = createScenario({
          authorizationDecisions: [
            buildAuthorizationDecision({ id: 'decision-topaz' })
          ],
          extraction: extractionResult([
            semanticCandidate({
              statement:
                '  A   PESSOA PREFERE CONFERIR O CALENDÁRIO DO PLANETÁRIO COM ANTECEDÊNCIA.  '
            })
          ])
        })
        const secondResult = await secondScenario.handler.invoke(
          buildRequest({
            authorization: { decisionId: 'decision-topaz' },
            requestId: 'request-gold',
            turns: buildRequest().turns.map((turn) =>
              turn.speaker === 'person'
                ? {
                    ...turn,
                    observedAt: '2026-08-27T07:00:00.000-03:00',
                    text: `  ${turn.text.replaceAll(' ', '   ')}  `
                  }
                : turn
            )
          })
        )

        assert.equal(firstResult.status, 'persisted')
        assert.equal(secondResult.status, 'persisted')

        const firstClaim = firstScenario.persistence.claimCalls[0]
        const secondClaim = secondScenario.persistence.claimCalls[0]
        const firstSave = firstScenario.persistence.saveCalls[0]
        const secondSave = secondScenario.persistence.saveCalls[0]
        assert.ok(firstClaim)
        assert.ok(secondClaim)
        assert.ok(firstSave)
        assert.ok(secondSave)

        assert.match(firstClaim.sourceFingerprint, HASH_PATTERN)
        assert.equal(
          firstClaim.sourceFingerprint,
          secondClaim.sourceFingerprint
        )
        assert.equal(firstSave.claimId, 'claim-citrine')
        assert.equal(firstSave.authorizationDecisionId, 'decision-citrine')
        assert.equal(secondSave.authorizationDecisionId, 'decision-topaz')
        assert.ok(
          secondSave.candidates.every(
            (candidate) =>
              candidate.authorizationDecisionId === 'decision-topaz'
          )
        )
        assert.match(firstSave.idempotencyKey, HASH_PATTERN)
        assert.equal(firstClaim.idempotencyKey, firstSave.idempotencyKey)
        assert.equal(secondClaim.idempotencyKey, secondSave.idempotencyKey)
        assert.equal(firstSave.idempotencyKey, secondSave.idempotencyKey)
        const canonicalIdentity = {
          extractorVersion: firstSave.extractorVersion,
          modelId: firstSave.modelId,
          policyVersion: firstSave.policyVersion,
          promptVersion: firstSave.promptVersion,
          providerId: firstSave.providerId,
          schemaVersion: firstSave.schemaVersion,
          sourceFingerprint: firstSave.sourceFingerprint,
          subjectId: firstSave.subjectId,
          tenantId: firstSave.tenantId
        }
        const changedExtractionIdentities = [
          { ...canonicalIdentity, extractorVersion: 'different-extractor' },
          { ...canonicalIdentity, modelId: 'different-model' },
          { ...canonicalIdentity, policyVersion: 'different-policy' },
          { ...canonicalIdentity, promptVersion: 'different-prompt' },
          { ...canonicalIdentity, providerId: 'different-provider' },
          { ...canonicalIdentity, schemaVersion: 'different-schema' }
        ]

        for (const changedIdentity of changedExtractionIdentities) {
          assert.notEqual(
            firstSave.idempotencyKey,
            createCurationIdempotencyKey(changedIdentity)
          )
        }
        assert.equal(
          SourceClaimRequestSchema.safeParse({
            ...firstClaim,
            idempotencyKey: '0'.repeat(64)
          }).success,
          false
        )
        assert.equal(
          SaveCurationRunRequestSchema.safeParse({
            ...firstSave,
            idempotencyKey: '0'.repeat(64)
          }).success,
          false
        )
        assert.equal(
          SaveCurationRunRequestSchema.safeParse({
            ...firstSave,
            candidates: firstSave.candidates.map((candidate) => ({
              ...candidate,
              tenantId: 'tenant-cross-scope'
            }))
          }).success,
          false
        )
        assert.match(
          firstSave.candidates[0]?.candidateFingerprint ?? '',
          HASH_PATTERN
        )
        assert.equal(
          firstSave.candidates[0]?.candidateFingerprint,
          secondSave.candidates[0]?.candidateFingerprint
        )
      }
    }
  ]
