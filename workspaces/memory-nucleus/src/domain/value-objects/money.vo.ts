export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string
  ) {
    if (!Number.isFinite(amount))
      throw new RangeError('money amount must be finite')
    if (!/^[A-Z]{3}$/.test(currency))
      throw new RangeError('currency must be a three-letter ISO-like code')
  }

  static of(amount: number, currency: string): Money {
    return new Money(amount, currency.toUpperCase())
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other)
    return Money.of(this.amount - other.amount, this.currency)
  }

  divideBy(other: Money): number | null {
    this.assertSameCurrency(other)
    return other.amount === 0 ? null : this.amount / other.amount
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency)
      throw new Error('money currency mismatch')
  }
}
