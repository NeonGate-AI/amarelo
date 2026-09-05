import type {
  EventObservation,
  MetricObservation,
  TraceObservation
} from './observation.contract'

/** Transports observations; domain quality and economics remain with their owners. */
export abstract class Observability {
  abstract metric(observation: MetricObservation): Promise<void> | void
  abstract trace(observation: TraceObservation): Promise<void> | void
  abstract event(observation: EventObservation): Promise<void> | void
}
