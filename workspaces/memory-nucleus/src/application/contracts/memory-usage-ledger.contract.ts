import { z } from 'zod'

import {
  MemoryBrlConversionSnapshotSchema,
  MemoryPricingCurrencySchema,
  MemoryPricingSnapshotSchema
} from './memory-pricing.contract'
import {
  MemoryUsageEventSchema,
  MemoryUsageIdentifierSchema
} from './memory-usage.contract'

export const MemoryUsageLedgerScopeSchema = z
  .strictObject({
    tenantId: MemoryUsageIdentifierSchema,
    subjectId: MemoryUsageIdentifierSchema
  })
  .readonly()
export type MemoryUsageLedgerScope = z.infer<
  typeof MemoryUsageLedgerScopeSchema
>

const AmountSchema = z.number().finite().nonnegative().nullable()

/** Each valuation retains original usage and immutable rate provenance. */
export const MemoryUsageLedgerEntrySchema = z
  .strictObject({
    schemaVersion: z.literal('memory-usage-ledger-v1'),
    ledgerEntryId: MemoryUsageIdentifierSchema,
    usageEvent: MemoryUsageEventSchema,
    pricingSnapshot: MemoryPricingSnapshotSchema.nullable(),
    brlConversionSnapshot: MemoryBrlConversionSnapshotSchema.nullable(),
    cost: z
      .strictObject({
        sourceAmount: AmountSchema,
        sourceCurrency: MemoryPricingCurrencySchema.nullable(),
        brlAmount: AmountSchema,
        evidence: z.enum([
          'unknown',
          'calculated',
          'provider-reported',
          'invoice-reconciled'
        ]),
        calculationVersion: MemoryUsageIdentifierSchema.nullable()
      })
      .readonly()
  })
  .superRefine((entry, context) => {
    const { cost, pricingSnapshot, usageEvent } = entry
    const provider = usageEvent.providerUsage
    if (
      (cost.sourceAmount === null &&
        (cost.brlAmount !== null ||
          cost.evidence !== 'unknown' ||
          cost.calculationVersion !== null)) ||
      (cost.sourceAmount !== null &&
        (cost.sourceCurrency === null ||
          cost.evidence === 'unknown' ||
          provider === null)) ||
      (cost.evidence === 'calculated' &&
        (pricingSnapshot === null ||
          usageEvent.providerUsage === null ||
          cost.calculationVersion === null))
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Cost requires its stated evidence; unavailable cost stays null',
        path: ['cost']
      })
    }
    if (
      pricingSnapshot !== null &&
      ((cost.sourceCurrency !== null &&
        cost.sourceCurrency !== pricingSnapshot.currency) ||
        (provider !== null &&
          (provider.providerId !== pricingSnapshot.providerId ||
            provider.modelId !== pricingSnapshot.modelId ||
            provider.modelVersion !== pricingSnapshot.modelVersion)))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Pricing identity and original currency must match usage',
        path: ['pricingSnapshot']
      })
    }
    if (
      cost.evidence === 'calculated' &&
      provider !== null &&
      pricingSnapshot !== null
    ) {
      const counters = [
        provider.inputTextTokens,
        provider.cachedInputTextTokens,
        provider.inputAudioTokens,
        provider.cachedInputAudioTokens,
        provider.outputTextTokens,
        provider.outputAudioTokens
      ]
      if (
        counters.some((value) => value === null) ||
        Object.values(pricingSnapshot.rates).some((value) => value === null)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Calculated cost requires complete billable usage and rates',
          path: ['cost']
        })
      }
    }
    const conversion = entry.brlConversionSnapshot
    if (
      conversion !== null &&
      cost.sourceCurrency !== null &&
      conversion.sourceCurrency !== cost.sourceCurrency
    ) {
      context.addIssue({
        code: 'custom',
        message: 'BRL conversion must identify the original currency',
        path: ['brlConversionSnapshot']
      })
    }
    if (cost.brlAmount !== null && cost.sourceAmount !== null) {
      const expected =
        cost.sourceCurrency === 'BRL'
          ? cost.sourceAmount
          : conversion === null
            ? null
            : cost.sourceAmount * conversion.brlPerSourceCurrencyUnit
      if (
        expected === null ||
        !Number.isFinite(expected) ||
        Math.abs(cost.brlAmount - expected) >
          Number.EPSILON * 16 * Math.max(1, expected)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'BRL cost requires its matching conversion snapshot',
          path: ['cost', 'brlAmount']
        })
      }
    }
  })
  .readonly()
export type MemoryUsageLedgerEntry = z.infer<
  typeof MemoryUsageLedgerEntrySchema
>
