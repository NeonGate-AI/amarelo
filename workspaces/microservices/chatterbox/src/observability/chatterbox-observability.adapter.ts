import type { EventObservation, Observability } from '@repo/observability'

import { ChatterboxObservationSchema } from './chatterbox-observation.contract'
import { createObservationStreamWriter } from './observation-stream-writer.factory'

/** Only the service's closed event contract can reach the structured log sink. */
export class ChatterboxObservabilityAdapter
  implements Pick<Observability, 'event'>
{
  constructor(
    private readonly writeLine: (
      line: string
    ) => Promise<void> | void = createObservationStreamWriter(process.stdout)
  ) {}

  event(observation: EventObservation): Promise<void> | void {
    const safe = ChatterboxObservationSchema.parse(observation)
    return this.writeLine(`${JSON.stringify(safe)}\n`)
  }
}
