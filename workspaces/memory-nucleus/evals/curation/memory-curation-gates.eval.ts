import assert from 'node:assert/strict'

import type {
  MemoryCurationAuthorizationDecision,
  MemoryCurationAuthorizationDecisionResolver
} from '#application/contracts/memory-curation-authorization.contract'
import {
  MemoryCurationAuthorizationError,
  type MemoryCurationAuthorizationFailure
} from '#application/use-cases/resolve-curation-authorization'
import type { MemoryCurationRequest } from '#application/contracts/memory-curation.contract'
import { DEFAULT_MEMORY_CURATION_POLICY } from '#application/use-cases/memory-formation.policy'
import {
  estimateMemoryExtractionInputTokens,
  MEMORY_EXTRACTION_INPUT_ESTIMATOR_VERSION,
  serializeMemoryExtractionApplicationPayload
} from '#application/contracts/memory-extraction.contract'
import type { MemoryCurationEvalCase } from './memory-curation-eval.contract'
import {
  FIXED_NOW,
  assertCallCounts,
  buildAuthorizationDecision,
  buildRequest,
  createScenario,
  extractionResult,
  fixedLengthText
} from './memory-curation.fixtures'

const assertTypedAuthorizationFailure = async (
  promise: Promise<unknown>,
  reason: MemoryCurationAuthorizationFailure
): Promise<void> => {
  await assert.rejects(
    promise,
    (error: unknown) =>
      error instanceof MemoryCurationAuthorizationError &&
      error.reason === reason
  )
}

