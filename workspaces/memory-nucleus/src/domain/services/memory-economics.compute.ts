export interface MemoryEconomicsInput {
  /** Input-token price in the caller's chosen currency per one million tokens. */
  readonly inputCostPerMillionTokens: number
  /**
   * Total incremental Memory Nucleus cost for the measurement window in the
   * same currency, including attributable curation, retrieval, storage,
   * lifecycle, and evaluation cost rather than model extraction alone.
   */
  readonly memoryProcessingCost: number
  readonly servingBaselineInputTokens: number
  readonly servingWithMemoryInputTokens: number
  readonly totalContextTokens: number
  readonly usefulContextTokens: number
}

export interface MemoryEconomicsMetrics {
  readonly contextEfficiency: number | null
  readonly contextTokensAvoided: number
  readonly memoryRoi: number | null
  readonly netMemorySaving: number
  readonly servingCostAvoided: number
}

const assertFiniteNonNegative = (value: number, fieldName: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a finite non-negative number`)
  }
}

const assertSafeNonNegativeInteger = (
  value: number,
  fieldName: string
): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a safe non-negative integer`)
  }
}

const assertFiniteResult = (value: number, fieldName: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${fieldName} exceeded the finite numeric range`)
  }
}

/**
 * Calculates provider-neutral memory economics. Prices are explicit inputs so
 * volatile provider pricing and exchange rates never become domain constants.
 */
export const calculateMemoryEconomics = (
  input: MemoryEconomicsInput
): MemoryEconomicsMetrics => {
  assertFiniteNonNegative(
    input.inputCostPerMillionTokens,
    'inputCostPerMillionTokens'
  )
  assertFiniteNonNegative(input.memoryProcessingCost, 'memoryProcessingCost')
  assertSafeNonNegativeInteger(
    input.servingBaselineInputTokens,
    'servingBaselineInputTokens'
  )
  assertSafeNonNegativeInteger(
    input.servingWithMemoryInputTokens,
    'servingWithMemoryInputTokens'
  )
  assertSafeNonNegativeInteger(input.totalContextTokens, 'totalContextTokens')
  assertSafeNonNegativeInteger(input.usefulContextTokens, 'usefulContextTokens')

  if (input.usefulContextTokens > input.totalContextTokens) {
    throw new RangeError(
      'usefulContextTokens must not exceed totalContextTokens'
    )
  }

  const contextTokensAvoided =
    input.servingBaselineInputTokens - input.servingWithMemoryInputTokens
  const servingCostAvoided =
    (contextTokensAvoided / 1_000_000) * input.inputCostPerMillionTokens
  const netMemorySaving = servingCostAvoided - input.memoryProcessingCost
  const contextEfficiency =
    input.totalContextTokens === 0
      ? null
      : input.usefulContextTokens / input.totalContextTokens
  const memoryRoi =
    input.memoryProcessingCost === 0
      ? null
      : servingCostAvoided / input.memoryProcessingCost

  assertFiniteResult(servingCostAvoided, 'servingCostAvoided')
  assertFiniteResult(netMemorySaving, 'netMemorySaving')

  if (contextEfficiency !== null) {
    assertFiniteResult(contextEfficiency, 'contextEfficiency')
  }

  if (memoryRoi !== null) {
    assertFiniteResult(memoryRoi, 'memoryRoi')
  }

  return Object.freeze({
    contextEfficiency,
    contextTokensAvoided,
    memoryRoi,
    netMemorySaving,
    servingCostAvoided
  })
}
