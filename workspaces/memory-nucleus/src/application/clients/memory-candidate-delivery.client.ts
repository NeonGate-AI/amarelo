import type {
  ExplicitMemoryInput,
  ExplicitMemoryOptions,
  ExplicitMemoryResult
} from '@repo/memory-sdk'
import type {
  MemoryCandidateDeliveryClient,
  MemoryCandidateStageResult,
  MemoryRequestScope,
  TrustedMemorySource
} from '@application/contracts'
import type { OperationalMemoryUnitOfWork } from '@application/ports'

/** Public behavioral-red seam for committed evidence followed by fresh-authority promotion. */
export class OperationalMemoryCandidateDeliveryClient
  implements MemoryCandidateDeliveryClient
{
  constructor(
    _scope: MemoryRequestScope,
    _unitOfWork: OperationalMemoryUnitOfWork,
    _now: () => Date = () => new Date()
  ) {}

  async stageExplicit(
    _input: ExplicitMemoryInput,
    _options: ExplicitMemoryOptions,
    _trustedSource: TrustedMemorySource
  ): Promise<MemoryCandidateStageResult> {
    throw new Error('Memory candidate delivery is not implemented')
  }

  async promoteExplicit(_candidateId: string): Promise<ExplicitMemoryResult> {
    throw new Error('Memory candidate delivery is not implemented')
  }
}
