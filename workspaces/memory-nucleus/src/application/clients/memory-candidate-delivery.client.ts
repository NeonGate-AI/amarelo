import {
  ExplicitMemoryInputSchema,
  ExplicitMemoryOptionsSchema,
  type ExplicitMemoryInput,
  type ExplicitMemoryOptions,
  type ExplicitMemoryResult
} from '@repo/memory-sdk'
import type {
  MemoryCandidateDeliveryClient,
  MemoryCandidateStageResult,
  MemoryRequestScope,
  TrustedMemorySource
} from '@application/contracts'
import type { OperationalMemoryUnitOfWork } from '@application/ports'
import { acceptOperationalExplicitMemory } from './explicit-memory-acceptance.service'
import { prepareEligibleMemorySource } from './memory-source.validate'
import { OperationalMemoryRequest } from './operational-memory-request.service'
import { OperationalMemoryError } from './operational-memory.error'

/** Committed patient evidence followed by promotion under freshly checked authority. */
export class OperationalMemoryCandidateDeliveryClient
  implements MemoryCandidateDeliveryClient
{
  private readonly request: OperationalMemoryRequest

  constructor(
    scope: MemoryRequestScope,
    unitOfWork: OperationalMemoryUnitOfWork,
    private readonly now: () => Date = () => new Date()
  ) {
    this.request = new OperationalMemoryRequest(scope, unitOfWork, now)
  }

  async stageExplicit(
    input: ExplicitMemoryInput,
    options: ExplicitMemoryOptions,
    trustedSource: TrustedMemorySource
  ): Promise<MemoryCandidateStageResult> {
    this.request.assertCurrent()
    const source = prepareEligibleMemorySource(
      trustedSource,
      this.request.scope,
      this.now()
    )
    if (source === null) {
      return Object.freeze({ status: 'skipped', reason: 'no-subject-evidence' })
    }
    const parsed = ExplicitMemoryInputSchema.parse(input)
    const parsedOptions = ExplicitMemoryOptionsSchema.parse(options)
    this.request.assertPurpose(parsed.purpose)
    if (source.text !== parsed.statement) {
      throw new OperationalMemoryError('invalid-source')
    }
    return this.request.run('persist', async (transaction) => {
      const staged = await transaction.stageExplicit(
        parsed,
        parsedOptions,
        source
      )
      return Object.freeze({
        status: 'staged',
        candidateId: staged.candidateId
      })
    })
  }

  async promoteExplicit(candidateId: string): Promise<ExplicitMemoryResult> {
    if (
      typeof candidateId !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(candidateId)
    ) {
      throw new OperationalMemoryError('invalid-request')
    }
    return this.request.run('persist', async (transaction) => {
      const candidate = await transaction.loadExplicitCandidate(candidateId)
      if (candidate.staged.candidateId !== candidateId) {
        throw new OperationalMemoryError('invalid-result')
      }
      return acceptOperationalExplicitMemory(
        transaction,
        this.request.scope,
        candidate
      )
    })
  }
}
