import type { Driver, ManagedTransaction } from 'neo4j-driver'
import {
  MemoryUsageLedgerEntrySchema,
  MemoryUsageLedgerScopeSchema,
  type MemoryRequestScope,
  type MemoryUsageLedgerEntry,
  type MemoryUsageLedgerScope
} from '@application/contracts'
import {
  MemoryUsageLedger,
  type MemoryUsageLedgerAppendResult
} from '@application/ports'
import {
  assertNeo4jMemoryScope,
  neo4jMemoryFingerprint
} from './neo4j-memory-scope.guard'

type ImmutableUsageLabel =
  | 'MemoryUsageEvent'
  | 'MemoryUsagePricingSnapshot'
  | 'MemoryUsageBrlConversionSnapshot'

/** Request-bound accounting; this adapter never owns or closes the shared driver. */
export class Neo4jMemoryUsageLedger extends MemoryUsageLedger {
  readonly #requestScope: MemoryRequestScope
  readonly #scope: MemoryUsageLedgerScope
  readonly #scopeKey: string

  constructor(
    private readonly driver: Driver,
    private readonly database: string,
    scope: MemoryRequestScope,
    private readonly now: () => Date,
    private readonly assertReady: () => Promise<void>
  ) {
    super()
    this.#requestScope = Object.freeze({ ...scope })
    assertNeo4jMemoryScope(this.#requestScope, this.now())
    this.#scope = MemoryUsageLedgerScopeSchema.parse({
      tenantId: scope.tenantId,
      subjectId: scope.subjectId
    })
    this.#scopeKey = neo4jMemoryFingerprint([
      'memory-usage-scope-v1',
      this.scope.tenantId,
      this.scope.subjectId
    ])
  }

  get scope(): MemoryUsageLedgerScope {
    return this.#scope
  }

  async append(
    entry: MemoryUsageLedgerEntry
  ): Promise<MemoryUsageLedgerAppendResult> {
    const parsed = MemoryUsageLedgerEntrySchema.parse(entry)
    this.assertAuthority()
    if (
      parsed.usageEvent.tenantId !== this.scope.tenantId ||
      parsed.usageEvent.subjectId !== this.scope.subjectId
    )
      throw new Error('Usage ledger scope mismatch')
    await this.assertReady()
    const session = this.driver.session({ database: this.database })
    try {
      return await session.executeWrite(
        async (transaction) => {
          this.assertAuthority()
          const parameters = {
            scopeKey: this.#scopeKey,
            tenantId: this.scope.tenantId,
            subjectId: this.scope.subjectId,
            identityKey: this.identity('entry', parsed.ledgerEntryId)
          }
          // Serialize immutable identity checks within this ledger, independently of consent.
          await transaction.run(
            `MERGE (h:MemoryUsageLedgerHead {
             scopeKey: $scopeKey, tenantId: $tenantId, subjectId: $subjectId
           })
           ON CREATE SET h.lockVersion = 0
           SET h.lockVersion = h.lockVersion + 1`,
            parameters
          )
          const existing = await transaction.run(
            `MATCH (e:MemoryUsageLedgerEntry {
             identityKey: $identityKey, scopeKey: $scopeKey,
             tenantId: $tenantId, subjectId: $subjectId
           }) RETURN e.serialized AS serialized`,
            parameters
          )
          const serialized = JSON.stringify(parsed)
          if (existing.records.length !== 0) {
            if (existing.records[0]?.get('serialized') !== serialized)
              throw new Error('Usage ledger entry is immutable')
            this.assertAuthority()
            return 'duplicate'
          }
          await this.retainImmutable(
            transaction,
            'MemoryUsageEvent',
            this.identity('event', parsed.usageEvent.eventId),
            parsed.usageEvent
          )
          const price = parsed.pricingSnapshot
          if (price !== null)
            await this.retainImmutable(
              transaction,
              'MemoryUsagePricingSnapshot',
              this.identity(
                'price',
                price.providerId,
                price.modelId,
                price.pricingVersion
              ),
              price
            )
          const conversion = parsed.brlConversionSnapshot
          if (conversion !== null)
            await this.retainImmutable(
              transaction,
              'MemoryUsageBrlConversionSnapshot',
              this.identity(
                'conversion',
                conversion.sourceCurrency,
                conversion.rateVersion
              ),
              conversion
            )
          await transaction.run(
            `CREATE (e:MemoryUsageLedgerEntry {
             identityKey: $identityKey, scopeKey: $scopeKey,
             tenantId: $tenantId, subjectId: $subjectId,
             occurredAt: $occurredAt, serialized: $serialized
           })`,
            {
              ...parameters,
              occurredAt: parsed.usageEvent.occurredAt,
              serialized
            }
          )
          this.assertAuthority()
          return 'inserted'
        },
        { timeout: 1_000 }
      )
    } finally {
      await session.close()
    }
  }

  async entries(): Promise<readonly MemoryUsageLedgerEntry[]> {
    this.assertAuthority()
    await this.assertReady()
    const session = this.driver.session({
      database: this.database,
      defaultAccessMode: 'READ'
    })
    try {
      const entries = await session.executeRead(
        async (transaction) => {
          this.assertAuthority()
          const result = await transaction.run(
            `MATCH (e:MemoryUsageLedgerEntry {
             scopeKey: $scopeKey, tenantId: $tenantId, subjectId: $subjectId
           }) RETURN e.serialized AS serialized
           ORDER BY e.occurredAt, e.identityKey`,
            { scopeKey: this.#scopeKey, ...this.scope }
          )
          return result.records.map((record) => {
            const entry = MemoryUsageLedgerEntrySchema.parse(
              JSON.parse(record.get('serialized'))
            )
            if (
              entry.usageEvent.tenantId !== this.scope.tenantId ||
              entry.usageEvent.subjectId !== this.scope.subjectId
            )
              throw new Error('Usage ledger scope mismatch')
            return entry
          })
        },
        { timeout: 1_000 }
      )
      this.assertAuthority()
      return Object.freeze(entries)
    } finally {
      await session.close()
    }
  }

  private assertAuthority(): void {
    assertNeo4jMemoryScope(this.#requestScope, this.now())
  }

  private identity(kind: string, ...parts: readonly string[]): string {
    return neo4jMemoryFingerprint([this.#scopeKey, kind, ...parts])
  }

  private async retainImmutable(
    transaction: ManagedTransaction,
    label: ImmutableUsageLabel,
    identityKey: string,
    snapshot: object
  ): Promise<void> {
    const serialized = JSON.stringify(snapshot)
    const result = await transaction.run(
      `MERGE (n:${label} {
         identityKey: $identityKey, scopeKey: $scopeKey,
         tenantId: $tenantId, subjectId: $subjectId
       }) ON CREATE SET n.serialized = $serialized
       RETURN n.serialized AS serialized`,
      { identityKey, scopeKey: this.#scopeKey, ...this.scope, serialized }
    )
    if (result.records[0]?.get('serialized') !== serialized)
      throw new Error('Usage snapshot identity is immutable')
  }
}
