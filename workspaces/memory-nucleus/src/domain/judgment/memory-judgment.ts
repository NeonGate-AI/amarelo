export type MemoryJudgmentDecision =
  | 'remember'
  | 'discard'
  | 'quarantine'
  | 'conflict'

export class MemoryJudgment {
  private constructor(
    readonly decision: MemoryJudgmentDecision,
    readonly confidence: number,
    readonly rationaleCode: string
  ) {
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new RangeError('judgment confidence must be between 0 and 1')
    }

    if (rationaleCode.trim().length === 0) {
      throw new RangeError('judgment rationaleCode must not be empty')
    }
  }

  static create(input: {
    decision: MemoryJudgmentDecision
    confidence: number
    rationaleCode: string
  }): MemoryJudgment {
    return Object.freeze(
      new MemoryJudgment(
        input.decision,
        input.confidence,
        input.rationaleCode.trim()
      )
    )
  }

  get shouldPersist(): boolean {
    return this.decision === 'remember'
  }
}
