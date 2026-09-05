import type {
  OperationalMemoryRuntime,
  MemoryUsageEvent
} from '@application/contracts'
import type { MemoryUsageObservationSink } from '@application/ports'
import {
  OperationalMemoryCandidateDeliveryClient,
  OperationalMemoryClient
} from '@application/clients'
import {
  Neo4jOperationalMemoryUnitOfWork,
  Neo4jMemoryUsageLedger
} from '@infrastructure/adapters/persistence/neo4j'
import neo4j from 'neo4j-driver'
import {
  initializeNeo4jMemorySchema,
  isNeo4jMemorySchemaReady,
  NEO4J_MEMORY_SCHEMA_VERSION
} from './neo4j-memory.schema'

export interface Neo4jMemoryOptions {
  readonly uri: string
  readonly username: string
  readonly password: string
  readonly database: string
  readonly now?: () => Date
  readonly onObservation?: MemoryUsageObservationSink
  readonly usageProfile?: {
    readonly workloadVersion: string
    readonly profileVersion: string
    readonly costClass: MemoryUsageEvent['costClass']
  }
}

/** Server composition root for the request-bound SDK and canonical graph. */
export async function createNeo4jMemoryRuntime(
  options: Neo4jMemoryOptions
): Promise<OperationalMemoryRuntime> {
  if (
    !options.uri ||
    !options.username ||
    !options.password ||
    !options.database ||
    options.database.trim() !== options.database
  )
    throw new Error('Neo4j Memory configuration is incomplete')
  const driver = neo4j.driver(
    options.uri,
    neo4j.auth.basic(options.username, options.password),
    {
      connectionTimeout: 5_000,
      maxTransactionRetryTime: 0,
      disableLosslessIntegers: true
    }
  )
  try {
    await driver.verifyConnectivity({ database: options.database })
    await initializeNeo4jMemorySchema(driver, options.database)
  } catch (error) {
    await driver.close()
    throw error
  }
  const now = options.now ?? (() => new Date())
  const assertSchemaReady = async (): Promise<void> => {
    if (!(await isNeo4jMemorySchemaReady(driver, options.database)))
      throw new Error('Neo4j Memory schema is not ready')
  }
  const unitOfWork = new Neo4jOperationalMemoryUnitOfWork(
    driver,
    options.database,
    now
  )
  return {
    close: () => driver.close(),
    forRequest: (scope) => new OperationalMemoryClient(scope, unitOfWork, now),
    candidatesForRequest: (scope) =>
      new OperationalMemoryCandidateDeliveryClient(scope, unitOfWork, now),
    usageLedgerForRequest: (scope) =>
      new Neo4jMemoryUsageLedger(
        driver,
        options.database,
        scope,
        now,
        assertSchemaReady
      ),
    readiness: async () => {
      try {
        const ready = await isNeo4jMemorySchemaReady(driver, options.database)
        return {
          database: 'available',
          schemaVersion: ready ? NEO4J_MEMORY_SCHEMA_VERSION : null,
          status: ready ? 'ready' : 'not-ready'
        }
      } catch {
        return {
          database: 'unavailable',
          schemaVersion: null,
          status: 'not-ready'
        }
      }
    }
  }
}
