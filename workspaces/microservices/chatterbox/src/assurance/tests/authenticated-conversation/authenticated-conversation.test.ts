import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  AnaChatModelPort,
  AnaConversationAgent,
  type AnaChatModelRequest,
  type AnaChatModelResult
} from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import type { EventObservation } from '@repo/observability'

import {
  createChatterbox,
  createProviderChatterbox,
  validateChatterboxEnvironment,
  type ChatterboxFactoryOptions,
  type AuthenticatedConversationContext,
  ChatterboxObservabilityAdapter
} from 'chatterbox'

const ORIGIN = 'http://localhost:3003'
const ALICE = {
  actorId: 'user_synthetic_alice',
  authenticationSessionId: 'session_alice',
  expiresAtMs: Date.parse('2099-01-01T00:00:00.000Z'),
  subjectId: 'user_synthetic_alice',
  tenantId: 'personal:user_synthetic_alice'
}
const BOB = {
  ...ALICE,
  actorId: 'user_synthetic_bob',
  subjectId: 'user_synthetic_bob',
  authenticationSessionId: 'session_bob',
  tenantId: 'personal:user_synthetic_bob'
}
const HEADERS = { cookie: 'wos-session=alice', origin: ORIGIN }

class SyntheticModel extends AnaChatModelPort {
  readonly calls: AnaChatModelRequest[] = []
  constructor(private readonly resolve?: () => Promise<AnaChatModelResult>) {
    super()
  }
  async invoke(input: AnaChatModelRequest): Promise<AnaChatModelResult> {
    this.calls.push(input)
    if (this.resolve !== undefined) return this.resolve()
    return { response: 'Estou aqui para acompanhar você.', usage: null }
  }
}

async function session(
  app: FastifyInstance,
  cookie = HEADERS.cookie
): Promise<string> {
  const response = await app.inject({
    headers: { ...HEADERS, cookie },
    method: 'POST',
    payload: {},
    url: '/v1/conversation/session'
  })
  expect(response.statusCode).toBe(201)
  return response.json().data.conversationId as string
}

function turn(
  app: FastifyInstance,
  conversationId: string,
  overrides: Record<string, unknown> = {},
  cookie = HEADERS.cookie
) {
  return app.inject({
    headers: { ...HEADERS, cookie },
    method: 'POST',
    payload: {
      agentId: 'ana',
      conversationId,
      history: [],
      message: 'Oi!',
      requestId: 'synthetic-request',
      ...overrides
    },
    url: '/v1/conversation/turn'
  })
}

