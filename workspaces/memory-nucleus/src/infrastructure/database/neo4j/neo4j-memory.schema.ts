import type { Driver, ManagedTransaction } from 'neo4j-driver'
import { z } from 'zod'

export const NEO4J_MEMORY_SCHEMA_VERSION = 'memory-graph-v1'
export const NEO4J_MEMORY_FULLTEXT_INDEX = 'memory_version_text_v1'

export const NEO4J_MEMORY_CONSTRAINTS = [
  ['memory_consent_scope_v1', 'MemoryConsentHead', 'scopeKey'],
  ['memory_consent_entry_v1', 'MemoryConsentEntry', 'entryId'],
  ['memory_evidence_id_v1', 'MemoryEvidence', 'evidenceId'],
  ['memory_candidate_id_v1', 'MemoryCandidate', 'candidateId'],
  ['memory_source_turn_identity_v1', 'MemorySourceTurn', 'identityKey'],
  ['memory_identity_v1', 'Memory', 'canonicalIdentityKey'],
  ['memory_id_v1', 'Memory', 'memoryId'],
  ['memory_version_id_v1', 'MemoryVersion', 'versionId'],
  ['memory_command_key_v1', 'MemoryCommand', 'commandId'],
  ['memory_suppression_key_v1', 'MemorySuppression', 'canonicalIdentityKey'],
  ['memory_lifecycle_event_v1', 'MemoryLifecycleEvent', 'eventId'],
  ['memory_outbox_event_v1', 'OutboxEvent', 'eventId'],
  ['memory_schema_version_v1', 'MemorySchema', 'version'],
  ['memory_usage_ledger_scope_v1', 'MemoryUsageLedgerHead', 'scopeKey'],
  ['memory_usage_ledger_entry_v1', 'MemoryUsageLedgerEntry', 'identityKey'],
  ['memory_usage_event_v1', 'MemoryUsageEvent', 'identityKey'],
  [
    'memory_usage_pricing_snapshot_v1',
    'MemoryUsagePricingSnapshot',
    'identityKey'
  ],
  [
    'memory_usage_brl_conversion_snapshot_v1',
    'MemoryUsageBrlConversionSnapshot',
    'identityKey'
  ]
] as const

/** Schema statements finish before protected runtime readiness is advertised. */
export async function initializeNeo4jMemorySchema(
  driver: Driver,
  database: string
): Promise<void> {
  const session = driver.session({ database })
  try {
    for (const [name, label, property] of NEO4J_MEMORY_CONSTRAINTS) {
      await session.run(
        `CREATE CONSTRAINT ${name} IF NOT EXISTS FOR (n:${label}) REQUIRE n.${property} IS UNIQUE`
      )
    }
    await session.run(
      `CREATE FULLTEXT INDEX ${NEO4J_MEMORY_FULLTEXT_INDEX} IF NOT EXISTS
       FOR (v:MemoryVersion) ON EACH [v.searchableText]
       OPTIONS {indexConfig: {\`fulltext.analyzer\`: 'standard-no-stop-words',
                              \`fulltext.eventually_consistent\`: false}}`
    )
    await session.run('CALL db.awaitIndexes(60)')
    await session.run('MERGE (:MemorySchema {version: $version})', {
      version: NEO4J_MEMORY_SCHEMA_VERSION
    })
  } finally {
    await session.close()
  }
  if (!(await isNeo4jMemorySchemaReady(driver, database)))
    throw new Error('Neo4j Memory schema is not ready')
}

export async function isNeo4jMemorySchemaReady(
  driver: Driver,
  database: string
): Promise<boolean> {
  const session = driver.session({ database, defaultAccessMode: 'READ' })
  try {
    return await session.executeRead(isNeo4jMemoryTransactionSchemaReady, {
      timeout: 5_000
    })
  } finally {
    await session.close()
  }
}

/** Validate the actual schema, including constraint-owned indexes, before mutations. */
export async function isNeo4jMemoryTransactionSchemaReady(
  transaction: ManagedTransaction
): Promise<boolean> {
  const version = await transaction.run(
    'MATCH (s:MemorySchema {version: $version}) RETURN s.version AS version',
    { version: NEO4J_MEMORY_SCHEMA_VERSION }
  )
  if (version.records.length !== 1) return false

  const names = NEO4J_MEMORY_CONSTRAINTS.map(([name]) => name)
  const constraints = await transaction.run(
    `SHOW CONSTRAINTS YIELD name, type, entityType, labelsOrTypes, properties, ownedIndex
     WHERE name IN $names
     RETURN name, type, entityType, labelsOrTypes, properties, ownedIndex`,
    { names }
  )
  const indexes = await transaction.run(
    `SHOW INDEXES YIELD name, state, type, entityType, labelsOrTypes, properties,
       owningConstraint, options
     WHERE name IN $names
     RETURN name, state, type, entityType, labelsOrTypes, properties,
       owningConstraint, options`,
    { names: [...names, NEO4J_MEMORY_FULLTEXT_INDEX] }
  )
  for (const [name, label, property] of NEO4J_MEMORY_CONSTRAINTS) {
    const constraint = constraints.records.find(
      (record) => record.get('name') === name
    )
    const index = indexes.records.find((record) => record.get('name') === name)
    if (
      constraint === undefined ||
      index === undefined ||
      constraint.get('type') !== 'UNIQUENESS' ||
      constraint.get('entityType') !== 'NODE' ||
      !containsOnly(constraint.get('labelsOrTypes'), label) ||
      !containsOnly(constraint.get('properties'), property) ||
      constraint.get('ownedIndex') !== name ||
      index.get('state') !== 'ONLINE' ||
      index.get('type') !== 'RANGE' ||
      index.get('entityType') !== 'NODE' ||
      !containsOnly(index.get('labelsOrTypes'), label) ||
      !containsOnly(index.get('properties'), property) ||
      index.get('owningConstraint') !== name
    )
      return false
  }
  const fullText = indexes.records.find(
    (record) => record.get('name') === NEO4J_MEMORY_FULLTEXT_INDEX
  )
  return (
    fullText !== undefined &&
    fullText.get('state') === 'ONLINE' &&
    fullText.get('type') === 'FULLTEXT' &&
    fullText.get('entityType') === 'NODE' &&
    containsOnly(fullText.get('labelsOrTypes'), 'MemoryVersion') &&
    containsOnly(fullText.get('properties'), 'searchableText') &&
    fullText.get('owningConstraint') === null &&
    z
      .object({
        indexConfig: z.object({
          'fulltext.analyzer': z.literal('standard-no-stop-words'),
          'fulltext.eventually_consistent': z.literal(false)
        })
      })
      .safeParse(fullText.get('options')).success
  )
}

function containsOnly(value: unknown, expected: string): boolean {
  return Array.isArray(value) && value.length === 1 && value[0] === expected
}
