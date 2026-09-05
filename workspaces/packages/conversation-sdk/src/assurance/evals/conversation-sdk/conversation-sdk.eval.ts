import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ConversationClient,
  ConversationClientError,
  ConversationTurnRequestSchema,
  type ConversationTurnRequest,
  type ConversationTurnResponseData
} from '@repo/conversation-sdk'

const REQUEST: ConversationTurnRequest = {
  agentId: 'ana',
  conversationId: 'conversation-sdk-1',
  history: [],
  message: 'Oi, Ana.',
  requestId: 'request-sdk-1'
}

const RESPONSE: ConversationTurnResponseData = {
  agentId: 'ana',
  conversationId: 'conversation-sdk-1',
  metrics: {
    context: {
      budgetExceededByCurrentMessage: false,
      budgetTokens: 256,
      estimatedTokens: 8,
      estimatorVersion: 'characters-v1',
      historyMessagesOmitted: 0,
      historyMessagesUsed: 0
    },
    firstTokenLatency: {
      status: 'unavailable'
    },
    memoryStatus: 'skipped',
    modelCalls: 1,
    modelUsage: {
      inputTokens: 20,
      modelId: 'synthetic-model',
      outputTokens: 8,
      providerId: 'synthetic-provider',
      totalTokens: 28
    },
    routingLane: 'reflex',
    totalLatencyMs: 12
  },
  requestId: 'request-sdk-1',
  response: 'Estou aqui para acompanhar você.'
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
    status
  })
}

async function evaluateSuccess() {
  const client = new ConversationClient({
    baseUrl: 'https://conversation.test/api',
    fetch: (async (input, init) => {
      assert.equal(input, 'https://conversation.test/api/v1/conversation/turn')
      assert.equal(init?.method, 'POST')
      assert.equal(init?.credentials, 'same-origin')
      return jsonResponse({ data: RESPONSE })
    }) as typeof fetch
  })

  assert.deepEqual(await client.turn(REQUEST), RESPONSE)
}

async function evaluateSession() {
  const expected = {
    conversationId: 'server-issued-conversation',
    expiresAt: '2099-09-05T12:05:00.000Z'
  }
  const client = new ConversationClient({
    baseUrl: '/api',
    fetch: (async (input, init) => {
      assert.equal(input, '/api/v1/conversation/session')
      assert.equal(init?.credentials, 'same-origin')
      assert.equal(init?.body, '{}')
      return jsonResponse({ data: expected })
    }) as typeof fetch
  })
  assert.deepEqual(await client.session(), expected)
}

async function evaluateAuthenticatedBoundaryFailures() {
  for (const injected of [
    { tenantId: 'foreign-tenant' },
    { subjectId: 'foreign-subject' },
    { purpose: 'memory.share' },
    { asOf: '2099-01-01T00:00:00.000Z' }
  ]) {
    assert.equal(
      ConversationTurnRequestSchema.safeParse({ ...REQUEST, ...injected })
        .success,
      false
    )
  }
  const denied = new ConversationClient({
    baseUrl: '/api',
    fetch: (async () =>
      jsonResponse(
        {
          error: {
            code: 'unauthenticated',
            message: 'Entre novamente para conversar.',
            requestId: null
          }
        },
        401
      )) as typeof fetch
  })
  await assert.rejects(
    () => denied.session(),
    (error: unknown) =>
      error instanceof ConversationClientError &&
      error.code === 'unauthenticated'
  )

  const mismatch = new ConversationClient({
    baseUrl: '/api',
    fetch: (async () =>
      jsonResponse({
        data: { ...RESPONSE, conversationId: 'another-conversation' }
      })) as typeof fetch
  })
  await assert.rejects(
    () => mismatch.turn(REQUEST),
    (error: unknown) =>
      error instanceof ConversationClientError &&
      error.code === 'invalid_response'
  )

  let fetched = false
  const aborted = new ConversationClient({
    baseUrl: '/api',
    fetch: (async () => {
      fetched = true
      return jsonResponse({ data: RESPONSE })
    }) as typeof fetch
  })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    () => aborted.session({ signal: controller.signal }),
    (error: unknown) =>
      error instanceof ConversationClientError && error.code === 'aborted'
  )
  assert.equal(fetched, false)
}

