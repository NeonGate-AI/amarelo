import type { Observability } from '@repo/observability'

import {
  ChatterboxObservationSchema,
  type ChatterboxObservation
} from './chatterbox-observation.contract'
import { createObservationStreamWriter } from './observation-stream-writer.factory'

/** Bounded best-effort transport; failed telemetry never changes authorization. */
export class ChatterboxObservationService {
  #pending = 0
  #failurePending = false
  constructor(
    private readonly sink: Pick<Observability, 'event'>,
    private readonly onFailure: () => Promise<void> | void = () =>
      createObservationStreamWriter(process.stderr)(
        '{"name":"chatterbox.telemetry_failure"}\n'
      )
  ) {}

  async emit(observation: ChatterboxObservation): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      if (this.#pending >= 16) throw new Error('Observation capacity exhausted')
      const safe = ChatterboxObservationSchema.parse(observation)
      this.#pending += 1
      const pending = Promise.resolve()
        .then(() => this.sink.event(safe))
        .finally(() => {
          this.#pending -= 1
        })
      await Promise.race([
        pending,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Observation timeout')), 50)
        })
      ])
    } catch {
      if (!this.#failurePending) {
        this.#failurePending = true
        void Promise.resolve()
          .then(() => this.onFailure())
          .catch(() => {
            // No recursive fallback, raw errors or additional buffered writes.
          })
          .finally(() => {
            this.#failurePending = false
          })
      }
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }
}
