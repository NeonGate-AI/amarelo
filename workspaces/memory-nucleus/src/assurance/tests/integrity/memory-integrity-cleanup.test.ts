import { describe, expect, it, vi } from 'vitest'
import type { MemoryClient } from '@repo/memory-sdk'
import type { OperationalMemoryRuntime } from '@application/contracts'
import {
  runMemoryIntegrityAssurance,
  type MemoryIntegrityFixtureStore
} from '@assurance/integrity'

function fixture(runError: Error, cleanupError?: Error) {
  const unexpected = (): never => {
    throw new Error('Unexpected fixture operation')
  }
  const client: MemoryClient = {
    getConsent: async () => {
      throw runError
    },
    updateConsent: unexpected,
    rememberExplicitly: unexpected,
    search: unexpected,
    correct: unexpected,
    forget: unexpected
  }
  const cleanup = vi.fn<MemoryIntegrityFixtureStore['cleanup']>(async () => {
    if (cleanupError) throw cleanupError
  })
  const fixtureStore: MemoryIntegrityFixtureStore = {
    nonDefault: true,
    identityDigest: () => 'a'.repeat(64),
    register: vi.fn(),
    cleanup,
    poison: unexpected,
    conflict: unexpected,
    observe: unexpected,
    restoreHead: unexpected,
    reindex: unexpected,
    rebuild: unexpected
  }
  const runtime: OperationalMemoryRuntime = {
    forRequest: () => client,
    candidatesForRequest: unexpected,
    usageLedgerForRequest: unexpected,
    readiness: unexpected,
    close: unexpected
  }
  return { cleanup, fixtureStore, runtime, evaluatedHead: 'b'.repeat(40) }
}

describe('integrity assurance cleanup', () => {
  it('cleans every synthetic scope and preserves the original run error', async () => {
    const runError = new Error('Synthetic consent failure')
    const input = fixture(runError)
    await expect(runMemoryIntegrityAssurance(input)).rejects.toBe(runError)
    expect(input.cleanup).toHaveBeenCalledTimes(3)
  })

  it('reports the run error together with every cleanup failure', async () => {
    const runError = new Error('Synthetic consent failure')
    const cleanupError = new Error('Synthetic cleanup failure')
    const input = fixture(runError, cleanupError)
    await expect(runMemoryIntegrityAssurance(input)).rejects.toMatchObject({
      name: 'AggregateError',
      errors: [runError, cleanupError, cleanupError, cleanupError]
    })
    expect(input.cleanup).toHaveBeenCalledTimes(3)
  })
})
