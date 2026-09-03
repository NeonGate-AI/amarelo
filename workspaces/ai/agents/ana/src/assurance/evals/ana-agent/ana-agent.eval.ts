import assert from 'node:assert/strict'

import {
  ConversationRuntime,
  type ConversationTurnInput
} from '@ai/conversation'

import {
  ANA_SYSTEM_PROMPT,
  AnaAgentIdentityError,
  AnaAgentResponseError,
  AnaConversationAgent
} from '@ai/ana'

import { RecordingAnaChatModel } from './ana-agent.fixtures'

const TURN: ConversationTurnInput = {
  agentId: 'ana',
  asOf: '2026-09-03T12:00:00.000Z',
  conversationId: 'ana-conversation-1',
  history: [],
  message: 'Oi, Ana.',
  purpose: 'conversation.support',
  requestId: 'ana-request-1'
}

async function evaluateRuntimeInvocation() {
  const model = new RecordingAnaChatModel()
  const agent = new AnaConversationAgent({ model })
  const runtime = new ConversationRuntime({ agents: [agent] })
  const result = await runtime.execute(TURN)
  const modelRequest = model.requests.at(0)

  assert.equal(result.response, 'Estou aqui para acompanhar você com calma.')
  assert.equal(result.modelUsage?.totalTokens, 42)
  assert.equal(model.requests.length, 1)
  assert.equal(modelRequest?.instructionVersion, ANA_SYSTEM_PROMPT.version)
  assert.equal(modelRequest?.messages.at(-1)?.content, TURN.message)
  assert.match(modelRequest?.instructions ?? '', /não confiável/i)
  assert.match(modelRequest?.instructions ?? '', /sem diagnosticar/i)
  assert.equal(modelRequest?.instructions.includes(TURN.requestId), false)
}

async function evaluateIdentityBoundary() {
  const agent = new AnaConversationAgent({
    model: new RecordingAnaChatModel()
  })

  await assert.rejects(
    () =>
      agent.invoke({
        agentId: 'nico',
        conversationId: 'conversation-1',
        memory: [],
        messages: [{ content: 'Oi.', role: 'user' }],
        requestId: 'request-1',
        routing: {
          budget: {
            allowKnowledge: false,
            allowTools: false,
            contextTokens: 256,
            memoryTokens: 0,
            reasoning: 'low'
          },
          lane: 'reflex',
          reasonCode: 'short-turn'
        }
      }),
    (error: unknown) => error instanceof AnaAgentIdentityError
  )
}

async function evaluateInvalidModelResult() {
  const model = new RecordingAnaChatModel({
    response: '',
    usage: null
  })
  const runtime = new ConversationRuntime({
    agents: [new AnaConversationAgent({ model })]
  })

  await assert.rejects(
    () => runtime.execute(TURN),
    (error: unknown) =>
      error instanceof Error && error.cause instanceof AnaAgentResponseError
  )
  assert.equal(model.requests.length, 1)
}

await evaluateRuntimeInvocation()
await evaluateIdentityBoundary()
await evaluateInvalidModelResult()
console.log('Ana agent eval PASS')
