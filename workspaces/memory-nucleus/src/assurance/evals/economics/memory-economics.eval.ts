import assert from 'node:assert/strict'

import {
  calculateMemoryEconomics,
  type MemoryEconomicsInput
} from '@domain/services'

const profitable = calculateMemoryEconomics({
  inputCostPerMillionTokens: 2,
  memoryProcessingCost: 0.2,
  servingBaselineInputTokens: 600_000,
  servingWithMemoryInputTokens: 200_000,
  totalContextTokens: 2_000,
  usefulContextTokens: 1_500
})

assert.equal(profitable.contextTokensAvoided, 400_000)
assert.equal(profitable.servingCostAvoided, 0.8)
assert.ok(Math.abs(profitable.netMemorySaving - 0.6) < Number.EPSILON)
assert.equal(profitable.memoryRoi, 4)
assert.equal(profitable.contextEfficiency, 0.75)

const negativeSaving = calculateMemoryEconomics({
  inputCostPerMillionTokens: 1,
  memoryProcessingCost: 0.1,
  servingBaselineInputTokens: 100,
  servingWithMemoryInputTokens: 200,
  totalContextTokens: 0,
  usefulContextTokens: 0
})

assert.equal(negativeSaving.contextTokensAvoided, -100)
assert.equal(negativeSaving.contextEfficiency, null)
assert.ok(negativeSaving.netMemorySaving < 0)

assert.throws(
  () =>
    calculateMemoryEconomics({
      inputCostPerMillionTokens: 1,
      memoryProcessingCost: 0,
      servingBaselineInputTokens: 1,
      servingWithMemoryInputTokens: 1,
      totalContextTokens: 1,
      usefulContextTokens: 2
    }),
  RangeError
)

assert.throws(
  () =>
    calculateMemoryEconomics({
      inputCostPerMillionTokens: 1,
      memoryProcessingCost: 1,
      servingBaselineInputTokens: 1,
      servingWithMemoryInputTokens: 0,
      usefulContextTokens: 0
    } as MemoryEconomicsInput),
  RangeError
)

assert.throws(
  () =>
    calculateMemoryEconomics({
      inputCostPerMillionTokens: Number.MAX_VALUE,
      memoryProcessingCost: Number.MIN_VALUE,
      servingBaselineInputTokens: Number.MAX_SAFE_INTEGER,
      servingWithMemoryInputTokens: 0,
      totalContextTokens: 1,
      usefulContextTokens: 1
    }),
  RangeError
)

console.info('[memory-economics] 5 deterministic checks passed')
