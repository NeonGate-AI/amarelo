import {
  createNeo4jMemoryRuntime,
  type OperationalMemoryRuntime
} from '@nucleus/memory'

import type { ChatterboxFactoryOptions } from '../app'
import type { ChatterboxEnvironment } from '../configuration'
import { createRequestMemoryClient } from './request-memory.factory'

/** Process lifecycle owns the database; every client still binds a fresh trusted request. */
export function createMemoryRuntimeBinding(
  configuration: ChatterboxEnvironment
): {
  readonly options: Pick<
    ChatterboxFactoryOptions,
    'createMemoryClient' | 'memoryReadiness'
  >
  readonly start: () => Promise<void>
  readonly close: () => Promise<void>
} {
  let runtime: OperationalMemoryRuntime | undefined
  const enabled = configuration.CHATTERBOX_MEMORY_ENABLED
  return {
    options: enabled
      ? {
          createMemoryClient: (context) => {
            if (runtime === undefined) throw new Error('Memory is unavailable')
            return createRequestMemoryClient({ context, runtime })
          },
          memoryReadiness: async () =>
            (await runtime?.readiness())?.status === 'ready'
        }
      : {},
    async start() {
      if (!enabled) return
      const {
        MEMORY_NEO4J_URI: uri,
        MEMORY_NEO4J_USERNAME: username,
        MEMORY_NEO4J_PASSWORD: password,
        MEMORY_NEO4J_DATABASE: database
      } = configuration
      if (!uri || !username || !password || !database)
        throw new Error('Memory configuration is incomplete')
      runtime = await createNeo4jMemoryRuntime({
        uri,
        username,
        password,
        database,
        usageProfile: {
          workloadVersion: 'development-text-validation-v1',
          profileVersion: 'memory-internal-validation-v1',
          costClass: 'experiment'
        }
      })
    },
    async close() {
      await runtime?.close()
      runtime = undefined
    }
  }
}