export const memoryCurationGateEvalCases: readonly MemoryCurationEvalCase[] = [
  {
    name: 'caller-provided authorization grants are rejected before resolution',
    async run() {
      for (const authorization of [
        {
          decisionId: 'decision-citrine',
          expiresAt: '2026-08-28T12:00:00.000Z'
        },
        {
          decisionId: 'decision-citrine',
          permitsCandidateProposal: true
        }
      ]) {
        const scenario = createScenario()
        const rawRequest = {
          ...buildRequest(),
          authorization
        } as MemoryCurationRequest

        await assert.rejects(scenario.handler.invoke(rawRequest))
        assertCallCounts(scenario, {
          resolve: 0,
          claim: 0,
          extract: 0,
          persist: 0
        })
      }
    }
  },
  {
    name: 'formationSignal none has zero resolution and downstream calls',
    async run() {
      const scenario = createScenario({ authorizationDecisions: [] })
      const result = await scenario.handler.invoke(
        buildRequest({
          authorization: { decisionId: 'decision-unknown' },
          formationSignal: 'none'
        })
      )

      assert.equal(result.status, 'skipped')
      assert.equal(result.reason, 'no-formation-signal')
      assert.equal(result.usage.modelCalls, 0)
      assert.deepEqual(scenario.events, [])
      assertCallCounts(scenario, {
        resolve: 0,
        claim: 0,
        extract: 0,
        persist: 0
      })
    }
  },
  {
    name: 'unknown, revoked and non-permitting decisions fail closed',
    async run() {
      const scenarios = [
        createScenario({ authorizationDecisions: [] }),
        createScenario({
          authorizationDecisions: [
            buildAuthorizationDecision({ status: 'revoked' })
          ]
        }),
        createScenario({
          authorizationDecisions: [
            buildAuthorizationDecision({ permitsCandidateProposal: false })
          ]
        })
      ]

      for (const scenario of scenarios) {
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'skipped')
        assert.equal(result.reason, 'authorization-not-permitted')
        assert.equal(result.usage.modelCalls, 0)
        assert.deepEqual(scenario.events, ['resolve'])
        assertCallCounts(scenario, {
          resolve: 1,
          claim: 0,
          extract: 0,
          persist: 0
        })
      }
    }
  },
  {
    name: 'authorization identity and purpose mismatches fail closed',
    async run() {
      const mismatchedDecisions = [
        buildAuthorizationDecision({ actorId: 'actor-not-requested' }),
        buildAuthorizationDecision({ tenantId: 'tenant-not-requested' }),
        buildAuthorizationDecision({ subjectId: 'subject-not-requested' }),
        buildAuthorizationDecision({ purpose: 'memory.not-requested' })
      ]

      for (const decision of mismatchedDecisions) {
        const scenario = createScenario({
          authorizationDecisions: [decision]
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'skipped')
        assert.equal(result.reason, 'authorization-not-permitted')
        assert.deepEqual(scenario.events, ['resolve'])
        assertCallCounts(scenario, {
          resolve: 1,
          claim: 0,
          extract: 0,
          persist: 0
        })
      }

      const wrongIdResolver: MemoryCurationAuthorizationDecisionResolver = {
        async resolve() {
          return buildAuthorizationDecision({ id: 'decision-not-requested' })
        }
      }
      const wrongIdScenario = createScenario({
        authorizationResolver: wrongIdResolver
      })
      const wrongIdResult = await wrongIdScenario.handler.invoke(buildRequest())

      assert.equal(wrongIdResult.status, 'skipped')
      assert.equal(wrongIdResult.reason, 'authorization-not-permitted')
      assert.deepEqual(wrongIdScenario.events, ['resolve'])
      assertCallCounts(wrongIdScenario, {
        resolve: 1,
        claim: 0,
        extract: 0,
        persist: 0
      })
    }
  },
  {
    name: 'expired authorization has its explicit reason and no downstream calls',
    async run() {
      const scenario = createScenario({
        authorizationDecisions: [
          buildAuthorizationDecision({ expiresAt: FIXED_NOW.toISOString() })
        ]
      })
      const result = await scenario.handler.invoke(buildRequest())

      assert.equal(result.status, 'skipped')
      assert.equal(result.reason, 'authorization-expired')
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
    name: 'authorization expiring during resolution fails before source work',
    async run() {
      let decisionResolved = false
      const scenario = createScenario({
        authorizationResolver: {
          async resolve() {
            decisionResolved = true
            return buildAuthorizationDecision({
              expiresAt: '2026-08-27T12:00:01.000Z'
            })
          }
        },
        now: () =>
          new Date(
            decisionResolved
              ? '2026-08-27T12:00:02.000Z'
              : '2026-08-27T12:00:00.000Z'
          )
      })
      const result = await scenario.handler.invoke(buildRequest())

      assert.equal(result.status, 'skipped')
      assert.equal(result.reason, 'authorization-expired')
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
    name: 'malformed decisions and invalid clocks are typed failures',
    async run() {
      const malformedDecision = {
        ...buildAuthorizationDecision(),
        expiresAt: 'not-a-timestamp'
      } as MemoryCurationAuthorizationDecision
      const malformedResolver: MemoryCurationAuthorizationDecisionResolver = {
        async resolve() {
          return malformedDecision
        }
      }
      const malformedScenario = createScenario({
        authorizationResolver: malformedResolver
      })

      await assertTypedAuthorizationFailure(
        malformedScenario.handler.invoke(buildRequest()),
        'invalid-decision'
      )
      assert.deepEqual(malformedScenario.events, ['resolve'])
      assertCallCounts(malformedScenario, {
        resolve: 1,
        claim: 0,
        extract: 0,
        persist: 0
      })

      const invalidClockScenario = createScenario({
        now: () => new Date(Number.NaN)
      })

      await assertTypedAuthorizationFailure(
        invalidClockScenario.handler.invoke(buildRequest()),
        'invalid-clock'
      )
      assert.deepEqual(invalidClockScenario.events, ['resolve'])
      assertCallCounts(invalidClockScenario, {
        resolve: 1,
        claim: 0,
        extract: 0,
        persist: 0
      })
    }
  },
  {
    name: 'content below the minimum resolves but has no downstream side effects',
    async run() {
      const scenario = createScenario()
      const result = await scenario.handler.invoke(
        buildRequest({
          turns: [
            {
              id: 'turn-person-short',
              observedAt: '2026-08-27T10:00:00.000Z',
              speaker: 'person',
              text: 'Prefiro cartões azuis.'
            }
          ]
        })
      )

      assert.equal(result.status, 'skipped')
      assert.equal(result.reason, 'below-minimum-content')
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
    name: 'curation estimate binds the complete serialized application payload',
    async run() {
      const asciiInput = {
        maxCandidates: DEFAULT_MEMORY_CURATION_POLICY.maxCandidates,
        purpose: 'memory.curation' as const,
        turns: [
          {
            id: 'turn-budget-evidence',
            observedAt: '2026-08-27T09:00:00.000Z',
            text: 'x'.repeat(120)
          }
        ]
      }
      const serialized = serializeMemoryExtractionApplicationPayload(asciiInput)
      const asciiEstimate = estimateMemoryExtractionInputTokens(asciiInput)
      const asciiTurn = asciiInput.turns[0]

      assert.ok(asciiTurn)

      const utf8Estimate = estimateMemoryExtractionInputTokens({
        ...asciiInput,
        turns: [{ ...asciiTurn, text: 'á'.repeat(120) }]
      })

      assert.match(serialized, /You curate candidate memories for Amarelo/)
      assert.match(serialized, /turn-budget-evidence/)
      assert.match(serialized, /2026-08-27T09:00:00\.000Z/)
      assert.match(serialized, /memory\.curation/)
      assert.match(serialized, /structuredOutput/)
      assert.ok(asciiEstimate > Math.ceil(asciiTurn.text.length / 4))
      assert.ok(utf8Estimate > asciiEstimate)
    }
  },
  {
    name: 'full extraction payload budgeting preserves whole turns and defers beyond the ceiling',
    async run() {
      const firstLargeText = fixedLengthText('planetario-a:', 250)
      const secondLargeText = fixedLengthText('cartoes-b:', 250)
      const withinBudgetTurns: MemoryCurationRequest['turns'] = [
        {
          id: 'turn-large-a',
          observedAt: '2026-08-27T09:00:00.000Z',
          speaker: 'person',
          text: firstLargeText
        },
        {
          id: 'turn-large-b',
          observedAt: '2026-08-27T09:05:00.000Z',
          speaker: 'person',
          text: secondLargeText
        }
      ]
      const withinBudgetScenario = createScenario({
        extraction: extractionResult([])
      })
      const withinBudgetEstimate = estimateMemoryExtractionInputTokens({
        maxCandidates: DEFAULT_MEMORY_CURATION_POLICY.maxCandidates,
        purpose: 'memory.curation',
        turns: withinBudgetTurns.map(({ id, observedAt, text }) => ({
          id,
          observedAt,
          text
        }))
      })
      assert.ok(
        withinBudgetEstimate <=
          DEFAULT_MEMORY_CURATION_POLICY.maxEstimatedInputTokens
      )
      const withinBudgetResult = await withinBudgetScenario.handler.invoke(
        buildRequest({ turns: withinBudgetTurns })
      )

      assert.equal(withinBudgetResult.status, 'persisted')
      assert.equal(withinBudgetResult.usage.sourceWasTruncated, false)
      assert.equal(
        withinBudgetResult.usage.estimatedInputTokens,
        withinBudgetEstimate
      )
      assert.equal(
        withinBudgetResult.usage.inputEstimatorVersion,
        MEMORY_EXTRACTION_INPUT_ESTIMATOR_VERSION
      )
      assertCallCounts(withinBudgetScenario, {
        resolve: 3,
        extract: 1,
        claim: 1,
        persist: 1
      })
      assert.deepEqual(withinBudgetScenario.extractor.calls[0]?.turns, [
        {
          id: 'turn-large-a',
          observedAt: '2026-08-27T09:00:00.000Z',
          text: firstLargeText
        },
        {
          id: 'turn-large-b',
          observedAt: '2026-08-27T09:05:00.000Z',
          text: secondLargeText
        }
      ])

      const overBudgetTurns: MemoryCurationRequest['turns'] = [
        {
          id: 'turn-over-a',
          observedAt: '2026-08-27T09:00:00.000Z',
          speaker: 'person',
          text: fixedLengthText('planetario-over:', 3_500)
        },
        {
          id: 'turn-over-b',
          observedAt: '2026-08-27T09:05:00.000Z',
          speaker: 'person',
          text: fixedLengthText('cartoes-over:', 3_500)
        }
      ]
      const overBudgetEstimate = estimateMemoryExtractionInputTokens({
        maxCandidates: DEFAULT_MEMORY_CURATION_POLICY.maxCandidates,
        purpose: 'memory.curation',
        turns: overBudgetTurns.map(({ id, observedAt, text }) => ({
          id,
          observedAt,
          text
        }))
      })
      assert.ok(
        overBudgetEstimate >
          DEFAULT_MEMORY_CURATION_POLICY.maxEstimatedInputTokens
      )
      const overBudgetScenario = createScenario()
      const overBudgetResult = await overBudgetScenario.handler.invoke(
        buildRequest({ turns: overBudgetTurns })
      )

      assert.equal(overBudgetResult.status, 'deferred')
      assert.equal(overBudgetResult.reason, 'input-over-budget')
      assert.equal(
        overBudgetResult.usage.estimatedInputTokens,
        overBudgetEstimate
      )
      assert.equal(overBudgetResult.usage.sourceWasTruncated, false)
      assert.equal(overBudgetResult.usage.modelCalls, 0)
      assert.deepEqual(overBudgetScenario.events, ['resolve'])
      assertCallCounts(overBudgetScenario, {
        resolve: 1,
        extract: 0,
        claim: 0,
        persist: 0
      })
    }
  }
]
