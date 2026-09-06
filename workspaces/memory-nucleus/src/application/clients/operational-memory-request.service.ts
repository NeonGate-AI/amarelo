import type { MemoryRequestScope } from '@application/contracts'
import type {
  OperationalMemoryOperation,
  OperationalMemoryTransaction,
  OperationalMemoryUnitOfWork
} from '@application/ports'
import { OperationalMemoryError } from './operational-memory.error'

/** One immutable request and its authority checks shared by both SDK entry points. */
export class OperationalMemoryRequest {
  readonly scope: MemoryRequestScope

  constructor(
    scope: MemoryRequestScope,
    private readonly unitOfWork: OperationalMemoryUnitOfWork,
    private readonly now: () => Date = () => new Date()
  ) {
    this.scope = Object.freeze({ ...scope })
    this.assertCurrent()
  }

  assertPurpose(purpose: string): void {
    if (purpose !== this.scope.purpose) {
      throw new OperationalMemoryError('scope-mismatch')
    }
  }

  assertCurrent(): void {
    const instant = this.now().getTime()
    if (
      !Number.isFinite(instant) ||
      !Number.isFinite(this.scope.expiresAtMs) ||
      this.scope.expiresAtMs <= instant
    ) {
      throw new OperationalMemoryError('expired-request')
    }
    if (
      this.scope.actorId !== this.scope.subjectId ||
      this.scope.purpose !== 'conversation.support' ||
      ![
        'development-text',
        'synthetic-transcript',
        'realtime-transcript'
      ].includes(this.scope.sourceKind) ||
      [
        this.scope.tenantId,
        this.scope.subjectId,
        this.scope.actorId,
        this.scope.authenticationSessionId,
        this.scope.conversationId,
        this.scope.requestId
      ].some(
        (value) =>
          typeof value !== 'string' ||
          !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value)
      )
    ) {
      throw new OperationalMemoryError('scope-mismatch')
    }
  }

  async run<T>(
    operation: OperationalMemoryOperation,
    work: (transaction: OperationalMemoryTransaction) => Promise<T>
  ): Promise<T> {
    this.assertCurrent()
    const result = await this.unitOfWork.run(
      this.scope,
      operation,
      async (transaction) => {
        await transaction.assertAuthority()
        const value = await work(transaction)
        this.assertCurrent()
        await transaction.assertAuthority()
        return value
      }
    )
    this.assertCurrent()
    return result
  }
}
