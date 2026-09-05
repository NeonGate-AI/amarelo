import type { Driver } from 'neo4j-driver'

export const NEO4J_MEMORY_SCHEMA_VERSION = 'memory-graph-v1'
export const NEO4J_MEMORY_FULLTEXT_INDEX = 'memory_version_text_v1'

const constraints = [
  ['memory_consent_scope_v1', 'MemoryConsentHead', 'scopeKey'],
  ['memory_consent_entry_v1', 'MemoryConsentEntry', 'entryId'],
  ['memory_evidence_id_v1', 'MemoryEvidence', 'evidenceId'],
  ['memory_candidate_id_v1', 'MemoryCandidate', 'candidateId'],
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
    for (const [name, label, property] of constraints) {
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
}

export async function isNeo4jMemorySchemaReady(
  driver: Driver,
  database: string
): Promise<boolean> {
  const session = driver.session({ database, defaultAccessMode: 'READ' })
  try {
    const version = await session.run(
      'MATCH (s:MemorySchema {version: $version}) RETURN s.version AS version',
      { version: NEO4J_MEMORY_SCHEMA_VERSION }
    )
    const indexes = await session.run(
      'SHOW INDEXES YIELD name, state WHERE name = $name RETURN state',
      { name: NEO4J_MEMORY_FULLTEXT_INDEX }
    )
    return (
      version.records.length === 1 &&
      indexes.records.length === 1 &&
      indexes.records[0]?.get('state') === 'ONLINE'
    )
  } finally {
    await session.close()
  }
}
