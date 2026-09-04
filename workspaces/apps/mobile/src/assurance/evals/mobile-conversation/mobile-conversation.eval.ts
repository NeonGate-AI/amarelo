import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ConversationClientError } from '@repo/conversation-sdk'

import {
  type ConversationSessionEvent,
  ConversationSessionService,
  validateDevelopmentConversationConfiguration
} from '@/conversation'

import {
  createMobileTurnRequest,
  DeferredConversationClient,
  SYNTHETIC_TURN_RESPONSE
} from './mobile-conversation.fixtures'

async function evaluateConfigurationGate() {
  assert.deepEqual(validateDevelopmentConversationConfiguration({}), {
    enabled: false
  })
  assert.deepEqual(
    validateDevelopmentConversationConfiguration({
      VITE_AMARELO_TEXT_DRIVER: 'false',
      VITE_CHATTERBOX_URL: 'javascript:private'
    }),
    { enabled: false }
  )
  assert.deepEqual(
    validateDevelopmentConversationConfiguration({
      VITE_AMARELO_TEXT_DRIVER: 'true'
    }),
    { baseUrl: '/api', enabled: true }
  )
  assert.deepEqual(
    validateDevelopmentConversationConfiguration({
      VITE_AMARELO_TEXT_DRIVER: 'true',
      VITE_CHATTERBOX_URL: 'https://chatterbox.example/'
    }),
    { baseUrl: 'https://chatterbox.example', enabled: true }
  )
  assert.throws(() =>
    validateDevelopmentConversationConfiguration({
      VITE_AMARELO_TEXT_DRIVER: 'true',
      VITE_CHATTERBOX_URL: 'javascript:private'
    })
  )
}

async function evaluateSuccessfulTurn() {
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })

  const execution = session.submit(createMobileTurnRequest())
  assert.deepEqual(
    events.map((event) => event.type),
    ['pending']
  )
  client.resolve(0, SYNTHETIC_TURN_RESPONSE)
  await execution

  assert.deepEqual(
    events.map((event) => event.type),
    ['pending', 'succeeded']
  )
  const succeeded = events.at(-1)
  assert.equal(
    succeeded?.type === 'succeeded' ? succeeded.result.response : null,
    SYNTHETIC_TURN_RESPONSE.response
  )
}

async function evaluateSafeFailure() {
  const secret = 'raw-provider-secret-must-not-render'
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })

  const execution = session.submit(createMobileTurnRequest())
  client.reject(0, new Error(secret))
  await execution

  const failed = events.at(-1)
  assert.equal(failed?.type, 'failed')
  assert.equal(JSON.stringify(failed).includes(secret), false)
}

async function evaluateTimeoutFailure() {
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })
  const request = createMobileTurnRequest('mobile-timeout-request')

  const execution = session.submit(request)
  client.reject(
    0,
    new ConversationClientError({
      code: 'timeout',
      message: 'A conversa excedeu o tempo de resposta.',
      requestId: request.requestId
    })
  )
  await execution

  const failed = events.at(-1)
  assert.equal(failed?.type, 'failed')
  if (failed?.type === 'failed') {
    assert.equal(failed.failure.code, 'timeout')
    assert.equal(failed.failure.requestId, request.requestId)
  }
}

async function evaluateCancellation() {
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })

  const execution = session.submit(createMobileTurnRequest())
  session.cancel()
  await execution

  assert.deepEqual(
    events.map((event) => event.type),
    ['pending', 'aborted']
  )
  assert.equal(client.turns.at(0)?.signal?.aborted, true)
}

async function evaluateOverlappingTurns() {
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })

  const first = session.submit(createMobileTurnRequest('mobile-request-1'))
  const second = session.submit(createMobileTurnRequest('mobile-request-2'))
  client.resolve(0, {
    ...SYNTHETIC_TURN_RESPONSE,
    requestId: 'mobile-request-1',
    response: 'Resposta obsoleta.'
  })
  client.resolve(1, {
    ...SYNTHETIC_TURN_RESPONSE,
    requestId: 'mobile-request-2',
    response: 'Resposta atual.'
  })
  await Promise.all([first, second])

  assert.deepEqual(
    events.map((event) => event.type),
    ['pending', 'aborted', 'pending', 'succeeded']
  )
  const succeeded = events.filter((event) => event.type === 'succeeded')
  assert.equal(succeeded.length, 1)
  assert.equal(succeeded.at(0)?.requestId, 'mobile-request-2')
}

async function evaluateEphemeralSourceBoundary() {
  const root = process.cwd()
  const sourcePaths = [
    'src/conversation/conversation-session.event.ts',
    'src/conversation/conversation-session.service.ts',
    'src/conversation/development-conversation.validate.ts',
    'src/ui/development-conversation.view.tsx'
  ]

  for (const sourcePath of sourcePaths) {
    const source = await readFile(path.join(root, sourcePath), 'utf8')
    assert.equal(
      /localStorage|sessionStorage|CacheStorage|caches\./u.test(source),
      false
    )
  }

  const app = await readFile(path.join(root, 'src/app.tsx'), 'utf8')
  assert.equal(app.includes('configuration.enabled'), true)
  const vite = await readFile(path.join(root, 'vite.config.ts'), 'utf8')
  assert.equal(vite.includes('runtimeCaching: []'), true)
}

await evaluateConfigurationGate()
await evaluateSuccessfulTurn()
await evaluateSafeFailure()
await evaluateTimeoutFailure()
await evaluateCancellation()
await evaluateOverlappingTurns()
await evaluateEphemeralSourceBoundary()
console.log('Mobile conversation lifecycle eval PASS')
