import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

import {
  ExtractedMemoryCandidateSchema,
  MemoryKindSchema,
  MemoryTemporalPrecisionSchema
} from '@domain/entities'
import {
  MEMORY_EXTRACTION_PROMPT,
  MEMORY_EXTRACTION_PROMPT_VERSION
} from '@application/prompts'
import type { MemoryCurationEvalCase } from './memory-curation-eval.contract'
import {
  assertCallCounts,
  buildRequest,
  createScenario,
  episodicCandidate,
  extractionResult,
  semanticCandidate
} from './memory-curation.fixtures'

export const memoryCurationExtractionEvalCases: readonly MemoryCurationEvalCase[] =
  [
    {
      name: 'prompt identity is content-addressed',
      async run() {
        assert.equal(
          MEMORY_EXTRACTION_PROMPT_VERSION,
          `memory-extraction-prompt-sha256:${createHash('sha256')
            .update(MEMORY_EXTRACTION_PROMPT, 'utf8')
            .digest('hex')}`
        )
      }
    },
    {
      name: 'eligible source uses one bounded extraction and one batch persistence',
      async run() {
        const scenario = createScenario({
          extraction: extractionResult([
            episodicCandidate(),
            semanticCandidate()
          ])
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'persisted')
        assert.equal(result.usage.modelCalls, 1)
        assert.equal(result.usage.modelId, 'mock-memory-model')
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
          extract: 1,
          claim: 1,
          persist: 1
        })

        const extractionCall = scenario.extractor.calls[0]
        assert.ok(extractionCall)
        assert.equal(scenario.extractor.executionSignals.length, 1)
        assert.equal(scenario.extractor.executionSignals[0]?.aborted, false)
        assert.deepEqual(Object.keys(extractionCall).sort(), [
          'maxCandidates',
          'purpose',
          'turns'
        ])
        assert.equal(extractionCall.purpose, 'memory.curation')
        assert.ok(
          extractionCall.turns.every(
            (turn) =>
              Object.keys(turn).sort().join(',') === 'id,observedAt,text'
          )
        )

        const saved = scenario.persistence.saveCalls[0]
        assert.ok(saved)
        assert.equal(saved.candidates.length, 2)
        assert.ok(
          saved.candidates.every(
            (candidate) => candidate.status === 'candidate'
          )
        )
        assert.ok(
          saved.candidates.every((candidate) =>
            ['episodic', 'semantic'].includes(candidate.kind)
          )
        )

        const episodic = saved.candidates.find(
          (candidate) => candidate.kind === 'episodic'
        )
        const semantic = saved.candidates.find(
          (candidate) => candidate.kind === 'semantic'
        )
        assert.ok(episodic)
        assert.ok(semantic)
        assert.equal(episodic.validFrom, null)
        assert.equal(semantic.occurredAt, null)
      }
    },
    {
      name: 'extractor deadline aborts cooperative model work',
      async run() {
        const scenario = createScenario({
          extractorDeadlineMilliseconds: 1,
          extractorWaitsForAbort: true
        })

        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'extraction-deadline')
        assert.equal(result.retryAt, null)
        assert.equal(result.usage.modelCalls, 1)
        assert.equal(result.usage.actualInputTokens, null)
        assert.equal(result.usage.actualOutputTokens, null)
        assert.equal(result.usage.actualTotalTokens, null)
        assert.equal(
          result.usage.inputEstimatorVersion,
          'memory-extraction-utf8-byte-v1'
        )
        assert.deepEqual(scenario.events, [
          'resolve',
          'claim',
          'resolve',
          'extract'
        ])
        assert.equal(scenario.extractor.executionSignals.length, 1)
        assert.equal(scenario.extractor.executionSignals[0]?.aborted, true)
        assertCallCounts(scenario, {
          resolve: 2,
          extract: 1,
          claim: 1,
          persist: 0
        })
      }
    },
    {
      name: 'extractor rejection remains visible in conservative usage',
      async run() {
        const scenario = createScenario({
          extractorError: new Error('invented provider-private failure')
        })

        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'extraction-failed')
        assert.equal(result.retryAt, null)
        assert.equal(result.usage.modelCalls, 1)
        assert.equal(result.usage.actualInputTokens, null)
        assert.equal(result.usage.actualOutputTokens, null)
        assert.equal(result.usage.actualTotalTokens, null)
        assert.deepEqual(scenario.events, [
          'resolve',
          'claim',
          'resolve',
          'extract'
        ])
        assertCallCounts(scenario, {
          resolve: 2,
          extract: 1,
          claim: 1,
          persist: 0
        })
      }
    },
    {
      name: 'invalid structured payload preserves validated provider usage',
      async run() {
        const scenario = createScenario({
          extraction: extractionResult([
            episodicCandidate({ occurredAt: null })
          ])
        })

        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'extraction-failed')
        assert.equal(result.usage.modelCalls, 1)
        assert.equal(result.usage.actualInputTokens, 211)
        assert.equal(result.usage.actualOutputTokens, 37)
        assert.equal(result.usage.actualTotalTokens, 248)
        assertCallCounts(scenario, {
          resolve: 2,
          extract: 1,
          claim: 1,
          persist: 0
        })
      }
    },
    {
      name: 'taxonomy rejects longitudinal and invalid temporal combinations',
      async run() {
        assert.equal(MemoryKindSchema.safeParse('longitudinal').success, false)
        assert.equal(MemoryKindSchema.safeParse('episodic').success, true)
        assert.equal(MemoryKindSchema.safeParse('semantic').success, true)
        for (const precision of [
          'approximate',
          'life-period',
          'year',
          'month',
          'day',
          'exact'
        ]) {
          assert.equal(
            MemoryTemporalPrecisionSchema.safeParse(precision).success,
            true
          )
        }
        assert.equal(
          MemoryTemporalPrecisionSchema.safeParse('invented-timestamp').success,
          false
        )
        assert.equal(
          ExtractedMemoryCandidateSchema.safeParse(
            episodicCandidate({
              temporalReference: 'em uma ocasião anterior'
            })
          ).success,
          false
        )
        assert.equal(
          ExtractedMemoryCandidateSchema.safeParse(
            episodicCandidate({
              occurredAt: null,
              temporalPrecision: 'exact',
              temporalReference: 'em uma ocasião anterior'
            })
          ).success,
          false
        )

        const missingOccurredAt = createScenario({
          extraction: extractionResult([
            episodicCandidate({ occurredAt: null })
          ])
        })
        const missingOccurredAtResult = await missingOccurredAt.handler.invoke(
          buildRequest()
        )
        assert.equal(missingOccurredAtResult.status, 'deferred')
        assert.equal(missingOccurredAtResult.reason, 'extraction-failed')
        assert.equal(missingOccurredAtResult.usage.modelCalls, 1)
        assertCallCounts(missingOccurredAt, {
          resolve: 2,
          extract: 1,
          claim: 1,
          persist: 0
        })

        const episodicWithValidFrom = createScenario({
          extraction: extractionResult([
            episodicCandidate({ validFrom: '2026-08-27T10:00:00.000Z' })
          ])
        })
        const episodicWithValidFromResult =
          await episodicWithValidFrom.handler.invoke(buildRequest())
        assert.equal(episodicWithValidFromResult.status, 'deferred')
        assert.equal(episodicWithValidFromResult.reason, 'extraction-failed')
        assert.equal(episodicWithValidFromResult.usage.modelCalls, 1)
        assertCallCounts(episodicWithValidFrom, {
          resolve: 2,
          extract: 1,
          claim: 1,
          persist: 0
        })

        const approximateEpisode = createScenario({
          extraction: extractionResult([
            episodicCandidate({
              occurredAt: null,
              statement:
                'A pessoa organizou cartões em um período mencionado sem data exata.',
              temporalPrecision: 'approximate',
              temporalReference: 'quando os cartões ainda eram poucos'
            })
          ])
        })
        const approximateResult = await approximateEpisode.handler.invoke(
          buildRequest()
        )
        assert.equal(approximateResult.status, 'persisted')
        assertCallCounts(approximateEpisode, {
          resolve: 3,
          extract: 1,
          claim: 1,
          persist: 1
        })

        const approximateSaved = approximateEpisode.persistence.saveCalls[0]
        assert.ok(approximateSaved)
        assert.equal(approximateSaved.candidates[0]?.occurredAt, null)
        assert.equal(
          approximateSaved.candidates[0]?.temporalReference,
          'quando os cartões ainda eram poucos'
        )
        assert.equal(
          approximateSaved.candidates[0]?.temporalPrecision,
          'approximate'
        )

        const semanticWithOccurredAt = createScenario({
          extraction: extractionResult([
            semanticCandidate({
              occurredAt: '2026-08-27T10:00:00.000Z'
            })
          ])
        })
        const semanticWithOccurredAtResult =
          await semanticWithOccurredAt.handler.invoke(buildRequest())
        assert.equal(semanticWithOccurredAtResult.status, 'deferred')
        assert.equal(semanticWithOccurredAtResult.reason, 'extraction-failed')
        assert.equal(semanticWithOccurredAtResult.usage.modelCalls, 1)
        assertCallCounts(semanticWithOccurredAt, {
          resolve: 2,
          extract: 1,
          claim: 1,
          persist: 0
        })

        const semanticWithEpisodicFields = createScenario({
          extraction: extractionResult([
            semanticCandidate({
              temporalPrecision: 'approximate',
              temporalReference: 'em uma ocasião anterior'
            })
          ])
        })
        const semanticWithEpisodicFieldsResult =
          await semanticWithEpisodicFields.handler.invoke(buildRequest())
        assert.equal(semanticWithEpisodicFieldsResult.status, 'deferred')
        assert.equal(
          semanticWithEpisodicFieldsResult.reason,
          'extraction-failed'
        )
        assert.equal(semanticWithEpisodicFieldsResult.usage.modelCalls, 1)
        assertCallCounts(semanticWithEpisodicFields, {
          resolve: 2,
          extract: 1,
          claim: 1,
          persist: 0
        })

        const validSemanticDates = createScenario({
          extraction: extractionResult([
            semanticCandidate(),
            semanticCandidate({
              statement: 'A pessoa também prefere cartões separados por cor.',
              validFrom: null
            })
          ])
        })
        const validSemanticResult = await validSemanticDates.handler.invoke(
          buildRequest()
        )
        assert.equal(validSemanticResult.status, 'persisted')

        const saved = validSemanticDates.persistence.saveCalls[0]
        assert.ok(saved)
        assert.deepEqual(
          saved.candidates.map((candidate) => candidate.validFrom),
          ['2026-08-27T10:00:00.000Z', null]
        )
        assert.ok(
          saved.candidates.every(
            (candidate) =>
              candidate.status === 'candidate' &&
              candidate.kind === 'semantic' &&
              candidate.occurredAt === null
          )
        )
      }
    },
    {
      name: 'candidate with evidence outside the prepared source is removed',
      async run() {
        const invalidStatement =
          'A pessoa escolheu uma sessão que não aparece na evidência fornecida.'
        const scenario = createScenario({
          extraction: extractionResult([
            episodicCandidate(),
            semanticCandidate({
              sourceTurnIds: ['turn-person-1', 'turn-not-in-source'],
              statement: invalidStatement
            })
          ])
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'persisted')
        assert.equal(result.usage.candidateCount, 1)
        assertCallCounts(scenario, {
          resolve: 3,
          extract: 1,
          claim: 1,
          persist: 1
        })

        const saved = scenario.persistence.saveCalls[0]
        assert.ok(saved)
        assert.equal(saved.candidates.length, 1)
        assert.ok(
          saved.candidates.every(
            (candidate) => candidate.statement !== invalidStatement
          )
        )
        assert.ok(
          saved.candidates.every((candidate) =>
            candidate.provenance.sourceTurnIds.every(
              (turnId) => turnId === 'turn-person-1'
            )
          )
        )
      }
    },
    {
      name: 'post-schema compatibility expansion rejects only that candidate',
      async run() {
        const compatibilityExpandedStatement = '\uFB03'.repeat(320)
        const expandedCandidate = semanticCandidate({
          statement: compatibilityExpandedStatement
        })
        assert.equal(
          ExtractedMemoryCandidateSchema.safeParse(expandedCandidate).success,
          true
        )
        assert.ok(compatibilityExpandedStatement.normalize('NFKC').length > 320)

        const scenario = createScenario({
          extraction: extractionResult([
            expandedCandidate,
            semanticCandidate({
              statement:
                'A pessoa prefere manter apenas cartões normalizados e válidos.'
            })
          ])
        })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'persisted')
        assert.equal(result.usage.candidateCount, 1)
        assertCallCounts(scenario, {
          resolve: 3,
          extract: 1,
          claim: 1,
          persist: 1
        })

        const saved = scenario.persistence.saveCalls[0]
        assert.ok(saved)
        assert.equal(saved.candidates.length, 1)
        assert.equal(
          saved.candidates[0]?.statement,
          'A pessoa prefere manter apenas cartões normalizados e válidos.'
        )
      }
    },
    {
      name: 'extractor usage cannot misattribute model or provider identity',
      async run() {
        const scenario = createScenario({
          extraction: extractionResult([episodicCandidate()], {
            inputTokens: 211,
            modelId: 'unexpected-model',
            outputTokens: 37,
            providerId: 'unexpected-provider',
            totalTokens: 248
          })
        })

        const result = await scenario.handler.invoke(buildRequest())
        assert.equal(result.status, 'deferred')
        assert.equal(result.reason, 'extraction-failed')
        assert.equal(result.usage.modelCalls, 1)
        assert.equal(result.usage.actualTotalTokens, null)
        assertCallCounts(scenario, {
          resolve: 2,
          extract: 1,
          claim: 1,
          persist: 0
        })
      }
    },
    {
      name: 'empty extraction abstains without inventing a memory candidate',
      async run() {
        const scenario = createScenario({ extraction: extractionResult([]) })
        const result = await scenario.handler.invoke(buildRequest())

        assert.equal(result.status, 'persisted')
        assert.deepEqual(result.candidateIds, [])
        assert.equal(result.usage.candidateCount, 0)
        assert.equal(result.usage.modelCalls, 1)
        assertCallCounts(scenario, {
          resolve: 3,
          extract: 1,
          claim: 1,
          persist: 1
        })

        const saved = scenario.persistence.saveCalls[0]
        assert.ok(saved)
        assert.deepEqual(saved.candidates, [])
        assert.equal(saved.usage.candidateCount, 0)
      }
    }
  ]
