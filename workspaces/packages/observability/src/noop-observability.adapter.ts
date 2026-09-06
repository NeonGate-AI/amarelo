import type {
  EventObservation,
  MetricObservation,
  TraceObservation
} from './observation.contract'
import { Observability } from './observability.port'

/** Explicit test/optional sink; production Chatterbox composes a structured sink. */
export class NoopObservability extends Observability {
  metric(_observation: MetricObservation): void {}
  trace(_observation: TraceObservation): void {}
  event(_observation: EventObservation): void {}
}
