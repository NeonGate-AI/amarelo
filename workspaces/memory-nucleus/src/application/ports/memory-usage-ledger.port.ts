import type {
  MemoryUsageLedgerEntry,
  MemoryUsageLedgerScope
} from '@application/contracts'

export type MemoryUsageLedgerAppendResult = 'inserted' | 'duplicate'

/** Append-only scoped storage; retries must not overwrite usage or price history. */
export abstract class MemoryUsageLedger {
  abstract readonly scope: MemoryUsageLedgerScope
  abstract append(
    entry: MemoryUsageLedgerEntry
  ): Promise<MemoryUsageLedgerAppendResult>
  abstract entries(): Promise<readonly MemoryUsageLedgerEntry[]>
}
