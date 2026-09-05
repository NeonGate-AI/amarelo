import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTextMemoryUsageEvent } from '@application/services'
import { MemoryUsageObservationService } from '@application/observability'
import {
  MemoryUsageEventSchema,
  type MemoryRequestScope
} from '@application/contracts'
import { RecordMemoryUsageUseCase } from '@application/use-cases'
import { InMemoryMemoryUsageLedger } from '@infrastructure/adapters/testing'
import {
  memoryUsageLedgerFixture,
  memoryUsageFixture
} from '@assurance/fixtures/economics'

const scope: MemoryRequestScope = {
  tenantId: 'tenant-a',
  subjectId: 'subject-a',
  actorId: 'subject-a',
  authenticationSessionId: 'session-a',
  expiresAtMs: Date.parse('2026-09-05T13:00:00Z'),
  conversationId: 'conversation-1',
  requestId: 'request-1',
  purpose: 'conversation.support',
  sourceKind: 'development-text'
}

describe('operational usage observation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it('forms versioned text usage from trusted attribution with unknown audio measurements', () => {
    const event = createTextMemoryUsageEvent({
      scope,
      eventId: 'usage-1',
      attemptId: 'attempt-1',
      occurredAt: '2026-09-05T12:00:00.000Z',
      operation: 'retrieve',
      workloadVersion: 'spec025-60-minutes-weekly-v1',
      profileVersion: 'internal-memory-validation-v1',
      costClass: 'experiment',
      calls: { llm: 0, web: 0, vector: 0, fullText: 1 }
    })
    expect(event.schemaVersion).toBe('memory-usage-v1')
    expect(event.profileVersion).toBe('internal-memory-validation-v1')
    expect(event.sourceKind).toBe('development-text')
    expect(event.durations.patientSpeechMilliseconds).toBeNull()
    expect(event.durations.assistantSpeechMilliseconds).toBeNull()
    expect(event.durations.inactivityMilliseconds).toBeNull()
    expect(event.providerUsage).toBeNull()
    expect(event.calls.llm).toBe(0)
    expect(event).not.toHaveProperty('authenticationSessionId')
  })

  it('delivers validated usage to an injected ledger without pricing unknown infrastructure as zero', async () => {
    const ledger = new InMemoryMemoryUsageLedger({
      tenantId: 'tenant-a',
      subjectId: 'subject-a'
    })
    const record = new RecordMemoryUsageUseCase(ledger)
    const observer = new MemoryUsageObservationService({
      onObservation: async (event) => {
        await record.execute({
          ...memoryUsageLedgerFixture(),
          usageEvent: event
        })
      }
    })
    const event = MemoryUsageEventSchema.parse({
      ...memoryUsageFixture(),
      calls: { llm: 0, web: 0, fullText: 1, vector: 0 }
    })
    expect(await observer.observe(event)).toBe('recorded')
    const entries = await ledger.entries()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.usageEvent.calls.llm).toBe(0)
    expect(entries[0]?.cost.sourceAmount).toBeNull()
  })

  it('contains sink errors and refuses content-bearing telemetry without exposing raw errors', async () => {
    const event = MemoryUsageEventSchema.parse(memoryUsageFixture())
    const failing = new MemoryUsageObservationService({
      onObservation: () => {
        throw new Error('SYNTHETIC_PRIVATE_CONTENT')
      }
    })
    await expect(failing.observe(event)).resolves.toBe('unavailable')
    const accepted: string[] = []
    const observer = new MemoryUsageObservationService({
      onObservation: (safe) => {
        accepted.push(safe.eventId)
      }
    })
    const unsafe = { ...event, transcript: 'SYNTHETIC_PRIVATE_CONTENT' }
    await expect(observer.observe(unsafe)).resolves.toBe('unavailable')
    expect(accepted).toHaveLength(0)
  })

  it('bounds stalled telemetry and retains its capacity until the original sink settles', async () => {
    vi.useFakeTimers()
    const event = MemoryUsageEventSchema.parse(memoryUsageFixture())
    let release: (() => void) | undefined
    const stalled = new Promise<void>((resolve) => {
      release = resolve
    })
    const received: string[] = []
    const observer = new MemoryUsageObservationService({
      timeoutMilliseconds: 20,
      maxPending: 1,
      onObservation: (input) => {
        received.push(input.eventId)
        if (input.eventId === event.eventId) return stalled
      }
    })
    let outcome: string = 'pending'
    const first = observer.observe(event).then((result) => {
      outcome = result
    })
    await vi.advanceTimersByTimeAsync(25)
    expect(outcome).toBe('unavailable')
    expect(await observer.observe({ ...event, eventId: 'usage-2' })).toBe(
      'unavailable'
    )
    expect(received).toEqual(['usage-1'])
    release?.()
    await vi.advanceTimersByTimeAsync(0)
    await first
    expect(await observer.observe({ ...event, eventId: 'usage-3' })).toBe(
      'recorded'
    )
    expect(received).toEqual(['usage-1', 'usage-3'])
  })
})
