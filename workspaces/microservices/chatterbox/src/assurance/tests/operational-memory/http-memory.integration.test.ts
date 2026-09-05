import { Neo4jContainer } from '@testcontainers/neo4j'
import {
  createChatterbox,
  createMemoryRuntimeBinding,
  validateChatterboxEnvironment
} from 'chatterbox'
import { expect, test } from 'vitest'

test('authenticated development HTTP commands use the process-owned Neo4j runtime', async () => {
  const container = await new Neo4jContainer('neo4j:5.26-community').start()
  const origin = 'http://localhost:3003'
  const memory = createMemoryRuntimeBinding(
    validateChatterboxEnvironment({
      CHATTERBOX_MEMORY_ENABLED: 'true',
      MEMORY_NEO4J_URI: container.getBoltUri(),
      MEMORY_NEO4J_USERNAME: container.getUsername(),
      MEMORY_NEO4J_PASSWORD: container.getPassword(),
      MEMORY_NEO4J_DATABASE: 'neo4j'
    })
  )
  const app = createChatterbox({
    ...memory.options,
    allowedOrigins: [origin],
    authenticate: async (cookie) =>
      cookie === 'session=synthetic'
        ? {
            actorId: 'user_synthetic_http',
            subjectId: 'user_synthetic_http',
            tenantId: 'personal:user_synthetic_http',
            authenticationSessionId: 'session_synthetic_http',
            expiresAtMs: Date.now() + 600_000
          }
        : null
  })
  app.addHook('onReady', memory.start)
  app.addHook('onClose', memory.close)
  try {
    expect((await app.inject({ method: 'GET', url: '/ready' })).json()).toEqual(
      { status: 'ready', memory: 'ready' }
    )
    const headers = { origin, cookie: 'session=synthetic' }
    const session = await app.inject({
      method: 'POST',
      url: '/v1/conversation/session',
      headers,
      payload: {}
    })
    expect(session.statusCode).toBe(201)
    const conversationId: unknown = session.json().data.conversationId
    const execute = async (command: Record<string, unknown>) => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/development/memory',
        headers,
        payload: { conversationId, ...command }
      })
      expect(response.statusCode).toBe(200)
      expect(response.headers['cache-control']).toBe('no-store')
      return response.json().data
    }
    const consent = await execute({ operation: 'get-consent' })
    await execute({
      operation: 'update-consent',
      input: {
        expectedVersion: consent.version,
        changes: [
          {
            purpose: 'conversation.support',
            policyVersion: 'memory-consent-v1',
            status: 'granted'
          }
        ]
      }
    })
    const written = await execute({
      operation: 'remember',
      input: {
        kind: 'semantic',
        category: 'preference',
        purpose: 'conversation.support',
        semanticKey: 'routine.walk',
        statement: 'Gosto de caminhar pela manhã.'
      },
      options: { idempotencyKey: 'synthetic-http-memory-1' }
    })
    const search = {
      operation: 'search',
      input: {
        purpose: 'conversation.support',
        query: 'caminhar',
        asOf: new Date().toISOString(),
        tokenBudget: 600
      }
    }
    const before = await execute(search)
    expect(
      before.items.map((item: { memory: { id: string } }) => item.memory.id)
    ).toContain(written.id)
    expect(before.diagnostics).toMatchObject({
      modelCalls: 0,
      webCalls: 0,
      vectorCalls: 0,
      fullTextSearchUsed: true
    })
    const receipt = await execute({ operation: 'forget', memoryId: written.id })
    expect(receipt).toMatchObject({
      purgeStatus: 'suppression-only',
      purgeBy: null
    })
    expect((await execute(search)).items).toEqual([])
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/development/memory',
          headers: { origin },
          payload: { conversationId, operation: 'get-consent' }
        })
      ).statusCode
    ).toBe(401)
  } finally {
    await app.close()
    await container.stop()
  }
}, 180_000)
