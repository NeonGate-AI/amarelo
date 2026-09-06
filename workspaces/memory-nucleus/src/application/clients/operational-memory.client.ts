import {
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
  OperationalMemoryUnitOfWork
} from '@application/ports'
import {
  ForgetMemoryUseCase,
  retrieveAuthorizedMemory
} from '@application/use-cases'
import { acceptOperationalExplicitMemory } from './explicit-memory-acceptance.service'
import { mapOperationalMemorySearch } from './operational-memory-search.map'
import { OperationalMemoryRequest } from './operational-memory-request.service'
import { OperationalMemoryError } from './operational-memory.error'

/** Request-bound SDK composition; persistence and locking remain behind its ports. */
export class OperationalMemoryClient extends MemoryClient {
  private readonly scope: MemoryRequestScope
  private readonly request: OperationalMemoryRequest

  constructor(
    scope: MemoryRequestScope,
    unitOfWork: OperationalMemoryUnitOfWork,
    now: () => Date = () => new Date()
  ) {
    super()
    this.request = new OperationalMemoryRequest(scope, unitOfWork, now)
    this.scope = this.request.scope
  }

  async getConsent(): Promise<MemoryConsentState> {
    return this.request.run('consent', async (transaction) =>
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
    return this.request.run('consent', async (transaction) =>
      MemoryConsentStateSchema.parse(await transaction.updateConsent(parsed))
    )
  }

  async rememberExplicitly(
    input: ExplicitMemoryInput,
    options: ExplicitMemoryOptions = {}
  ): Promise<ExplicitMemoryResult> {
    const parsed = ExplicitMemoryInputSchema.parse(input)
    const parsedOptions = ExplicitMemoryOptionsSchema.parse(options)
    this.request.assertPurpose(parsed.purpose)
    return this.request.run('persist', async (transaction) => {
      const staged = await transaction.stageExplicit(parsed, parsedOptions)
      return acceptOperationalExplicitMemory(transaction, this.scope, {
        input: parsed,
        staged
      })
    })
  }

  async search(input: MemorySearchInput): Promise<MemorySearchResult> {
    const parsed = MemorySearchInputSchema.parse(input)
    this.request.assertPurpose(parsed.purpose)
    return this.request.run('retrieve', async (transaction) => {
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
    return this.request.run('delete', async (transaction) => {
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
    this.request.assertCurrent()
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
}
