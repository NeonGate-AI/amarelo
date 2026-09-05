/** Null means unknown or unavailable, never a measured zero. */
export type ObservationAttributes = Readonly<
  Record<string, string | number | boolean | null>
>

export interface MetricObservation {
  readonly name: string
  readonly value: number
  readonly unit?: string
  readonly attributes?: ObservationAttributes
}

export interface TraceObservation {
  readonly name: string
  readonly traceId: string
  readonly durationMilliseconds?: number
  readonly attributes?: ObservationAttributes
}

export interface EventObservation {
  readonly name: string
  readonly attributes?: ObservationAttributes
}
