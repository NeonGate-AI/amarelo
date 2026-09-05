import type { MemoryClient } from '@repo/memory-sdk'
import type {
  MemoryRequestScope,
  OperationalMemoryRuntime
} from '@nucleus/memory'
import {
  createChatterbox,
  createRequestMemoryClient,
  type AuthenticatedConversationContext
} from 'chatterbox'
import { expect, test } from 'vitest'
import { z } from 'zod'

const origin = 'http://localhost:3003'
const identity = {
  actorId: 'user_synthetic_alice',
  authenticationSessionId: 'session_synthetic_alice',
  expiresAtMs: Date.parse('2099-01-01T00:00:00.000Z'),
  subjectId: 'user_synthetic_alice',
  tenantId: 'personal:user_synthetic_alice'
}

test('the development Memory seam binds authenticated WorkOS identity to canonical scope', async () => {
  const scopes: MemoryRequestScope[] = []
  const unavailable = async (): Promise<never> => {
    throw new Error('unused operation')
  }
  const client: MemoryClient = {
    correct: unavailable,
    forget: unavailable,
    getConsent: async () => ({
      entries: [],
      updatedAt: '2026-09-05T00:00:00.000Z',
      version: 1
    }),
    rememberExplicitly: unavailable,
    search: unavailable,
    updateConsent: unavailable
  }
  const runtime: OperationalMemoryRuntime = {
    close: async () => {},
    forRequest: (scope) => {
      scopes.push(scope)
      return client
    },
    readiness: async () => ({
      database: 'available',
      schemaVersion: 'memory-neo4j-v1',
      status: 'ready'
    })
  }
  const options = {
    allowedOrigins: [origin],
    authenticate: async (cookie: string | undefined) =>
      cookie === 'session=alice' ? identity : null,
    createMemoryClient: (context: AuthenticatedConversationContext) =>
      createRequestMemoryClient({ context, runtime })
  }
  const app = createChatterbox(options)
  try {
    const session = await app.inject({
      method: 'POST',
      url: '/v1/conversation/session',
      headers: { origin, cookie: 'session=alice' },
      payload: {}
    })
    const conversationId: unknown = session.json().data.conversationId
    const response = await app.inject({
      method: 'POST',
      url: '/v1/development/memory',
      headers: { origin, cookie: 'session=alice' },
      payload: { conversationId, operation: 'get-consent' }
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.version).toBe(1)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(scopes).toHaveLength(1)
    const scope = scopes[0]
    expect(scope?.actorId).toBe(scope?.subjectId)
    expect(z.string().uuid().safeParse(scope?.subjectId).success).toBe(true)
    expect(z.string().uuid().safeParse(scope?.tenantId).success).toBe(true)
    expect(scope?.purpose).toBe('conversation.support')
    expect(scope?.sourceKind).toBe('development-text')
    expect(scope?.authenticationSessionId).toBe(
      identity.authenticationSessionId
    )
    for (const denied of [
      {
        headers: { origin },
        payload: { conversationId, operation: 'get-consent' },
        status: 401
      },
      {
        headers: { origin: 'https://hostile.test', cookie: 'session=alice' },
        payload: { conversationId, operation: 'get-consent' },
        status: 403
      },
      {
        headers: { origin, cookie: 'session=alice' },
        payload: {
          conversationId: '11111111-1111-4111-8111-111111111111',
          operation: 'get-consent'
        },
        status: 403
      },
      {
        headers: { origin, cookie: 'session=alice' },
        payload: {
          conversationId,
          operation: 'get-consent',
          tenantId: 'forged'
        },
        status: 400
      }
    ]) {
      const rejected = await app.inject({
        method: 'POST',
        url: '/v1/development/memory',
        headers: denied.headers,
        payload: denied.payload
      })
      expect(rejected.statusCode).toBe(denied.status)
    }
    expect(scopes).toHaveLength(1)
  } finally {
    await app.close()
  }
})

test('process liveness stays separate from configured Memory readiness', async () => {
  let ready = false
  const options = { memoryReadiness: async () => ready }
  const app = createChatterbox(options)
  try {
    expect(
      (await app.inject({ method: 'GET', url: '/health' })).json()
    ).toEqual({ status: 'ok' })
    expect(
      (await app.inject({ method: 'GET', url: '/ready' })).statusCode
    ).toBe(503)
    ready = true
    const recovered = await app.inject({ method: 'GET', url: '/ready' })
    expect(recovered.statusCode).toBe(200)
    expect(recovered.json()).toEqual({ status: 'ready', memory: 'ready' })
  } finally {
    await app.close()
  }
})
