import { createNeo4jMemoryBackgroundRuntime } from '@nucleus/memory'

import type { ChatterboxFactoryOptions } from '../app'
import type { ChatterboxEnvironment } from '../configuration'
import { createObservationStreamWriter } from '../observability'
import { createMemoryRequestScope } from './request-memory-scope.factory'

type IngestionStatus = 'committed' | 'buffered' | 'duplicate' | 'skipped' | 'unconfirmed'

/** Ingests current patient text atomically; extraction runs only in the separate worker. */
export function createMemoryBackgroundBinding(
  configuration: ChatterboxEnvironment
): {
  readonly options: Pick<ChatterboxFactoryOptions, 'ingestPatientTurn'>
  readonly start: () => Promise<void>
  readonly close: () => Promise<void>
} {
  let runtime:
    | Awaited<ReturnType<typeof createNeo4jMemoryBackgroundRuntime>>
    | undefined
  let accepting = false
  let pending = 0
  let pendingObservations = 0
  const enabled = configuration.CHATTERBOX_MEMORY_BACKGROUND_ENABLED
  const internalSubjects = new Set(
    configuration.CHATTERBOX_MEMORY_INTERNAL_SUBJECT_IDS
  )
  const writeLine = createObservationStreamWriter(process.stdout)

  function observe(status: IngestionStatus, traceId?: string): void {
    if (pendingObservations >= 16) return
    pendingObservations += 1
    void writeLine(
      `${JSON.stringify({
        name: 'chatterbox.memory-ingestion',
        schemaVersion: 'chatterbox-memory-ingestion-v1',
        status,
        profile: configuration.CHATTERBOX_MEMORY_BACKGROUND_PROFILE,
        ...(traceId === undefined ? {} : { traceId })
      })}\n`
    )
      .catch(() => undefined)
      .finally(() => {
        pendingObservations -= 1
      })
  }

  const ingestPatientTurn: NonNullable<
    ChatterboxFactoryOptions['ingestPatientTurn']
  > = async ({ context, message, sourceTurnId }) => {
    const scope = createMemoryRequestScope(context)
    if (
      configuration.CHATTERBOX_MEMORY_BACKGROUND_PROFILE !== 'internal' ||
      !internalSubjects.has(scope.subjectId) ||
      !eligiblePatientStatement(message)
    ) {
      observe('skipped', context.requestId)
      return 'skipped'
    }
    if (
      !accepting ||
      runtime === undefined ||
      pending >= configuration.CHATTERBOX_MEMORY_INGEST_MAX_PENDING
    ) {
      observe('unconfirmed', context.requestId)
      return 'unconfirmed'
    }
    pending += 1
    const operation = runtime
      .ingest(
        scope,
        {
          events: [
            {
              kind: 'subject-text',
              actorId: scope.actorId,
              subjectId: scope.subjectId,
              sourceTurnId,
              sourceTurnVersion: 1,
              observedAt: context.asOf,
              text: message
            }
          ]
        },
        'eligible-source-delta',
        'internal'
      )
      .then(
        (result): IngestionStatus =>
          result.status === 'queued' ? 'committed' : result.status
      )
      .catch((): IngestionStatus => 'unconfirmed')
      .finally(() => {
        pending -= 1
      })
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const status = await Promise.race([
        operation,
        new Promise<IngestionStatus>((resolve) => {
          timer = setTimeout(
            () => resolve('unconfirmed'),
            configuration.CHATTERBOX_MEMORY_INGEST_TIMEOUT_MS
          )
          timer.unref()
        })
      ])
      // A timed-out operation may still commit; only an acknowledged result is durable.
      observe(status, context.requestId)
      return status
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  return {
    options: enabled ? { ingestPatientTurn } : {},
    async start() {
      if (
        !enabled ||
        configuration.CHATTERBOX_MEMORY_BACKGROUND_PROFILE !== 'internal' ||
        internalSubjects.size === 0
      )
        return
      const {
        MEMORY_NEO4J_URI: uri,
        MEMORY_NEO4J_USERNAME: username,
        MEMORY_NEO4J_PASSWORD: password,
        MEMORY_NEO4J_DATABASE: database
      } = configuration
      if (!uri || !username || !password || !database) return
      try {
        runtime = await createNeo4jMemoryBackgroundRuntime({
          uri,
          username,
          password,
          database
        })
        accepting = true
      } catch {
        observe('unconfirmed')
      }
    },
    async close() {
      accepting = false
      await runtime?.close()
      runtime = undefined
    }
  }
}

function eligiblePatientStatement(message: string): boolean {
  // This signal selects a bounded finalized self-report; it never invents a fact.
  if (message.length === 0 || message.length > 4_000) return false
  return /(?:^|[.!?]\s+)(?:eu\s+(?:sou|tenho|gosto|prefiro|costumo|quero|preciso|sinto|trabalho|moro)|(?:gosto|prefiro|costumo|tenho|moro)\b)/iu.test(
    message
  )
}
