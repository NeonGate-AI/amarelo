export interface MetricObservation {
  readonly name: string
  readonly value: number
  readonly unit?: string
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

export interface TraceObservation {
  readonly name: string
  readonly traceId: string
  readonly durationMilliseconds?: number
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

export interface EventObservation {
  readonly name: string
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

/** Cross-workspace observability contract. It transports facts; it does not interpret domain quality. */
export abstract class Observability {
  abstract metric(observation: MetricObservation): Promise<void> | void
  abstract trace(observation: TraceObservation): Promise<void> | void
  abstract event(observation: EventObservation): Promise<void> | void
}

export class NoopObservability extends Observability {
  metric(_observation: MetricObservation): void {}
  trace(_observation: TraceObservation): void {}
  event(_observation: EventObservation): void {}
}
