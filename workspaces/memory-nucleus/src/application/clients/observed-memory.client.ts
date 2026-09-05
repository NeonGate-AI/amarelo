import {
  MemoryClient,
  type MemorySearchInput,
  type MemorySearchResult,
  type ExplicitMemoryInput,
  type ExplicitMemoryOptions,
  type ExplicitMemoryResult,
  type MemoryCorrectionInput,
  type MemoryCorrectionResult,
  type MemoryDeletionReceipt,
  type MemoryConsentState,
  type UpdateMemoryConsentInput
} from '@repo/memory-sdk'
import type {
  MemoryRequestScope,
  MemoryUsageEvent,
  MemoryUsageProfile
} from '@application/contracts'
import type { MemoryUsageObserver } from '@application/ports'
import { createTextMemoryUsageEvent } from '@application/services'
import { OperationalMemoryError } from './operational-memory.error'

/**
 * Records completed operations only; this is not an accounting claim about failed
 * attempts. The runtime supplies a shared bounded observer. Its unavailable result
 * never changes an already successful SDK operation or asserts durable delivery.
 */
export class ObservedMemoryClient extends MemoryClient {
  readonly #scope: MemoryRequestScope
  readonly #profile: MemoryUsageProfile

  constructor(
    private readonly client: MemoryClient,
    scope: MemoryRequestScope,
    private readonly observer: MemoryUsageObserver,
    profile: MemoryUsageProfile,
    private readonly now: () => Date,
    private readonly createId: () => string
  ) {
    super()
    this.#scope = Object.freeze({ ...scope })
    this.#profile = Object.freeze({ ...profile })
  }

  search(input: MemorySearchInput): Promise<MemorySearchResult> {
    return this.run(
      'retrieve',
      () => this.client.search(input),
      (result) => ({
        llm: result.diagnostics.modelCalls,
        web: result.diagnostics.webCalls,
        fullText: result.diagnostics.fullTextCalls ?? null,
        vector: result.diagnostics.vectorCalls
      })
    )
  }

  rememberExplicitly(
    input: ExplicitMemoryInput,
    options?: ExplicitMemoryOptions
  ): Promise<ExplicitMemoryResult> {
    return this.run('explicit-write', () =>
      this.client.rememberExplicitly(input, options)
    )
  }

  correct(input: MemoryCorrectionInput): Promise<MemoryCorrectionResult> {
    return this.client.correct(input)
  }

  forget(memoryId: string): Promise<MemoryDeletionReceipt> {
    return this.run('suppress', () => this.client.forget(memoryId))
  }

  getConsent(): Promise<MemoryConsentState> {
    return this.run('consent', () => this.client.getConsent())
  }

  updateConsent(input: UpdateMemoryConsentInput): Promise<MemoryConsentState> {
    return this.run('consent', () => this.client.updateConsent(input))
  }

  private async run<T>(
    operation: MemoryUsageEvent['operation'],
    work: () => Promise<T>,
    calls: (result: T) => MemoryUsageEvent['calls'] = () => ({
      llm: 0,
      web: 0,
      fullText: 0,
      vector: 0
    })
  ): Promise<T> {
    const result = await work()
    try {
      const event = createTextMemoryUsageEvent({
        scope: this.#scope,
        ...this.#profile,
        eventId: this.createId(),
        attemptId: this.createId(),
        occurredAt: this.now().toISOString(),
        operation,
        calls: calls(result)
      })
      // Dispatch without delaying protected exposure for optional telemetry.
      void this.observer.observe(event).catch(() => undefined)
    } catch {
      // Telemetry validation, delivery, and sink failures cannot undo completed work.
    }
    const instant = this.now().getTime()
    if (!Number.isFinite(instant) || this.#scope.expiresAtMs <= instant)
      throw new OperationalMemoryError('expired-request')
    return result
  }
}
