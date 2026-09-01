import type {
  AcceptCandidateInput,
  AcceptCandidateResult,
  CanonicalMemoryPort
} from '#application/ports/canonical-memory.port'
import { MemoryAcceptancePolicy } from '#domain/policies/memory-acceptance.policy'
import { MemoryJudgment } from '#domain/value-objects/memory-judgment.vo'

export interface AcceptMemoryCandidateCommand extends AcceptCandidateInput {
  readonly kind: 'semantic' | 'episodic'
  readonly judgment: MemoryJudgment
}

export class AcceptMemoryCandidateUseCase {
  constructor(
    private readonly memory: CanonicalMemoryPort,
    private readonly policy = new MemoryAcceptancePolicy()
  ) {}

  execute(
    command: AcceptMemoryCandidateCommand
  ): Promise<AcceptCandidateResult> {
    this.policy.assertAcceptable(
      {
        kind: command.kind,
        confidence: command.confidence,
        canonicalKey: command.canonicalKey
      },
      command.judgment
    )

    return this.memory.acceptCandidate(command)
  }
}
