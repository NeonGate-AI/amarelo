import {
  createExplicitMemoryResultSchema,
  ExplicitMemoryInputSchema,
  ExplicitMemoryOptionsSchema,
  MemoryClient,
  MemoryConsentStateSchema,
  MemoryDeletionReceiptSchema,
  MemorySearchInputSchema,
  UpdateMemoryConsentInputSchema,
  type ExplicitMemoryInput,
  type ExplicitMemoryOptions,
  type ExplicitMemoryResult,
  type MemoryConsentState,
  type MemoryCorrectionInput,
  type MemoryCorrectionResult,
  type MemoryDeletionReceipt,
  type MemorySearchInput,
  type MemorySearchResult,
  type UpdateMemoryConsentInput
} from '@repo/memory-sdk'
import type { MemoryRequestScope } from '@application/contracts'
import type {
  MemoryRetrievalTrace,
  OperationalMemoryOperation,
  OperationalMemoryTransaction,
  OperationalMemoryUnitOfWork
} from '@application/ports'
import {
  AcceptMemoryCandidateUseCase,
  ForgetMemoryUseCase,
  retrieveAuthorizedMemory
} from '@application/use-cases'
import { MemoryJudgment } from '@domain/value-objects'
import { mapOperationalMemorySearch } from './operational-memory-search.map'
import { OperationalMemoryError } from './operational-memory.error'

/** Request-bound SDK composition; persistence and locking remain behind its ports. */
export class OperationalMemoryClient extends MemoryClient {
  private readonly scope: MemoryRequestScope

  constructor(
    scope: MemoryRequestScope,
    private readonly unitOfWork: OperationalMemoryUnitOfWork,
    private readonly now: () => Date = () => new Date()
  ) {
    super()
    this.scope = Object.freeze({ ...scope })
    this.assertRequest()
  }

  async getConsent(): Promise<MemoryConsentState> {
    return this.run('consent', async (transaction) =>
      MemoryConsentStateSchema.parse(await transaction.getConsent())
    )
  }

  async updateConsent(
    input: UpdateMemoryConsentInput
  ): Promise<MemoryConsentState> {
    const parsed = UpdateMemoryConsentInputSchema.parse(input)
    if (parsed.changes.some(({ purpose }) => purpose !== this.scope.purpose)) {
      throw new OperationalMemoryError('scope-mismatch')
    }
    return this.run('consent', async (transaction) =>
      MemoryConsentStateSchema.parse(await transaction.updateConsent(parsed))
    )
  }

  async rememberExplicitly(
    input: ExplicitMemoryInput,
    options: ExplicitMemoryOptions = {}
  ): Promise<ExplicitMemoryResult> {
    const parsed = ExplicitMemoryInputSchema.parse(input)
    const parsedOptions = ExplicitMemoryOptionsSchema.parse(options)
    this.assertPurpose(parsed.purpose)
    return this.run('persist', async (transaction) => {
      const staged = await transaction.stageExplicit(parsed, parsedOptions)
      await transaction.assertAuthority()
      const accepted = await new AcceptMemoryCandidateUseCase(
        transaction.canonical
      ).execute({
        ...staged,
        canonicalKey: parsed.semanticKey,
        category: parsed.category,
        confidence: 1,
        judgment: MemoryJudgment.create({
          confidence: 1,
          decision: 'remember',
          rationaleCode: 'explicit-subject-request'
        }),
        kind: parsed.kind,
        policyVersion: 'memory-explicit-acceptance-v1',
        viewIds: ['personal']
      })
      const result = createExplicitMemoryResultSchema(parsed).parse(
        await transaction.readRecord(accepted.memoryId)
      )
      if (
        result.provenance.authorId !== this.scope.actorId ||
        result.id !== accepted.memoryId ||
        result.version !== accepted.version
      ) {
        throw new OperationalMemoryError('scope-mismatch')
      }
      return result
    })
  }

  async search(input: MemorySearchInput): Promise<MemorySearchResult> {
    const parsed = MemorySearchInputSchema.parse(input)
    this.assertPurpose(parsed.purpose)
    return this.run('retrieve', async (transaction) => {
      const authorization = await transaction.authorizeSearch(parsed)
      if (
        authorization.query.tenantId !== this.scope.tenantId ||
        authorization.query.subjectId !== this.scope.subjectId ||
        authorization.query.purpose !== this.scope.purpose ||
        (parsed.categories !== undefined &&
          authorization.query.categories.some(
            (category) => !parsed.categories?.includes(category)
          )) ||
        (parsed.kinds !== undefined &&
          authorization.query.kinds.some(
            (kind) => !parsed.kinds?.includes(kind)
          ))
      ) {
        throw new OperationalMemoryError('scope-mismatch')
      }
      let trace: MemoryRetrievalTrace | undefined
      const result = await retrieveAuthorizedMemory(authorization.query, {
        ...authorization.dependencies,
        observer: {
          record: (observation, context) => {
            trace = observation
            return authorization.dependencies.observer.record(
              observation,
              context
            )
          }
        }
      })
      if (trace === undefined) {
        throw new OperationalMemoryError('invalid-result')
      }
      const records = []
      for (const item of result.items) {
        const record = await transaction.readRecord(item.id)
        if (record === null) {
          throw new OperationalMemoryError('invalid-result')
        }
        records.push(record)
      }
      return mapOperationalMemorySearch({
        authorization,
        input: parsed,
        records,
        result,
        scope: this.scope,
        trace
      })
    })
  }

  async forget(memoryId: string): Promise<MemoryDeletionReceipt> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(memoryId)) {
      throw new OperationalMemoryError('invalid-request')
    }
    return this.run('delete', async (transaction) => {
      const previous = await transaction.readDeletionReceipt(memoryId)
      if (previous !== null) return this.parseReceipt(previous, memoryId)
      await transaction.assertAuthority()
      await new ForgetMemoryUseCase(transaction.canonical).execute({
        memoryId,
        reasonCode: 'explicit-subject-request',
        subjectId: this.scope.subjectId,
        tenantId: this.scope.tenantId
      })
      return this.parseReceipt(
        await transaction.readDeletionReceipt(memoryId),
        memoryId
      )
    })
  }

  async correct(
    _input: MemoryCorrectionInput
  ): Promise<MemoryCorrectionResult> {
    this.assertRequest()
    throw new OperationalMemoryError('unsupported-operation')
  }

  private parseReceipt(
    value: unknown,
    memoryId: string
  ): MemoryDeletionReceipt {
    const receipt = MemoryDeletionReceiptSchema.parse(value)
    if (receipt.memoryId !== memoryId) {
      throw new OperationalMemoryError('invalid-result')
    }
    return receipt
  }

  private assertPurpose(purpose: string): void {
    if (purpose !== this.scope.purpose) {
      throw new OperationalMemoryError('scope-mismatch')
    }
  }

  private assertRequest(): void {
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
      !['development-text', 'synthetic-transcript'].includes(
        this.scope.sourceKind
      ) ||
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

  private async run<T>(
    operation: OperationalMemoryOperation,
    work: (transaction: OperationalMemoryTransaction) => Promise<T>
  ): Promise<T> {
    this.assertRequest()
    const result = await this.unitOfWork.run(
      this.scope,
      operation,
      async (transaction) => {
        await transaction.assertAuthority()
        const value = await work(transaction)
        this.assertRequest()
        await transaction.assertAuthority()
        return value
      }
    )
    this.assertRequest()
    return result
  }
}
