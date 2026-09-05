import type { OperationalMemoryRuntime } from '@application/contracts'
import neo4j from 'neo4j-driver'

export interface Neo4jMemoryOptions {
  readonly uri: string
  readonly username: string
  readonly password: string
  readonly database: string
  readonly now?: () => Date
}

/** Connection seam for the first public SDK behavioral red test. */
export async function createNeo4jMemoryRuntime(
  options: Neo4jMemoryOptions
): Promise<OperationalMemoryRuntime> {
  const driver = neo4j.driver(
    options.uri,
    neo4j.auth.basic(options.username, options.password),
    { connectionTimeout: 5_000, maxTransactionRetryTime: 0 }
  )
  try {
    await driver.verifyConnectivity({ database: options.database })
  } catch (error) {
    await driver.close()
    throw error
  }
  return {
    close: () => driver.close(),
    forRequest: () => {
      throw new Error('Operational Memory SDK behavior is not implemented')
    },
    readiness: async () => ({
      database: 'available',
      schemaVersion: null,
      status: 'not-ready'
    })
  }
}