describe('Authenticated development conversation', () => {
  const applications: FastifyInstance[] = []

  function fixture(
    overrides: Partial<ChatterboxFactoryOptions> = {},
    model = new SyntheticModel()
  ) {
    const runtime = new ConversationRuntime({
      agents: [new AnaConversationAgent({ model })]
    })
    const events: EventObservation[] = []
    const app = createChatterbox({
      allowedOrigins: [ORIGIN],
      authenticate: async (cookie) =>
        cookie === HEADERS.cookie
          ? ALICE
          : cookie === 'wos-session=bob'
            ? BOB
            : null,
      clock: () => new Date('2026-09-05T12:00:00.000Z'),
      observability: {
        event: (event) => {
          events.push(event)
        }
      },
      runtime,
      ...overrides
    })
    applications.push(app)
    return { app, events, model, runtime }
  }

  afterEach(async () => {
    await Promise.all(applications.splice(0).map((app) => app.close()))
  })

  it('fails closed when authentication is not configured', async () => {
    const app = createChatterbox({})
    applications.push(app)

    const response = await app.inject({
      headers: { origin: 'http://localhost:3003' },
      method: 'POST',
      payload: {},
      url: '/v1/conversation/session'
    })

    expect(response.statusCode).toBe(503)
    expect(response.json().error.code).toBe('session_unavailable')
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('production composition fails closed without WorkOS configuration', async () => {
    const app = createProviderChatterbox(
      validateChatterboxEnvironment({ CHATTERBOX_ALLOWED_ORIGINS: ORIGIN })
    )
    applications.push(app)
    const response = await app.inject({
      headers: HEADERS,
      method: 'POST',
      payload: {},
      url: '/v1/conversation/session'
    })
    expect(response.statusCode).toBe(503)
    expect(response.json().error.code).toBe('session_unavailable')
  })

  it.each([
    '/v1/conversation/session',
    '/v1/conversation/turn',
    '/v1/realtime/session'
  ])('denies anonymous access to %s before paid work', async (url) => {
    let realtimeCalls = 0
    const { app, model } = fixture({
      createRealtimeCall: async () => {
        realtimeCalls += 1
        return 'unused'
      }
    })
    const response = await app.inject({
      headers: { origin: ORIGIN },
      method: 'POST',
      payload: {},
      url
    })
    expect(response.statusCode).toBe(401)
    expect(model.calls).toHaveLength(0)
    expect(realtimeCalls).toBe(0)
  })

  it.each([
    undefined,
    'https://hostile.test',
    'null',
    'http://localhost:3003/'
  ])('rejects missing or non-exact origin %s', async (origin) => {
    const { app, model } = fixture()
    const response = await app.inject({
      headers: {
        cookie: HEADERS.cookie,
        ...(origin === undefined ? {} : { origin })
      },
      method: 'POST',
      payload: {},
      url: '/v1/conversation/session'
    })
    expect(response.statusCode).toBe(403)
    expect(model.calls).toHaveLength(0)
  })

  it('rejects expired authentication and uncertain resolver failures', async () => {
    const expired = fixture({
      authenticate: async () => ({ ...ALICE, expiresAtMs: 1 })
    })
    const failed = fixture({
      authenticate: async () => {
        throw new Error('private-resolver-secret')
      }
    })
    for (const [app, expected] of [
      [expired.app, 401],
      [failed.app, 503]
    ] as const) {
      const response = await app.inject({
        headers: HEADERS,
        method: 'POST',
        payload: {},
        url: '/v1/conversation/session'
      })
      expect(response.statusCode).toBe(expected)
      expect(response.body).not.toContain('private-resolver-secret')
    }
  })

  it('bounds a stalled identity resolver without invoking Ana', async () => {
    const { app, model } = fixture({
      authenticate: () => new Promise(() => {}),
      authenticationTimeoutMs: 5
    })
    const response = await app.inject({
      headers: HEADERS,
      method: 'POST',
      payload: {},
      url: '/v1/conversation/session'
    })
    expect(response.statusCode).toBe(503)
    expect(model.calls).toHaveLength(0)
  })

  it('issues an opaque owned session and serves an authenticated turn through real Conversation and Ana', async () => {
    const contexts: AuthenticatedConversationContext[] = []
    const model = new SyntheticModel()
    const runtime = new ConversationRuntime({
      agents: [new AnaConversationAgent({ model })]
    })
    const { app, events } = fixture(
      {
        createRuntime: (context) => {
          contexts.push(context)
          return runtime
        }
      },
      model
    )
    const conversationId = await session(app)
    expect(conversationId).toMatch(/^[0-9a-f-]{36}$/)
    const response = await turn(app, conversationId)
    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({
      conversationId,
      requestId: 'synthetic-request',
      response: 'Estou aqui para acompanhar você.'
    })
    expect(contexts[0]).toMatchObject({
      ...ALICE,
      asOf: '2026-09-05T12:00:00.000Z',
      purpose: 'conversation.support'
    })
    expect(model.calls).toHaveLength(1)
    expect(events.at(-1)?.attributes).toMatchObject({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      memoryStatus: 'skipped',
      memoryFailure: null,
      outcome: 'success'
    })
    expect(events.at(-1)?.attributes?.traceId).not.toBe('synthetic-request')
  })

  it('rejects foreign, unknown and expired sessions without revealing ownership', async () => {
    let currentMs = Date.parse('2026-09-05T12:00:00.000Z')
    const { app, model } = fixture({
      clock: () => new Date(currentMs),
      sessionTtlMs: 1000
    })
    const conversationId = await session(app)
    const foreign = await turn(app, conversationId, {}, 'wos-session=bob')
    const unknown = await turn(app, 'unknown')
    currentMs += 1000
    const expired = await turn(app, conversationId)
    for (const response of [foreign, unknown, expired]) {
      expect(response.statusCode).toBe(403)
      expect(response.json().error.code).toBe('forbidden')
    }
    expect(foreign.json().error.message).toBe(unknown.json().error.message)
    expect(model.calls).toHaveLength(0)
  })

  it.each([
    'tenantId',
    'subjectId',
    'purpose',
    'asOf',
    'authorization'
  ])('rejects client-authoritative %s before paid work', async (field) => {
    const { app, model } = fixture()
    const conversationId = await session(app)
    const response = await turn(app, conversationId, {
      [field]: 'forged-authority'
    })
    expect(response.statusCode).toBe(400)
    expect(model.calls).toHaveLength(0)
  })

  it('bounds active session metadata and purges expired capacity', async () => {
    let currentMs = Date.parse('2026-09-05T12:00:00.000Z')
    const { app } = fixture({
      clock: () => new Date(currentMs),
      maxSessions: 1,
      sessionTtlMs: 1000
    })
    await session(app)
    const blocked = await app.inject({
      headers: HEADERS,
      method: 'POST',
      payload: {},
      url: '/v1/conversation/session'
    })
    expect(blocked.statusCode).toBe(429)
    currentMs += 1000
    await session(app)
  })

  it('counts session creation and turns against the bounded principal rate', async () => {
    const { app, model } = fixture({ rateLimitPerMinute: 2 })
    const conversationId = await session(app)
    expect((await turn(app, conversationId)).statusCode).toBe(200)
    const blocked = await turn(app, conversationId)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.headers['retry-after']).toBe('60')
    expect(model.calls).toHaveLength(1)
  })

  it('limits concurrent provider work and releases capacity after completion', async () => {
    let release: ((result: AnaChatModelResult) => void) | undefined
    let entered: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const model: SyntheticModel = new SyntheticModel(() =>
      model.calls.length > 1
        ? Promise.resolve({ response: 'Estou aqui.', usage: null })
        : new Promise((resolve) => {
            release = resolve
            entered?.()
          })
    )
    const { app } = fixture({ maxConcurrentTurns: 1 }, model)
    const alice = await session(app)
    const bob = await session(app, 'wos-session=bob')
    const first = turn(app, alice).then((response) => response)
    await started
    const blocked = await turn(app, bob, {}, 'wos-session=bob')
    expect(blocked.statusCode).toBe(429)
    release?.({ response: 'Estou aqui.', usage: null })
    expect((await first).statusCode).toBe(200)
    expect((await turn(app, bob, {}, 'wos-session=bob')).statusCode).toBe(200)
    expect(model.calls).toHaveLength(2)
  })

  it('clamps conversation expiry to verified authentication expiry and binds its login session', async () => {
    let identity = {
      ...ALICE,
      expiresAtMs: Date.parse('2026-09-05T12:01:00.000Z')
    }
    const { app, model } = fixture({ authenticate: async () => identity })
    const created = await app.inject({
      headers: HEADERS,
      method: 'POST',
      payload: {},
      url: '/v1/conversation/session'
    })
    expect(created.json().data.expiresAt).toBe('2026-09-05T12:01:00.000Z')
    identity = {
      ...identity,
      authenticationSessionId: 'different-login-session'
    }
    expect(
      (await turn(app, created.json().data.conversationId)).statusCode
    ).toBe(403)
    expect(model.calls).toHaveLength(0)
  })

  it('rejects oversized input without logging content or invoking Ana', async () => {
    const { app, events, model } = fixture()
    const response = await turn(app, 'unknown', {
      message: 'private-body'.repeat(60_000)
    })
    expect(response.statusCode).toBe(413)
    expect(model.calls).toHaveLength(0)
    expect(JSON.stringify(events)).not.toContain('private-body')
    expect(events.at(-1)?.attributes?.outcome).toBe('request_too_large')
  })

  it('exports only fixed structured fields on model failure', async () => {
    const lines: string[] = []
    const model = new SyntheticModel(async () => {
      throw new Error('private-provider-error')
    })
    const { app } = fixture(
      {
        observability: new ChatterboxObservabilityAdapter((line) => {
          lines.push(line)
        })
      },
      model
    )
    const conversationId = await session(app)
    const response = await turn(app, conversationId, {
      message: 'private-message',
      requestId: 'private-request-id'
    })
    expect(response.statusCode).toBe(502)
    const logs = lines.join('')
    for (const sentinel of [
      'private-provider-error',
      'private-message',
      'private-request-id',
      'user_synthetic_alice',
      'wos-session',
      conversationId
    ])
      expect(logs).not.toContain(sentinel)
    expect(JSON.parse(lines.at(-1) ?? '{}').attributes.outcome).toBe(
      'model_unavailable'
    )
  })

  it('contains a failed or stalled observation sink and never logs its exception', async () => {
    for (const event of [
      () => {
        throw new Error('private-sink-error')
      },
      () => new Promise<void>(() => {})
    ]) {
      let fixedFailures = 0
      const { app } = fixture({
        observability: { event },
        onObservationFailure: () => {
          fixedFailures += 1
        }
      })
      const response = await app.inject({
        headers: HEADERS,
        method: 'POST',
        payload: {},
        url: '/v1/conversation/session'
      })
      expect(response.statusCode).toBe(201)
      // Fastify's response is sent before its bounded onResponse observation.
      await new Promise((resolve) => setTimeout(resolve, 65))
      expect(fixedFailures).toBe(1)
      expect(response.body).not.toContain('private-sink-error')
    }
  })

  it('rejects arbitrary fields at the concrete observation exporter', () => {
    const lines: string[] = []
    const sink = new ChatterboxObservabilityAdapter((line) => {
      lines.push(line)
    })
    expect(() =>
      sink.event({
        name: 'chatterbox.request',
        attributes: {
          traceId: '00000000-0000-4000-8000-000000000001',
          operation: 'turn',
          outcome: 'success',
          latencyMs: 1,
          message: 'private'
        }
      })
    ).toThrow()
    expect(lines).toEqual([])
  })

  it('accepts SDP only with the explicit realtime content type', async () => {
    let calls = 0
    const { app } = fixture({
      createRealtimeCall: async () => {
        calls += 1
        return 'v=0'
      }
    })
    const response = await app.inject({
      headers: { ...HEADERS, 'content-type': 'text/plain' },
      method: 'POST',
      payload: 'v=0',
      url: '/v1/realtime/session'
    })
    expect(response.statusCode).toBe(400)
    expect(calls).toBe(0)
  })

  it('returns a server-generated observation correlation and ignores forged trace headers', async () => {
    const { app, events } = fixture()
    const response = await app.inject({
      headers: {
        ...HEADERS,
        'x-chatterbox-trace-id': 'forged-private-trace',
        'x-request-id': 'forged-private-request'
      },
      method: 'POST',
      payload: {},
      url: '/v1/conversation/session'
    })
    const traceId = response.headers['x-chatterbox-trace-id']
    expect(traceId).toMatch(/^[0-9a-f-]{36}$/)
    expect(traceId).toBe(events.at(-1)?.attributes?.traceId)
    expect(JSON.stringify(events)).not.toContain('forged-private')
  })
})
