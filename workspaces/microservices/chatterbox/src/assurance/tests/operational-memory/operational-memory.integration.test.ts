import { createNeo4jMemoryRuntime } from '@nucleus/memory'
import {
  ExplicitMemoryResultSchema,
  MemoryDeletionReceiptSchema,
  MemorySearchResultSchema
} from '@repo/memory-sdk'
import { Neo4jContainer } from '@testcontainers/neo4j'
import { createRequestMemoryClient } from 'chatterbox'
import { expect, test } from 'vitest'

test('an authorized person can remember, retrieve and immediately suppress a memory', async () => {
  const container = await new Neo4jContainer('neo4j:5.26-community').start()
  let runtime: Awaited<ReturnType<typeof createNeo4jMemoryRuntime>> | undefined
  try {
    runtime = await createNeo4jMemoryRuntime({
      database: 'neo4j',
      password: container.getPassword(),
      uri: container.getBoltUri(),
      username: container.getUsername()
    })
    const context = {
      actorId: '22222222-2222-4222-8222-222222222222',
      asOf: new Date().toISOString(),
      authenticationSessionId: 'session-spec016-alice',
      conversationId: 'conversation-spec016-alice',
      expiresAtMs: Date.now() + 600_000,
      purpose: 'conversation.support' as const,
      requestId: 'request-spec016-alice',
      subjectId: '22222222-2222-4222-8222-222222222222',
      tenantId: '11111111-1111-4111-8111-111111111111'
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
    const written = ExplicitMemoryResultSchema.parse(
      await client.rememberExplicitly(
        {
          category: 'preference',
          kind: 'semantic',
          purpose: 'conversation.support',
          semanticKey: 'routine.morning-walk',
          statement: 'Gosto de caminhar pela manhã.',
          validFrom: null
        },
        { idempotencyKey: 'spec016-explicit-alice-001' }
      )
    )
    const query = {
      asOf: new Date().toISOString(),
      purpose: 'conversation.support',
      query: 'caminhar',
      tokenBudget: 600
    }
    const before = MemorySearchResultSchema.parse(await client.search(query))
    expect(before.items.map(({ memory }) => memory.id)).toContain(written.id)
    expect(before.diagnostics).toMatchObject({
      fullTextCalls: 2,
      fullTextSearchUsed: true,
      modelCalls: 0,
      vectorCalls: 0,
      webCalls: 0
    })
    const receipt = MemoryDeletionReceiptSchema.parse(
      await client.forget(written.id)
    )
    expect(receipt.purgeStatus).toBe('suppression-only')
    const after = MemorySearchResultSchema.parse(await client.search(query))
    expect(after.items).toEqual([])
  } finally {
    await runtime?.close()
    await container.stop()
  }
}, 180_000)
