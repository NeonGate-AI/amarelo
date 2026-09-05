import { MemoryUsageLedgerEntrySchema } from '@application/contracts'
import type {
  MemoryUsageLedger,
  MemoryUsageLedgerAppendResult
} from '@application/ports'

export class RecordMemoryUsageUseCase {
  constructor(private readonly ledger: MemoryUsageLedger) {}

  async execute(entry: unknown): Promise<MemoryUsageLedgerAppendResult> {
    const parsed = MemoryUsageLedgerEntrySchema.parse(entry)
    if (
      parsed.usageEvent.tenantId !== this.ledger.scope.tenantId ||
      parsed.usageEvent.subjectId !== this.ledger.scope.subjectId
    ) {
      throw new Error('Usage ledger scope mismatch')
    }
    return this.ledger.append(parsed)
  }
}
