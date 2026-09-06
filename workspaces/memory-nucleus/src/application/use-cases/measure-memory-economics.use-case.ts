import {
  calculateMemoryEconomics,
  type MemoryEconomicsMetrics
} from '@domain/services'
import type { MemoryObservabilityPort } from '@application/ports'
import { Money } from '@domain/value-objects'
import type { ModelPricingPort } from '@application/ports'

export interface MeasureMemoryEconomicsInput {
  readonly modelId: string
  readonly memoryProcessingCost: number
  readonly servingBaselineInputTokens: number
  readonly servingWithMemoryInputTokens: number
  readonly totalContextTokens: number
  readonly usefulContextTokens: number
}

export interface MeasuredMemoryEconomics extends MemoryEconomicsMetrics {
  readonly currency: string
}

export class MeasureMemoryEconomicsUseCase {
  constructor(
    private readonly pricing: ModelPricingPort,
    private readonly observability: MemoryObservabilityPort
  ) {}

  async execute(
    input: MeasureMemoryEconomicsInput
  ): Promise<MeasuredMemoryEconomics> {
    const price = await this.pricing.inputPrice(input.modelId)
    const processingCost = Money.of(input.memoryProcessingCost, price.currency)
    const metrics = calculateMemoryEconomics({
      inputCostPerMillionTokens: price.inputCostPerMillionTokens,
      memoryProcessingCost: input.memoryProcessingCost,
      servingBaselineInputTokens: input.servingBaselineInputTokens,
      servingWithMemoryInputTokens: input.servingWithMemoryInputTokens,
      totalContextTokens: input.totalContextTokens,
      usefulContextTokens: input.usefulContextTokens
    })

    const servingAvoided = Money.of(metrics.servingCostAvoided, price.currency)
    const netSaving = servingAvoided.minus(processingCost)
    if (
      Math.abs(netSaving.amount - metrics.netMemorySaving) >
      Number.EPSILON * 16
    ) {
      throw new Error('domain economics calculation became inconsistent')
    }

    for (const [name, value] of Object.entries(metrics)) {
      if (value !== null) {
        await this.observability.metric({
          name: `memory.economics.${name}`,
          value,
          attributes: { currency: price.currency, modelId: input.modelId }
        })
      }
    }

    return Object.freeze({ ...metrics, currency: price.currency })
  }
}
