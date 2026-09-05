import { randomUUID } from 'node:crypto'
import {
  createNeo4jMemoryRuntime,
  type MemoryRequestScope,
  type OperationalMemoryRuntime
} from '@nucleus/memory'
import type { ExplicitMemoryInput, MemoryClient } from '@repo/memory-sdk'
import {
  Neo4jContainer,
  type StartedNeo4jContainer
} from '@testcontainers/neo4j'
import neo4j, { type Driver, type QueryResult } from 'neo4j-driver'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const DATABASE = 'neo4j'
const INPUT = {
  category: 'preference',
  kind: 'semantic',
  purpose: 'conversation.support',
  semanticKey: 'routine.morning-walk',
  statement: 'Gosto de caminhar pela manhã.',
  validFrom: null
} satisfies ExplicitMemoryInput

let container: StartedNeo4jContainer | undefined
let driver: Driver | undefined
let runtime: OperationalMemoryRuntime
let instant = Date.parse('2026-09-05T12:00:00.000Z')

function subjectScope(
  tenantId: string = randomUUID(),
  subjectId: string = randomUUID()
): MemoryRequestScope {
  return {
    tenantId,
    subjectId,
    actorId: subjectId,
    authenticationSessionId: `session-${randomUUID()}`,
    expiresAtMs: instant + 600_000,
    conversationId: `conversation-${randomUUID()}`,
    requestId: `request-${randomUUID()}`,
    purpose: 'conversation.support',
    sourceKind: 'synthetic-transcript'
  }
}

async function graph(
  query: string,
  parameters: Record<string, unknown> = {}
): Promise<QueryResult> {
  if (driver === undefined) throw new Error('Neo4j fixture is unavailable')
  const session = driver.session({ database: DATABASE })
  try {
    return await session.run(query, parameters)
  } finally {
    await session.close()
  }
}

async function grant(client: MemoryClient): Promise<void> {
  const consent = await client.getConsent()
  await client.updateConsent({
    expectedVersion: consent.version,
    changes: [
      {
        purpose: 'conversation.support',
        status: 'granted',
        policyVersion: 'memory-consent-v1'
      }
    ]
  })
}

function search(client: MemoryClient) {
  return client.search({
    asOf: new Date(instant).toISOString(),
    purpose: 'conversation.support',
    query: 'caminhar',
    tokenBudget: 600
  })
}

/** Observe rollback effects without placing private content in assertion output. */
async function artifactCounts(scope: MemoryRequestScope) {
  const result = await graph(
    `MATCH (n)
     WHERE n.tenantId = $tenantId AND n.subjectId = $subjectId
     RETURN sum(CASE WHEN n:MemoryEvidence THEN 1 ELSE 0 END) AS evidence,
       sum(CASE WHEN n:MemoryCandidate THEN 1 ELSE 0 END) AS candidates,
       sum(CASE WHEN n:Memory THEN 1 ELSE 0 END) AS memories,
       sum(CASE WHEN n:MemoryVersion THEN 1 ELSE 0 END) AS versions,
       sum(CASE WHEN n:MemoryCommand THEN 1 ELSE 0 END) AS commands,
       sum(CASE WHEN n:MemorySuppression THEN 1 ELSE 0 END) AS suppressions,
       sum(CASE WHEN n:MemoryLifecycleEvent THEN 1 ELSE 0 END) AS lifecycle,
       sum(CASE WHEN n:OutboxEvent THEN 1 ELSE 0 END) AS outbox,
       sum(CASE WHEN n:MemoryConsentEntry THEN 1 ELSE 0 END) AS consentEntries`,
    { tenantId: scope.tenantId, subjectId: scope.subjectId }
  )
  return result.records[0]?.toObject()
}

beforeAll(async () => {
  container = await new Neo4jContainer('neo4j:5.26-community').start()
  const options = {
    database: DATABASE,
    password: container.getPassword(),
    uri: container.getBoltUri(),
    username: container.getUsername()
  }
  try {
    driver = neo4j.driver(
      options.uri,
      neo4j.auth.basic(options.username, options.password),
      { disableLosslessIntegers: true, maxTransactionRetryTime: 0 }
    )
    runtime = await createNeo4jMemoryRuntime({
      ...options,
      now: () => new Date(instant)
    })
  } catch (error) {
    try {
      await driver?.close()
    } finally {
      await container.stop()
      container = undefined
    }
    throw error
  }
}, 180_000)

afterAll(async () => {
  try {
    await runtime?.close()
  } finally {
    try {
      await driver?.close()
    } finally {
      await container?.stop()
    }
  }
}, 60_000)

