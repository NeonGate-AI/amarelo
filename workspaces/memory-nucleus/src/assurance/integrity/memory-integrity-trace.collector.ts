import type { MemoryRequestScope } from '@application/contracts'
import {
  MemoryRetrievalObserver,
  type MemoryRetrievalObservationContext,
  type MemoryRetrievalTrace
} from '@application/ports'

/** Bounded, ephemeral ID-only capture for a sequential synthetic assurance run. */
export class MemoryIntegrityTraceCollector extends MemoryRetrievalObserver {
  private readonly ranked = new Map<string, readonly string[]>()

  record(trace: MemoryRetrievalTrace, context: MemoryRetrievalObservationContext): void {
    if (context.signal.aborted) return
    if (this.ranked.size >= 256) this.clear()
    this.ranked.set(trace.traceId, Object.freeze(trace.candidateDecisions
      .filter(candidate => candidate.decision !== 'duplicate')
      .map(candidate => candidate.memoryId)))
  }

  readonly readRankedMemoryIds = async (input: {
    scope: MemoryRequestScope; queryId: string
  }): Promise<readonly string[] | null> => {
    const ids = this.ranked.get(input.scope.requestId) ?? null
    this.ranked.delete(input.scope.requestId)
    return ids
  }

  clear(): void { this.ranked.clear() }
}
