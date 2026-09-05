import type { Writable } from 'node:stream'

type ObservationStreamWriter = (line: string) => Promise<void>
const writers = new WeakMap<Writable, ObservationStreamWriter>()

/** One listener per stream: EPIPE/error events never become raw crashes. */
export function createObservationStreamWriter(
  stream: Writable
): ObservationStreamWriter {
  const existing = writers.get(stream)
  if (existing !== undefined) return existing

  const pending = new Set<(error: Error) => void>()
  // This listener lives with the stream, including after a write callback:
  // Writable may emit its error event after invoking the failed callback.
  stream.on('error', () => {
    for (const reject of pending) reject(new Error('Observation stream failed'))
    pending.clear()
  })

  const write: ObservationStreamWriter = (line) =>
    new Promise<void>((resolve, reject) => {
      if (stream.destroyed || !stream.writable) {
        reject(new Error('Observation stream unavailable'))
        return
      }
      pending.add(reject)
      try {
        stream.write(line, (error?: Error | null) => {
          pending.delete(reject)
          if (error) reject(new Error('Observation stream failed'))
          else resolve()
        })
      } catch {
        pending.delete(reject)
        reject(new Error('Observation stream failed'))
      }
    })
  writers.set(stream, write)
  return write
}
