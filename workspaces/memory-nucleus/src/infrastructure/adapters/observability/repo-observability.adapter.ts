import type { Observability } from '@repo/observability'

import { MemoryObservabilityPort, type MemoryMetric } from '@application/ports'
import {
  MemoryRetrievalObserver,
  type MemoryRetrievalObservationContext,
  type MemoryRetrievalTrace
} from '@application/ports'

export class RepoMemoryObservabilityAdapter extends MemoryObservabilityPort {
  constructor(private readonly observability: Observability) {
    super()
  }

  metric(metric: MemoryMetric): Promise<void> | void {
    return this.observability.metric({
      name: metric.name,
      value: metric.value,
      attributes: metric.attributes
    })
  }
}

export class RepoMemoryRetrievalObserver extends MemoryRetrievalObserver {
  constructor(private readonly observability: Observability) {
    super()
  }

  async record(
    trace: MemoryRetrievalTrace,
    context: MemoryRetrievalObservationContext
  ): Promise<void> {
    if (context.signal.aborted) return

    await this.observability.trace({
      name: 'memory.retrieval',
      traceId: trace.traceId,
      durationMilliseconds: trace.selectionElapsedMilliseconds,
      attributes: {
        policyVersion: trace.policyVersion,
        repositoryRowsReturned: trace.repositoryRowsReturned,
        selectedCount: trace.selectedMemoryIds.length,
        totalEstimatedTokens: trace.totalEstimatedTokens,
        vectorCalls: trace.vectorCalls
      }
    })
  }
}
