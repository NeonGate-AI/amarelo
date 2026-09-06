import { describe, expect, it } from 'vitest'
import { Writable } from 'node:stream'

import {
  ChatterboxObservabilityAdapter,
  ChatterboxObservationService,
  createObservationStreamWriter,
  type ChatterboxObservation
} from 'chatterbox'

const OBSERVATION: ChatterboxObservation = {
  name: 'chatterbox.request',
  attributes: {
    latencyMs: 1,
    operation: 'turn',
    outcome: 'success',
    traceId: '00000000-0000-4000-8000-000000000001'
  }
}

describe('Structured observation backpressure', () => {
  it('contains real Writable EPIPE events without leaking raw failures or recursively writing', async () => {
    const privateFailure = 'private-EPIPE-details'
    const primary = new Writable({
      write(_chunk, _encoding, callback) {
        callback(new Error(privateFailure))
      }
    })
    const fallback = new Writable({
      write(_chunk, _encoding, callback) {
        callback(new Error(privateFailure))
      }
    })
    const writePrimary = createObservationStreamWriter(primary)
    const writeFallback = createObservationStreamWriter(fallback)
    const observations = new ChatterboxObservationService(
      new ChatterboxObservabilityAdapter(writePrimary),
      () => writeFallback('{"name":"chatterbox.telemetry_failure"}\n')
    )

    await expect(observations.emit(OBSERVATION)).resolves.toBeUndefined()
    // No test error listener: an unhandled post-callback error fails the runner.
    await new Promise<void>((resolve) => setImmediate(resolve))
    await expect(writePrimary('synthetic')).rejects.toThrow(
      'Observation stream unavailable'
    )
    expect(createObservationStreamWriter(primary)).toBe(writePrimary)
    primary.destroy()
    fallback.destroy()
  })

  it('bounds blocked primary writes at sixteen and fixed fallback writes at one, then recovers', async () => {
    const completeWrites: Array<() => void> = []
    let completeFallback: (() => void) | undefined
    let writes = 0
    let fallbackWrites = 0
    let blocked = true
    const sink = new ChatterboxObservabilityAdapter(() => {
      writes += 1
      if (!blocked) return Promise.resolve()
      return new Promise<void>((resolve) => {
        completeWrites.push(resolve)
      })
    })
    const observations = new ChatterboxObservationService(sink, () => {
      fallbackWrites += 1
      return new Promise<void>((resolve) => {
        completeFallback = resolve
      })
    })

    await Promise.all(
      Array.from({ length: 32 }, () => observations.emit(OBSERVATION))
    )
    await Promise.all(
      Array.from({ length: 16 }, () => observations.emit(OBSERVATION))
    )
    expect(writes).toBe(16)
    expect(fallbackWrites).toBe(1)

    blocked = false
    for (const complete of completeWrites) complete()
    completeFallback?.()
    await new Promise<void>((resolve) => setImmediate(resolve))
    await observations.emit(OBSERVATION)
    expect(writes).toBe(17)
    expect(fallbackWrites).toBe(1)
  })
})
