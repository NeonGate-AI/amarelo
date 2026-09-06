import type { MemoryUsageEvent } from '@application/contracts'

export type MemoryUsageObservationOutcome = 'recorded' | 'unavailable'
export type MemoryUsageObservationSink = (
  event: MemoryUsageEvent
) => Promise<void> | void

/** Optional telemetry outcome; it never grants authority or asserts durability. */
export abstract class MemoryUsageObserver {
  abstract observe(
    event: MemoryUsageEvent
  ): Promise<MemoryUsageObservationOutcome>
}
