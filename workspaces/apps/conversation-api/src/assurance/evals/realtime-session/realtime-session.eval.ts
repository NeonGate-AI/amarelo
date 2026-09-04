import assert from 'node:assert/strict'

import {
  ConversationSafeErrorResponseSchema,
  createOpenAiRealtimeCall
} from 'conversation-api'

import { RecordingAnaModel, createTestConversationApi } from '../conversation-api'

const OFFER_SDP = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n'
const ANSWER_SDP = 'v=0\r\no=- 3 4 IN IP4 127.0.0.1\r\n'

async function evaluateOpenAiMultipartContract() {
  let capturedBody: BodyInit | null | undefined
  let capturedHeaders: Headers | undefined
  let capturedMethod: string | undefined
  let capturedUrl: RequestInfo | URL | undefined

  const fetchImplementation = (async (input, init) => {
    capturedBody = init?.body
    capturedHeaders = new Headers(init?.headers)
    capturedMethod = init?.method
    capturedUrl = input
    return new Response(ANSWER_SDP, { status: 200 })
  }) as typeof fetch

  const answer = await createOpenAiRealtimeCall({
    apiKey: 'synthetic-openai-key',
    fetchImplementation,
    sdp: OFFER_SDP
  })

  assert.equal(answer, ANSWER_SDP)
  assert.equal(capturedUrl, 'https://api.openai.com/v1/realtime/calls')
  assert.equal(capturedMethod, 'POST')
  assert.equal(capturedHeaders?.get('authorization'), 'Bearer synthetic-openai-key')
  assert.equal(capturedHeaders?.has('content-type'), false)
  assert.equal(capturedBody instanceof FormData, true)

  const formData = capturedBody as FormData
  const sdp = formData.get('sdp')
  const session = formData.get('session')

  assert.equal(typeof sdp, 'string')
  assert.equal(sdp, OFFER_SDP)
  assert.equal(typeof session, 'string')
  assert.deepEqual(JSON.parse(String(session)), {
    audio: {
      output: {
        voice: 'marin'
      }
    },
    model: 'gpt-realtime-2',
    type: 'realtime'
  })
}

async function evaluateRealtimeSessionEndpoint() {
  const receivedOffers: string[] = []
  const app = createTestConversationApi({
    createRealtimeCall: async (sdp) => {
      receivedOffers.push(sdp)
      return ANSWER_SDP
    },
    model: new RecordingAnaModel()
  })

  const response = await app.inject({
    headers: { 'content-type': 'application/sdp' },
    method: 'POST',
    payload: OFFER_SDP,
    url: '/v1/realtime/session'
  })

  assert.equal(response.statusCode, 200)
  assert.match(String(response.headers['content-type']), /^application\/sdp/u)
  assert.equal(response.body, ANSWER_SDP)
  assert.deepEqual(receivedOffers, [OFFER_SDP])
  await app.close()
}

async function evaluateInvalidOfferBeforeProvider() {
  let providerCalls = 0
  const app = createTestConversationApi({
    createRealtimeCall: async () => {
      providerCalls += 1
      return ANSWER_SDP
    },
    model: new RecordingAnaModel()
  })

  const response = await app.inject({
    headers: { 'content-type': 'application/sdp' },
    method: 'POST',
    payload: '   ',
    url: '/v1/realtime/session'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 400)
  assert.equal(safeError.error.code, 'invalid_request')
  assert.equal(providerCalls, 0)
  await app.close()
}

async function evaluateSafeProviderFailure() {
  const secret = 'upstream-secret-must-not-reach-browser'
  const app = createTestConversationApi({
    createRealtimeCall: async () => {
      throw new Error(secret)
    },
    model: new RecordingAnaModel()
  })

  const response = await app.inject({
    headers: { 'content-type': 'application/sdp' },
    method: 'POST',
    payload: OFFER_SDP,
    url: '/v1/realtime/session'
  })
  const safeError = ConversationSafeErrorResponseSchema.parse(response.json())

  assert.equal(response.statusCode, 502)
  assert.equal(safeError.error.code, 'model_unavailable')
  assert.equal(response.body.includes(secret), false)
  await app.close()
}

await evaluateOpenAiMultipartContract()
await evaluateRealtimeSessionEndpoint()
await evaluateInvalidOfferBeforeProvider()
await evaluateSafeProviderFailure()
console.log('Realtime session eval PASS')
