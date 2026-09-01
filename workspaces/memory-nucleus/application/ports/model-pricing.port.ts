export interface ModelInputPrice {
  readonly currency: string
  readonly inputCostPerMillionTokens: number
}

/** Provider-neutral pricing boundary used by memory economics. */
export abstract class ModelPricingPort {
  abstract inputPrice(modelId: string): Promise<ModelInputPrice>
}
