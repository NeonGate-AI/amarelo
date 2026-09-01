export interface MemoryMetric {
  readonly name: string
  readonly value: number
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

/** Application-owned port. Infrastructure decides how measurements are emitted. */
export abstract class MemoryObservabilityPort {
  abstract metric(metric: MemoryMetric): Promise<void> | void
}
