import { randomUUID } from 'node:crypto'
import {
  MemoryUsageEventSchema,
  MemoryUsageIdentifierSchema,
  type OperationalMemoryRuntime,
  type MemoryUsageProfile
} from '@application/contracts'
import type { MemoryUsageObservationSink } from '@application/ports'
import {
  OperationalMemoryCandidateDeliveryClient,
  OperationalMemoryClient,
  ObservedMemoryClient
} from '@application/clients'
import { MemoryUsageObservationService } from '@application/observability'
import { createUnknownCostMemoryUsageLedgerEntry } from '@application/services'
import {
  Neo4jOperationalMemoryUnitOfWork,
  Neo4jMemoryUsageLedger
} from '@infrastructure/adapters/persistence/neo4j'
import neo4j, { type ManagedTransaction } from 'neo4j-driver'
import {
  initializeNeo4jMemorySchema,
  isNeo4jMemorySchemaReady,
  isNeo4jMemoryTransactionSchemaReady,
  NEO4J_MEMORY_SCHEMA_VERSION
} from './neo4j-memory.schema'

export interface Neo4jMemoryOptions {
  readonly uri: string
  readonly username: string
  readonly password: string
  readonly database: string
  readonly now?: () => Date
  readonly onObservation?: MemoryUsageObservationSink
  readonly usageProfile?: MemoryUsageProfile
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
  const selectedProfile = options.usageProfile ?? {
    workloadVersion: 'memory-operational-text-v1',
    profileVersion: 'memory-neo4j-text-v1',
    costClass: 'operational'
  }
  const usageProfile = Object.freeze({
    workloadVersion: MemoryUsageIdentifierSchema.parse(
      selectedProfile.workloadVersion
    ),
    profileVersion: MemoryUsageIdentifierSchema.parse(
      selectedProfile.profileVersion
    ),
    costClass: MemoryUsageEventSchema.unwrap().shape.costClass.parse(
      selectedProfile.costClass
    )
  })
  const onObservation = options.onObservation
  if (onObservation !== undefined && typeof onObservation !== 'function')
    throw new Error('Memory usage observation configuration is invalid')
  // One limiter belongs to the runtime, including every request-bound client.
  const usageObserver = new MemoryUsageObservationService({
    onObservation: onObservation ?? (() => undefined)
  })
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
  const assertSchemaReady = async (
    transaction?: ManagedTransaction
  ): Promise<void> => {
    const ready = transaction
      ? await isNeo4jMemoryTransactionSchemaReady(transaction)
      : await isNeo4jMemorySchemaReady(driver, options.database)
    if (!ready) throw new Error('Neo4j Memory schema is not ready')
  }
  const unitOfWork = new Neo4jOperationalMemoryUnitOfWork(
    driver,
    options.database,
    now,
    assertSchemaReady
  )
  return {
    close: () => driver.close(),
    forRequest: (scope) => {
      const client = new OperationalMemoryClient(scope, unitOfWork, now)
      const ledger = new Neo4jMemoryUsageLedger(
        driver,
        options.database,
        scope,
        now,
        assertSchemaReady
      )
      return new ObservedMemoryClient(
        client,
        scope,
        {
          observe: (event) =>
            usageObserver.observeWithSink(event, async (safe) => {
              await ledger.append(
                createUnknownCostMemoryUsageLedgerEntry(safe, safe.eventId)
              )
              await onObservation?.(safe)
            })
        },
        usageProfile,
        now,
        randomUUID
      )
    },
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
