import assert from 'node:assert/strict'

import {
  ConversationClient,
  ConversationSafeErrorResponseSchema,
  type ConversationTurnRequest
} from '@repo/conversation-sdk'

import {
  hasChatterboxProviderConfiguration,
  validateChatterboxEnvironment
} from 'chatterbox'

import {
  RecordingAnaModel,
  createInjectedFetch,
  createLangChainAdapter,
  createSequenceClock,
  createTestChatterbox,
  createUnavailableChatterbox,
  createOwnedTestSession,
  SYNTHETIC_CONVERSATION_HEADERS
} from './chatterbox.fixtures'

const REQUEST: ConversationTurnRequest = {
  agentId: 'ana',
  conversationId: 'api-conversation-1',
  history: [],
  message: 'Oi!',
  requestId: 'api-request-1'
}

async function evaluateHealth() {
  const app = createTestChatterbox({ model: new RecordingAnaModel() })
  const response = await app.inject({ method: 'GET', url: '/health' })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'ok' })
  await app.close()
}

async function evaluateCompleteSdkTurn() {
  const model = new RecordingAnaModel()
  const app = createTestChatterbox({
    model,
    nowMs: createSequenceClock(1_000, 1_025)
  })
  const client = new ConversationClient({
    baseUrl: 'https://conversation.test',
    fetch: createInjectedFetch(app)
  })

  await createOwnedTestSession(app)
  const result = await client.turn(REQUEST)
  assert.equal(result.response, 'Estou aqui para acompanhar você.')
  assert.equal(result.metrics.modelCalls, 1)
  assert.equal(result.metrics.totalLatencyMs, 25)
  assert.equal(result.metrics.firstTokenLatency.status, 'unavailable')
  assert.equal(result.metrics.memoryStatus, 'skipped')
  assert.equal(result.metrics.modelUsage?.totalTokens, 48)
  assert.equal(model.requests.length, 1)
  await app.close()
}

async function evaluateInvalidRequestBeforeModel() {
  const invalidInputSentinel = 'private-input-must-not-echo'
  const model = new RecordingAnaModel()
  const app = createTestChatterbox({ model })
  const response = await app.inject({
    headers: {
      'content-type': 'application/json',
      ...SYNTHETIC_CONVERSATION_HEADERS
    },
    method: 'POST',
    payload: JSON.stringify({
      ...REQUEST,
      message: '',
      unexpected: invalidInputSentinel
    }),
    url: '/v1/conversation/turn'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 400)
  assert.equal(safeError.error.code, 'invalid_request')
  assert.equal(model.requests.length, 0)
  assert.equal(response.body.includes(invalidInputSentinel), false)
  await app.close()
}

async function evaluateOversizedRequestBeforeModel() {
  const model = new RecordingAnaModel()
  const app = createTestChatterbox({ model })
  const response = await app.inject({
    headers: {
      'content-type': 'application/json',
      ...SYNTHETIC_CONVERSATION_HEADERS
    },
    method: 'POST',
    payload: JSON.stringify({ ...REQUEST, message: 'x'.repeat(600_000) }),
    url: '/v1/conversation/turn'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 413)
  assert.equal(safeError.error.code, 'request_too_large')
  assert.equal(model.requests.length, 0)
  await app.close()
}

async function evaluateSafeModelFailure() {
  const secretFailure = 'provider-secret-must-not-reach-browser'
  const model = new RecordingAnaModel(
    {
      response: 'unused',
      usage: null
    },
    new Error(secretFailure)
  )
  const app = createTestChatterbox({ model })
  await createOwnedTestSession(app)
  const response = await app.inject({
    headers: {
      'content-type': 'application/json',
      ...SYNTHETIC_CONVERSATION_HEADERS
    },
    method: 'POST',
    payload: JSON.stringify(REQUEST),
    url: '/v1/conversation/turn'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 502)
  assert.equal(safeError.error.code, 'model_unavailable')
  assert.equal(safeError.error.requestId, REQUEST.requestId)
  assert.equal(response.body.includes(secretFailure), false)
  assert.equal(model.requests.length, 1)
  await app.close()
}

async function evaluateLangChainAdapter() {
  const { adapter, model } = createLangChainAdapter()
  const result = await adapter.invoke({
    instructionVersion: 'ana-support-v1',
    instructions: 'Responda com cuidado.',
    messages: [{ content: 'Oi.', role: 'user' }],
    requestId: 'adapter-request-1'
  })

  assert.equal(result.response, 'Resposta pelo adaptador LangChain.')
  assert.equal(result.usage?.inputTokens, 12)
  assert.equal(result.usage?.outputTokens, 5)
  assert.equal(result.usage?.totalTokens, 17)
  assert.equal(model.calls.length, 1)
}

async function evaluateUnavailableProviderConfiguration() {
  const app = createUnavailableChatterbox()
  await createOwnedTestSession(app)
  const response = await app.inject({
    headers: {
      'content-type': 'application/json',
      ...SYNTHETIC_CONVERSATION_HEADERS
    },
    method: 'POST',
    payload: JSON.stringify(REQUEST),
    url: '/v1/conversation/turn'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 503)
  assert.equal(safeError.error.code, 'model_unavailable')
  await app.close()
}

function evaluateProviderConfigurationGate() {
  const unavailable = validateChatterboxEnvironment({})
  assert.equal(unavailable.CHATTERBOX_PORT, 3004)
  assert.equal(unavailable.CHATTERBOX_HOST, '0.0.0.0')
  assert.equal(hasChatterboxProviderConfiguration(unavailable), false)
  const configuration = validateChatterboxEnvironment({
    AI_CONVERSATION_MODEL: 'synthetic-provider-model',
    OPENAI_API_KEY: 'synthetic-api-key'
  })
  assert.equal(configuration.CHATTERBOX_PORT, 3004)
  assert.equal(configuration.CHATTERBOX_HOST, '0.0.0.0')
  assert.equal(hasChatterboxProviderConfiguration(configuration), true)
}

await evaluateHealth()
await evaluateCompleteSdkTurn()
await evaluateInvalidRequestBeforeModel()
await evaluateOversizedRequestBeforeModel()
await evaluateSafeModelFailure()
await evaluateLangChainAdapter()
await evaluateUnavailableProviderConfiguration()
evaluateProviderConfigurationGate()
console.log('Chatterbox eval PASS')
