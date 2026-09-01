import assert from 'node:assert/strict'

import { MemoryCurationUsageSchema } from '#application/contracts/memory-curation.contract'
import type { MemoryExtractionResult } from '#application/ports/memory-extractor.port'
import { SaveCurationRunRequestSchema } from '#application/ports/memory-curation-persistence.port'
import type { MemoryCurationEvalCase } from './memory-curation-eval.contract'
import {
  buildRequest,
  createScenario,
  extractionResult,
  semanticCandidate
} from './memory-curation.fixtures'

export const memoryCurationCostEvalCases: readonly MemoryCurationEvalCase[] = [
  {
    name: 'actual and estimated token ledger is persisted with the batch',
    async run() {
      const usage: MemoryExtractionResult['usage'] = {
        inputTokens: 233,
        modelId: 'mock-memory-model',
        outputTokens: 41,
        providerId: 'mock-provider',
        totalTokens: 274
      }
      const scenario = createScenario({
        extraction: extractionResult([semanticCandidate()], usage)
      })
      const result = await scenario.handler.invoke(buildRequest())

      assert.equal(result.status, 'persisted')
      assert.equal(result.usage.actualInputTokens, 233)
      assert.equal(result.usage.actualOutputTokens, 41)
      assert.equal(result.usage.actualTotalTokens, 274)
      assert.equal(result.usage.modelCalls, 1)
      assert.equal(result.usage.candidateCount, 1)
      assert.ok(result.usage.estimatedInputTokens > 0)
      assert.equal(
        result.usage.inputEstimatorVersion,
        'memory-extraction-utf8-byte-v1'
      )

      const saved = scenario.persistence.saveCalls[0]
      assert.ok(saved)
      assert.deepEqual(saved.usage, result.usage)
    }
  },
  {
    name: 'usage and persistence schemas reject impossible token ledgers',
    async run() {
      const scenario = createScenario({
        extraction: extractionResult([semanticCandidate()])
      })
      const result = await scenario.handler.invoke(buildRequest())
      const saved = scenario.persistence.saveCalls[0]
      assert.equal(result.status, 'persisted')
      assert.ok(saved)

      assert.equal(
        MemoryCurationUsageSchema.safeParse({
          ...saved.usage,
          actualInputTokens: 233,
          actualOutputTokens: 41,
          actualTotalTokens: 1
        }).success,
        false
      )
      assert.equal(
        MemoryCurationUsageSchema.safeParse({
          ...saved.usage,
          actualInputTokens: 1,
          actualOutputTokens: null,
          actualTotalTokens: null,
          candidateCount: 0,
          modelCalls: 0
        }).success,
        false
      )
      assert.equal(
        MemoryCurationUsageSchema.safeParse({
          ...saved.usage,
          actualInputTokens: null,
          actualOutputTokens: null,
          actualTotalTokens: null,
          candidateCount: 1,
          modelCalls: 0
        }).success,
        false
      )
      assert.equal(
        SaveCurationRunRequestSchema.safeParse({
          ...saved,
          usage: {
            ...saved.usage,
            actualTotalTokens: 1
          }
        }).success,
        false
      )
    }
  }
]
