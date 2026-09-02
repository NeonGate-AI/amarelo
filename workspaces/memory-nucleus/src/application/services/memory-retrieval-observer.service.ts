import type { AuthorizedMemoryRetrievalDependencies } from '@application/ports/memory-authorization.port'

const DEFAULT_OBSERVER_TIMEOUT_MILLISECONDS = 100
const MAX_OBSERVER_TIMEOUT_MILLISECONDS = 1_000

export function resolveObserverTimeoutMilliseconds(
  value: number | undefined
): number {
  const resolved = value ?? DEFAULT_OBSERVER_TIMEOUT_MILLISECONDS

  if (
    !Number.isSafeInteger(resolved) ||
    resolved < 1 ||
    resolved > MAX_OBSERVER_TIMEOUT_MILLISECONDS
  ) {
    throw new RangeError(
      `observerTimeoutMilliseconds must be an integer between 1 and ${MAX_OBSERVER_TIMEOUT_MILLISECONDS}`
    )
  }

  return resolved
}

/** Observability is bounded best-effort instrumentation, never an authority gate. */
export async function recordRetrievalTrace(
  dependencies: AuthorizedMemoryRetrievalDependencies,
  trace: Parameters<
    AuthorizedMemoryRetrievalDependencies['observer']['record']
  >[0],
  timeoutMilliseconds: number
): Promise<void> {
  const controller = new AbortController()
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<void>((resolve) => {
    timeoutHandle = setTimeout(() => {
      controller.abort()
      resolve()
    }, timeoutMilliseconds)
  })

  try {
    await Promise.race([
      Promise.resolve()
        .then(() =>
          dependencies.observer.record(trace, { signal: controller.signal })
        )
        .then(() => undefined)
        .catch(() => undefined),
      timeout
    ])
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
  }
}
