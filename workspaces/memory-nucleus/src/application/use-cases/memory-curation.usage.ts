import type { MemoryCurationUsage } from '@application/contracts/memory-curation.contract'
import type { MemoryModelUsage } from '@application/ports/memory-extractor.port'

export interface CreateMemoryCurationUsageInput {
  candidateCount: number
  estimatedInputTokens: number
  fallbackModelId: string
  fallbackProviderId: string
  inputEstimatorVersion: string
  modelCalls: 0 | 1
  modelUsage: MemoryModelUsage | null
}

export const createMemoryCurationUsage = (
  input: CreateMemoryCurationUsageInput
): MemoryCurationUsage => ({
  actualInputTokens: input.modelUsage?.inputTokens ?? null,
  actualOutputTokens: input.modelUsage?.outputTokens ?? null,
  actualTotalTokens: input.modelUsage?.totalTokens ?? null,
  candidateCount: input.candidateCount,
  estimatedInputTokens: input.estimatedInputTokens,
  inputEstimatorVersion: input.inputEstimatorVersion,
  modelId: input.modelUsage?.modelId ?? input.fallbackModelId,
  modelCalls: input.modelCalls,
  providerId: input.modelUsage?.providerId ?? input.fallbackProviderId,
  sourceWasTruncated: false
})
