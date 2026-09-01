import type { MemoryJudgment } from '#domain/value-objects/memory-judgment.vo'

export interface MemoryAcceptanceCandidate {
  readonly kind: 'semantic' | 'episodic'
  readonly confidence: number
  readonly canonicalKey: string | null
}

/** Pure domain rule: only affirmative, sufficiently confident judgments may become canonical memory. */
export class MemoryAcceptancePolicy {
  constructor(readonly minimumConfidence = 0.6) {
    if (
      !Number.isFinite(minimumConfidence) ||
      minimumConfidence < 0 ||
      minimumConfidence > 1
    ) {
      throw new RangeError('minimumConfidence must be between 0 and 1')
    }
  }

  assertAcceptable(
    candidate: MemoryAcceptanceCandidate,
    judgment: MemoryJudgment
  ): void {
    if (!judgment.shouldPersist) {
      throw new Error(
        `judgment ${judgment.decision} cannot activate canonical memory`
      )
    }
    if (candidate.confidence < this.minimumConfidence) {
      throw new Error(
        'candidate confidence is below the canonical-memory threshold'
      )
    }
    if (candidate.kind === 'semantic' && candidate.canonicalKey === null) {
      throw new Error('semantic memory requires a canonical key')
    }
    if (candidate.kind === 'episodic' && candidate.canonicalKey !== null) {
      throw new Error('episodic memory must not use a semantic canonical key')
    }
  }
}
