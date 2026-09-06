import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllEnvs())

it('imports the worker without starting it and retains explicit opt-in', async () => {
  vi.stubEnv('MEMORY_BACKGROUND_ENABLED', 'false')
  const originalExitCode = process.exitCode
  const { runMemoryBackgroundWorker } = await import('@infrastructure/worker')
  await new Promise<void>((resolve) => setImmediate(resolve))
  expect(process.exitCode).toBe(originalExitCode)
  await expect(runMemoryBackgroundWorker()).rejects.toThrow(
    'Set MEMORY_BACKGROUND_ENABLED=true to start the worker explicitly'
  )
})
