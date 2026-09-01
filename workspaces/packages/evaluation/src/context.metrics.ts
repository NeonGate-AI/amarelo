export interface ContextEfficiencyMetrics {
  readonly compressionRatio: number | null
  readonly qualityRetention: number | null
  readonly tokensAvoided: number
}

/** Generic deterministic context-efficiency metrics shared by AI and Memory evals. */
export function scoreContextEfficiency(input: {
  baselineTokens: number
  projectedTokens: number
  baselineQuality?: number
  projectedQuality?: number
}): ContextEfficiencyMetrics {
  for (const [name, value] of Object.entries({
    baselineTokens: input.baselineTokens,
    projectedTokens: input.projectedTokens
  })) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative safe integer`)
    }
  }
  const tokensAvoided = input.baselineTokens - input.projectedTokens
  const compressionRatio = input.baselineTokens === 0 ? null : input.projectedTokens / input.baselineTokens
  const qualityRetention =
    input.baselineQuality === undefined || input.projectedQuality === undefined || input.baselineQuality === 0
      ? null
      : input.projectedQuality / input.baselineQuality
  return Object.freeze({ compressionRatio, qualityRetention, tokensAvoided })
}
