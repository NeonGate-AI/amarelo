import { z } from 'zod'

import { MemoryUsageIdentifierSchema } from './memory-usage.contract'

export const MemoryPricingCurrencySchema = z.string().regex(/^[A-Z]{3}$/)
const RateSchema = z.number().finite().nonnegative().nullable()

/** Historical rates are snapshots, never mutable current-price lookups. */
export const MemoryPricingSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal('memory-pricing-v1'),
    pricingVersion: MemoryUsageIdentifierSchema,
    providerId: MemoryUsageIdentifierSchema,
    modelId: MemoryUsageIdentifierSchema,
    modelVersion: MemoryUsageIdentifierSchema.nullable(),
    currency: MemoryPricingCurrencySchema,
    effectiveAt: z.iso.datetime(),
    provenance: z.enum(['published', 'synthetic']),
    sourceReference: MemoryUsageIdentifierSchema,
    unit: z.literal('currency-per-million-tokens'),
    rates: z
      .strictObject({
        inputText: RateSchema,
        cachedInputText: RateSchema,
        inputAudio: RateSchema,
        cachedInputAudio: RateSchema,
        outputText: RateSchema,
        outputAudio: RateSchema
      })
      .readonly()
  })
  .readonly()
export type MemoryPricingSnapshot = z.infer<typeof MemoryPricingSnapshotSchema>

export const MemoryBrlConversionSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal('memory-brl-conversion-v1'),
    rateVersion: MemoryUsageIdentifierSchema,
    sourceCurrency: MemoryPricingCurrencySchema,
    targetCurrency: z.literal('BRL'),
    brlPerSourceCurrencyUnit: z.number().finite().positive(),
    effectiveAt: z.iso.datetime(),
    provenance: z.enum(['published', 'synthetic']),
    sourceReference: MemoryUsageIdentifierSchema
  })
  .readonly()
export type MemoryBrlConversionSnapshot = z.infer<
  typeof MemoryBrlConversionSnapshotSchema
>
