import {
  MemoryUsageLedgerEntrySchema,
  MemoryUsageLedgerScopeSchema,
  type MemoryUsageLedgerScope,
  type MemoryUsageLedgerEntry
} from '@application/contracts'
import {
  MemoryUsageLedger,
  type MemoryUsageLedgerAppendResult
} from '@application/ports'

/** Deterministic reference only; production composition supplies durable storage. */
export class InMemoryMemoryUsageLedger extends MemoryUsageLedger {
  readonly #scope: MemoryUsageLedgerScope
  readonly #entries = new Map<string, MemoryUsageLedgerEntry>()
  readonly #events = new Map<string, string>()
  readonly #prices = new Map<string, string>()
  readonly #conversionRates = new Map<string, string>()

  constructor(scope: MemoryUsageLedgerScope) {
    super()
    this.#scope = MemoryUsageLedgerScopeSchema.parse(scope)
  }

  get scope(): MemoryUsageLedgerScope {
    return this.#scope
  }

  async append(
    entry: MemoryUsageLedgerEntry
  ): Promise<MemoryUsageLedgerAppendResult> {
    const parsed = MemoryUsageLedgerEntrySchema.parse(entry)
    if (
      parsed.usageEvent.tenantId !== this.scope.tenantId ||
      parsed.usageEvent.subjectId !== this.scope.subjectId
    ) {
      throw new Error('Usage ledger scope mismatch')
    }
    const existing = this.#entries.get(parsed.ledgerEntryId)
    if (existing !== undefined) {
      if (JSON.stringify(existing) !== JSON.stringify(parsed)) {
        throw new Error('Usage ledger entry is immutable')
      }
      return 'duplicate'
    }
    const serializedEvent = JSON.stringify(parsed.usageEvent)
    const previousEvent = this.#events.get(parsed.usageEvent.eventId)
    if (previousEvent !== undefined && previousEvent !== serializedEvent) {
      throw new Error('Usage event identity is immutable')
    }
    const price = parsed.pricingSnapshot
    const priceKey =
      price === null
        ? null
        : JSON.stringify([
            price.providerId,
            price.modelId,
            price.pricingVersion
          ])
    const serializedPrice = JSON.stringify(price)
    if (priceKey !== null) {
      const previousPrice = this.#prices.get(priceKey)
      if (previousPrice !== undefined && previousPrice !== serializedPrice) {
        throw new Error('Pricing snapshot identity is immutable')
      }
    }
    const conversion = parsed.brlConversionSnapshot
    const conversionKey =
      conversion === null
        ? null
        : JSON.stringify([conversion.sourceCurrency, conversion.rateVersion])
    const serializedConversion = JSON.stringify(conversion)
    if (conversionKey !== null) {
      const previousConversion = this.#conversionRates.get(conversionKey)
      if (
        previousConversion !== undefined &&
        previousConversion !== serializedConversion
      ) {
        throw new Error('BRL conversion snapshot identity is immutable')
      }
    }
    this.#entries.set(parsed.ledgerEntryId, parsed)
    this.#events.set(parsed.usageEvent.eventId, serializedEvent)
    if (priceKey !== null) this.#prices.set(priceKey, serializedPrice)
    if (conversionKey !== null)
      this.#conversionRates.set(conversionKey, serializedConversion)
    return 'inserted'
  }

  async entries(): Promise<readonly MemoryUsageLedgerEntry[]> {
    return Object.freeze([...this.#entries.values()])
  }
}