async function evaluateSafeServerFailure() {
  const client = new ConversationClient({
    baseUrl: 'https://conversation.test',
    fetch: (async () =>
      jsonResponse(
        {
          error: {
            code: 'model_unavailable',
            message: 'A Ana não conseguiu responder agora.',
            requestId: REQUEST.requestId
          }
        },
        502
      )) as typeof fetch
  })

  await assert.rejects(
    () => client.turn(REQUEST),
    (error: unknown) =>
      error instanceof ConversationClientError &&
      error.code === 'model_unavailable' &&
      error.requestId === REQUEST.requestId
  )
}

async function evaluateInvalidResponse() {
  const client = new ConversationClient({
    baseUrl: 'https://conversation.test',
    fetch: (async () =>
      jsonResponse({ rawProviderFailure: true })) as typeof fetch
  })

  await assert.rejects(
    () => client.turn(REQUEST),
    (error: unknown) =>
      error instanceof ConversationClientError &&
      error.code === 'invalid_response'
  )
}

function createAbortablePendingFetch(): typeof fetch {
  return ((_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true }
      )
    })) as typeof fetch
}

async function evaluateAbort() {
  const client = new ConversationClient({
    baseUrl: 'https://conversation.test',
    fetch: createAbortablePendingFetch()
  })
  const controller = new AbortController()
  const turn = client.turn(REQUEST, { signal: controller.signal })
  controller.abort()

  await assert.rejects(
    () => turn,
    (error: unknown) =>
      error instanceof ConversationClientError && error.code === 'aborted'
  )
}

async function evaluateTimeout() {
  const client = new ConversationClient({
    baseUrl: 'https://conversation.test',
    fetch: createAbortablePendingFetch(),
    timeoutMs: 1
  })

  await assert.rejects(
    () => client.turn(REQUEST),
    (error: unknown) =>
      error instanceof ConversationClientError &&
      error.code === 'timeout' &&
      error.requestId === REQUEST.requestId
  )
}

async function evaluateCancellationDuringBodyRead() {
  for (const mode of ['aborted', 'timeout'] as const) {
    const caller = new AbortController()
    const client = new ConversationClient({
      baseUrl: '/api',
      timeoutMs: mode === 'timeout' ? 5 : 30_000,
      fetch: (async (_input, init) => {
        const response = jsonResponse({})
        response.json = () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Aborted', 'AbortError'))
              },
              { once: true }
            )
            if (mode === 'aborted') caller.abort()
          })
        return response
      }) as typeof fetch
    })
    await assert.rejects(
      () => client.session({ signal: caller.signal }),
      (error: unknown) =>
        error instanceof ConversationClientError && error.code === mode
    )
  }
}

async function listSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(entryPath)))
    } else if (entry.name.endsWith('.ts')) {
      files.push(entryPath)
    }
  }
  return files
}

async function evaluateBrowserSafety() {
  const sourceRoot = fileURLToPath(new URL('../../../', import.meta.url))
  const productionRoots = ['client', 'contracts', 'errors']
  const files = [path.join(sourceRoot, 'index.ts')]
  for (const root of productionRoots) {
    files.push(...(await listSourceFiles(path.join(sourceRoot, root))))
  }

  const forbidden = ['node:', 'fastify', '@langchain', 'process.env', 'Buffer']
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    for (const token of forbidden) {
      assert.equal(
        content.includes(token),
        false,
        `${path.relative(sourceRoot, file)} contains browser-unsafe token ${token}`
      )
    }
  }
}

await evaluateSuccess()
await evaluateSession()
await evaluateAuthenticatedBoundaryFailures()
await evaluateSafeServerFailure()
await evaluateInvalidResponse()
await evaluateAbort()
await evaluateTimeout()
await evaluateCancellationDuringBodyRead()
await evaluateBrowserSafety()
console.log('Conversation SDK eval PASS')
