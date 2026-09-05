import type { CandidateResolutionPort } from '@application/ports'
import { MemoryJudgment } from '@domain/value-objects'

export interface ResolveMemoryCandidateCommand {
  readonly candidateId: string
  readonly commandId: string
  readonly judgment: MemoryJudgment
  readonly policyVersion: string
  readonly requestedAt: string
  readonly conflictType?: string
}

export class ResolveMemoryCandidateUseCase {
  constructor(private readonly resolutions: CandidateResolutionPort) {}

  execute(command: ResolveMemoryCandidateCommand): Promise<string> {
    if (command.judgment.decision === 'remember') {
      throw new Error(
        'remember judgments must use AcceptMemoryCandidateUseCase'
      )
    }

    return this.resolutions.resolve({
      candidateId: command.candidateId,
      commandId: command.commandId,
      decision: command.judgment.decision,
      policyVersion: command.policyVersion,
      requestedAt: command.requestedAt,
      reasonCode: command.judgment.rationaleCode,
      conflictType: command.conflictType
    })
  }
}