describe.sequential('Neo4j Memory authority and durable effects', () => {
  test('revocation stops an existing client before read or promotion and preserves deletion rights', async () => {
    const scope = subjectScope()
    const client = runtime.forRequest(scope)
    await grant(client)
    const written = await client.rememberExplicitly(INPUT)
    const consent = await client.getConsent()
    await client.updateConsent({
      expectedVersion: consent.version,
      changes: [
        {
          purpose: scope.purpose,
          status: 'revoked',
          policyVersion: 'memory-consent-v1'
        }
      ]
    })
    const before = await artifactCounts(scope)

    await expect(client.rememberExplicitly(INPUT)).rejects.toThrow()
    await expect(search(client)).rejects.toThrow()
    await expect(
      client.updateConsent({
        expectedVersion: consent.version,
        changes: [
          {
            purpose: scope.purpose,
            status: 'granted',
            policyVersion: 'memory-consent-v1'
          }
        ]
      })
    ).rejects.toThrow()
    expect(await artifactCounts(scope)).toEqual(before)
    expect((await client.forget(written.id)).purgeStatus).toBe(
      'suppression-only'
    )
  })

  test('authority expiring while a write waits for the consent fence prevents every durable effect', async () => {
    const scope = subjectScope()
    const client = runtime.forRequest(scope)
    await grant(client)
    const before = await artifactCounts(scope)
    if (driver === undefined) throw new Error('Neo4j fixture is unavailable')
    const session = driver.session({ database: DATABASE })
    const fence = session.beginTransaction()
    let pending: Promise<unknown> | undefined
    try {
      await fence.run(
        `MATCH (h:MemoryConsentHead {tenantId: $tenantId, subjectId: $subjectId})
         SET h.lockVersion = h.lockVersion + 1 RETURN h.scopeKey`,
        { tenantId: scope.tenantId, subjectId: scope.subjectId }
      )
      pending = client.rememberExplicitly(INPUT).then(
        () => 'unexpected-success',
        (error: unknown) => error
      )
      await expect
        .poll(
          async () => {
            const transactions = await graph(
              'SHOW TRANSACTIONS YIELD currentQuery, status RETURN currentQuery, status'
            )
            return transactions.records.some(
              (row) =>
                String(row.get('currentQuery')).includes('MemoryConsentHead') &&
                String(row.get('status')).startsWith('Blocked')
            )
          },
          { timeout: 5_000, interval: 50 }
        )
        .toBe(true)
      instant = scope.expiresAtMs + 1
      await fence.commit()
      await expect(pending).resolves.toMatchObject({
        message: expect.stringMatching(
          /expired-request|Memory request authority is unavailable/
        )
      })
      expect(await artifactCounts(scope)).toEqual(before)
    } finally {
      try {
        if (fence.isOpen()) await fence.rollback()
        await pending
      } finally {
        await session.close()
      }
    }
  }, 30_000)

  test('mismatched actor and purpose cannot create evidence or canonical state', async () => {
    const scope = subjectScope()
    const client = runtime.forRequest(scope)
    await grant(client)
    const before = await artifactCounts(scope)

    expect(() =>
      runtime.forRequest({ ...scope, actorId: randomUUID() })
    ).toThrow()
    await expect(
      client.rememberExplicitly({ ...INPUT, purpose: 'conversation.other' })
    ).rejects.toThrow()
    expect(await artifactCounts(scope)).toEqual(before)
  })

  test('another subject or tenant cannot retrieve or suppress the owner memory', async () => {
    const owner = subjectScope()
    const client = runtime.forRequest(owner)
    await grant(client)
    const written = await client.rememberExplicitly(INPUT)
    const before = await artifactCounts(owner)

    for (const foreign of [
      subjectScope(owner.tenantId),
      subjectScope(randomUUID(), owner.subjectId)
    ]) {
      const foreignClient = runtime.forRequest(foreign)
      await grant(foreignClient)
      const foreignBefore = await artifactCounts(foreign)
      expect((await search(foreignClient)).items).toEqual([])
      await expect(foreignClient.forget(written.id)).rejects.toThrow()
      expect(await artifactCounts(foreign)).toEqual(foreignBefore)
    }

    expect(await artifactCounts(owner)).toEqual(before)
    expect((await search(client)).items.map(({ memory }) => memory.id)).toEqual(
      [written.id]
    )
  })

  test('outbox uniqueness failure rolls back staged evidence, candidates and canonical versions', async () => {
    const scope = subjectScope()
    const client = runtime.forRequest(scope)
    await grant(client)
    const options = { idempotencyKey: 'atomic-outbox-replay-001' }
    await client.rememberExplicitly(INPUT, options)

    // Retain the committed outbox identity while simulating a missing aggregate.
    // Its uniqueness constraint must abort the complete replay transaction.
    await graph(
      `MATCH (n)
       WHERE n.tenantId = $tenantId AND n.subjectId = $subjectId
         AND (any(label IN labels(n) WHERE label IN [
           'MemoryEvidence', 'MemoryCandidate', 'MemoryCommand',
           'MemoryVersion', 'Memory', 'MemoryLifecycleEvent'])
           OR (n:OutboxEvent AND n.eventType <> 'memory.accepted.v1'))
       DETACH DELETE n`,
      { tenantId: scope.tenantId, subjectId: scope.subjectId }
    )
    const before = await artifactCounts(scope)
    expect(before).toMatchObject({
      evidence: 0,
      candidates: 0,
      memories: 0,
      versions: 0,
      commands: 0,
      lifecycle: 0,
      suppressions: 0,
      outbox: 1
    })
    await expect(
      client.rememberExplicitly(INPUT, options)
    ).rejects.toMatchObject({
      code: 'Neo.ClientError.Schema.ConstraintValidationFailed',
      message: expect.stringContaining('OutboxEvent')
    })
    expect(await artifactCounts(scope)).toEqual(before)
    expect((await search(client)).items).toEqual([])
  })

  test('later explicit observations keep valid version timestamps and idempotent replay', async () => {
    const scope = subjectScope()
    const client = runtime.forRequest(scope)
    await grant(client)
    const first = await client.rememberExplicitly(INPUT)
    instant += 1_000
    const changed = { ...INPUT, statement: 'Gosto de caminhar à tarde.' }
    const options = { idempotencyKey: 'later-observation-001' }
    const second = await client.rememberExplicitly(changed, options)

    expect(second.id).toBe(first.id)
    expect(second.version).toBe(2)
    expect(Date.parse(second.observedAt)).toBeGreaterThan(
      Date.parse(first.observedAt)
    )
    const before = await artifactCounts(scope)
    expect(await client.rememberExplicitly(changed, options)).toEqual(second)
    expect(await artifactCounts(scope)).toEqual(before)
    expect(
      (await search(client)).items.map(({ memory }) => memory.statement)
    ).toEqual(['Gosto de caminhar à tarde.'])
  })

  test('suppression survives command replay, native full-text rebuild and stale aggregate-head restoration', async () => {
    const scope = subjectScope()
    const client = runtime.forRequest(scope)
    await grant(client)
    const options = { idempotencyKey: 'suppression-replay-001' }
    const written = await client.rememberExplicitly(INPUT, options)
    const head = await graph(
      `MATCH (m:Memory {memoryId: $memoryId})
       RETURN m.currentVersionId AS versionId, m.version AS version`,
      { memoryId: written.id }
    )
    const prior = head.records[0]
    expect(prior).toBeDefined()
    const receipt = await client.forget(written.id)
    const before = await artifactCounts(scope)
    expect((await search(client)).items).toEqual([])
    await expect(client.rememberExplicitly(INPUT, options)).rejects.toThrow()
    await expect(
      client.rememberExplicitly(INPUT, { idempotencyKey: 'new-command-002' })
    ).rejects.toThrow()

    const indexes = await graph(
      `SHOW INDEXES YIELD name, type, labelsOrTypes
       WHERE type = 'FULLTEXT' AND 'MemoryVersion' IN labelsOrTypes RETURN name`
    )
    expect(indexes.records).toHaveLength(1)
    const indexName: unknown = indexes.records[0]?.get('name')
    if (typeof indexName !== 'string' || !/^[a-z0-9_]+$/.test(indexName)) {
      throw new Error('Unexpected synthetic Memory index identifier')
    }
    const createIndex = `CREATE FULLTEXT INDEX ${indexName} IF NOT EXISTS
      FOR (v:MemoryVersion) ON EACH [v.searchableText]
      OPTIONS {indexConfig: {\`fulltext.analyzer\`: 'standard-no-stop-words',
        \`fulltext.eventually_consistent\`: false}}`
    try {
      await graph(`DROP INDEX ${indexName}`)
      await graph(createIndex)
      await graph('CALL db.awaitIndexes(60)')
      expect((await search(client)).items).toEqual([])
    } finally {
      await graph(createIndex)
      await graph('CALL db.awaitIndexes(60)')
    }

    // Restore only a stale aggregate pointer, retaining the suppression ledger.
    // This does not simulate or claim safety for rollback of the whole database.
    await graph(
      `MATCH (m:Memory {memoryId: $memoryId})
       SET m.state = 'active', m.currentVersionId = $versionId, m.version = $version`,
      {
        memoryId: written.id,
        versionId: prior?.get('versionId'),
        version: prior?.get('version')
      }
    )
    expect((await search(client)).items).toEqual([])
    await expect(client.rememberExplicitly(INPUT, options)).rejects.toThrow()
    expect(await client.forget(written.id)).toEqual(receipt)
    expect(await artifactCounts(scope)).toEqual(before)
  }, 120_000)
})
