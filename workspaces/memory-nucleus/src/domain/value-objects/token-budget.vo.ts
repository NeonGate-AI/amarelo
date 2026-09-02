export class TokenBudget {
  private constructor(readonly maximum: number) {
    if (!Number.isSafeInteger(maximum) || maximum < 0) {
      throw new RangeError('token budget must be a non-negative safe integer')
    }
  }

  static of(maximum: number): TokenBudget {
    return Object.freeze(new TokenBudget(maximum))
  }

  accepts(current: number, next: number): boolean {
    return (
      Number.isSafeInteger(current) &&
      Number.isSafeInteger(next) &&
      current >= 0 &&
      next >= 0 &&
      current + next <= this.maximum
    )
  }

  remaining(used: number): number {
    if (!Number.isSafeInteger(used) || used < 0)
      throw new RangeError('used tokens must be a non-negative safe integer')
    return Math.max(0, this.maximum - used)
  }
}
