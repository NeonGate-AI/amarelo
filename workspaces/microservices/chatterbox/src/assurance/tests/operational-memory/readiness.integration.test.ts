import { createNeo4jMemoryRuntime } from '@nucleus/memory'
import { Neo4jContainer } from '@testcontainers/neo4j'
import { createRequestMemoryClient } from 'chatterbox'
import neo4j from 'neo4j-driver'
import { expect, test } from 'vitest'

test('missing required schema closes readiness and rejects protected writes until initialization restores it', async () => {
  const container = await new Neo4jContainer('neo4j:5.26-community').start()
  const options = {
    database: 'neo4j',
    password: container.getPassword(),
    uri: container.getBoltUri(),
    username: container.getUsername()
  }
  const admin = neo4j.driver(
    options.uri,
    neo4j.auth.basic(options.username, options.password),
    { disableLosslessIntegers: true }
  )
  const session = admin.session({ database: options.database })
  let runtime: Awaited<ReturnType<typeof createNeo4jMemoryRuntime>> | undefined
  let completedConsentObservations = 0
  try {
    runtime = await createNeo4jMemoryRuntime({
      ...options,
      onObservation: (event) => {
        if (event.operation === 'consent') completedConsentObservations += 1
      }
    })
    const context = {
      actorId: 'user_readiness_patient',
      asOf: new Date().toISOString(),
      authenticationSessionId: 'session-spec016-readiness',
      conversationId: 'conversation-spec016-readiness',
      expiresAtMs: Date.now() + 600_000,
      purpose: 'conversation.support' as const,
      requestId: 'request-spec016-readiness',
      subjectId: 'user_readiness_patient',
      tenantId: 'personal:user_readiness_patient'
    }
    const client = createRequestMemoryClient({ context, runtime })
    const consent = await client.getConsent()
    await client.updateConsent({
      changes: [
        {
          policyVersion: 'memory-consent-v1',
          purpose: 'conversation.support',
          status: 'granted'
        }
      ],
      expectedVersion: consent.version
    })
    // The callback acknowledges durable accounting; settle setup before counting.
    await expect
      .poll(() => completedConsentObservations, { timeout: 5_000 })
      .toBe(2)
    const before = await session.run('MATCH (n) RETURN count(n) AS count')
    expect(await runtime.readiness()).toMatchObject({
      database: 'available',
      status: 'ready'
    })

    await session.run('DROP CONSTRAINT memory_identity_v1')
    expect(await runtime.readiness()).toEqual({
      database: 'available',
      schemaVersion: null,
      status: 'not-ready'
    })
    await expect(
      client.rememberExplicitly({
        category: 'preference',
        kind: 'semantic',
        purpose: 'conversation.support',
        semanticKey: 'routine.schema-readiness',
        statement: 'Prefiro caminhadas curtas pela manhã.',
        validFrom: null
      })
    ).rejects.toThrow()
    const after = await session.run('MATCH (n) RETURN count(n) AS count')
    expect(after.records[0]?.get('count')).toBe(before.records[0]?.get('count'))

    await runtime.close()
    runtime = await createNeo4jMemoryRuntime(options)
    expect(await runtime.readiness()).toMatchObject({
      database: 'available',
      status: 'ready'
    })
    const recovered = createRequestMemoryClient({ context, runtime })
    const written = await recovered.rememberExplicitly({
      category: 'preference',
      kind: 'semantic',
      purpose: 'conversation.support',
      semanticKey: 'routine.schema-readiness',
      statement: 'Prefiro caminhadas curtas pela manhã.',
      validFrom: null
    })
    const result = await recovered.search({
      asOf: new Date().toISOString(),
      purpose: 'conversation.support',
      query: 'caminhadas',
      tokenBudget: 600
    })
    expect(result.items.map(({ memory }) => memory.id)).toContain(written.id)
  } finally {
    await runtime?.close()
    await session.close()
    await admin.close()
    await container.stop()
  }
}, 180_000)
