import {
  MemoryUsageEventSchema,
  type MemoryUsageEvent
} from '@application/contracts'
import {
  MemoryUsageObserver,
  type MemoryUsageObservationOutcome,
  type MemoryUsageObservationSink
} from '@application/ports'

export interface MemoryUsageObservationOptions {
  readonly onObservation: MemoryUsageObservationSink
  readonly timeoutMilliseconds?: number
  readonly maxPending?: number
}

/**
 * Sinks must be nonblocking. A timeout bounds the caller's wait, not the sink's
 * eventual effect; unresolved deliveries retain capacity and may settle later.
 */
export class MemoryUsageObservationService extends MemoryUsageObserver {
  readonly #onObservation: MemoryUsageObservationSink
  readonly #timeoutMilliseconds: number
  readonly #maxPending: number
  #pending = 0

  constructor(options: MemoryUsageObservationOptions) {
    super()
    this.#onObservation = options.onObservation
    this.#timeoutMilliseconds = options.timeoutMilliseconds ?? 50
    this.#maxPending = options.maxPending ?? 16
    if (
      !Number.isInteger(this.#timeoutMilliseconds) ||
      this.#timeoutMilliseconds < 1 ||
      this.#timeoutMilliseconds > 1_000 ||
      !Number.isInteger(this.#maxPending) ||
      this.#maxPending < 1 ||
      this.#maxPending > 64
    ) {
      throw new RangeError('Usage observation limits are invalid')
    }
  }

  async observe(
    event: MemoryUsageEvent
  ): Promise<MemoryUsageObservationOutcome> {
    if (this.#pending >= this.#maxPending) return 'unavailable'
    const parsed = MemoryUsageEventSchema.safeParse(event)
    if (!parsed.success) return 'unavailable'
    this.#pending += 1
    const delivery = Promise.resolve()
      .then(() => this.#onObservation(parsed.data))
      .then(
        () => {
          this.#pending -= 1
          return 'recorded' as const
        },
        () => {
          this.#pending -= 1
          return 'unavailable' as const
        }
      )
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        delivery,
        new Promise<MemoryUsageObservationOutcome>((resolve) => {
          timeout = setTimeout(
            () => resolve('unavailable'),
            this.#timeoutMilliseconds
          )
        })
      ])
    } finally {
      clearTimeout(timeout)
    }
  }
}
