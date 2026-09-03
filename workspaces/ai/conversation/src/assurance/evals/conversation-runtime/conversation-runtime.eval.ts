import assert from 'node:assert/strict'

import { selectConversationHistory } from '@context'
import {
  type ConversationMessage,
  ConversationTurnInputSchema
} from '@contracts'
import { routeConversationTurn } from '@routing'
import {
  ConversationAgentInvocationError,
  ConversationAgentNotConfiguredError,
  ConversationRuntime,
  DuplicateConversationAgentError
} from '@runtime'

import {
  createConversationTurnInput,
  FailingMemoryContextPort,
  FixedMemoryContextPort,
  RecordingConversationAgent,
  SYNTHETIC_MEMORY_PROJECTION
} from './conversation-runtime.fixtures'

async function evaluateRoutingPolicy() {
  assert.equal(routeConversationTurn('Oi!').lane, 'reflex')
  assert.equal(
    routeConversationTurn('Como eu tenho lidado com meu sono?').lane,
    'contextual'
  )
  assert.equal(
    routeConversationTurn(
      'Analise e compare estratégias para organizar a minha rotina.'
    ).lane,
    'deliberative'
  )
}

async function evaluateHistoryBudget() {
  const history: ConversationMessage[] = [
    { content: 'aaaa', role: 'user' },
    { content: 'bbbb', role: 'assistant' },
    { content: 'cccc', role: 'user' }
  ]
  const selected = selectConversationHistory({
    contextTokenBudget: 16,
    currentMessage: 'agora',
    history
  })

  assert.deepEqual(
    selected.messages.map((message) => message.content),
    ['bbbb', 'cccc']
  )
  assert.equal(selected.estimatedTokens, 16)
  assert.equal(selected.historyMessagesOmitted, 1)
}

async function evaluateReflexTurn() {
  const agent = new RecordingConversationAgent('ana')
  const memory = new FixedMemoryContextPort()
  const runtime = new ConversationRuntime({ agents: [agent], memory })
  const result = await runtime.execute(
    createConversationTurnInput({ message: 'Oi!' })
  )

  assert.equal(result.routing.lane, 'reflex')
  assert.equal(result.memory.status, 'skipped')
  assert.equal(memory.inputs.length, 0)
  assert.equal(agent.invocations.length, 1)
  assert.deepEqual(agent.invocations.at(0)?.memory, [])
}

async function evaluateContextualTurn() {
  const agent = new RecordingConversationAgent('ana')
  const memory = new FixedMemoryContextPort()
  const runtime = new ConversationRuntime({ agents: [agent], memory })
  const result = await runtime.execute(createConversationTurnInput())
  const memoryInput = memory.inputs.at(0)
  const invocation = agent.invocations.at(0)

  assert.equal(result.routing.lane, 'contextual')
  assert.equal(result.routing.budget.memoryTokens, 300)
  assert.equal(result.memory.status, 'retrieved')
  assert.equal(memoryInput?.tokenBudget, 300)
  assert.deepEqual(invocation?.memory, [SYNTHETIC_MEMORY_PROJECTION])
  assert.equal(result.modelUsage?.totalTokens, 144)
}

async function evaluateDeliberativeTurn() {
  const agent = new RecordingConversationAgent('ana')
  const memory = new FixedMemoryContextPort()
  const runtime = new ConversationRuntime({ agents: [agent], memory })
  const result = await runtime.execute(
    createConversationTurnInput({
      message:
        'Analise e compare alternativas para um plano detalhado de rotina.'
    })
  )

  assert.equal(result.routing.lane, 'deliberative')
  assert.equal(result.routing.budget.memoryTokens, 600)
  assert.equal(memory.inputs.at(0)?.tokenBudget, 600)
}

async function evaluateUnavailableMemory() {
  const agent = new RecordingConversationAgent('ana')
  const memory = new FailingMemoryContextPort()
  const runtime = new ConversationRuntime({ agents: [agent], memory })
  const result = await runtime.execute(createConversationTurnInput())

  assert.equal(result.memory.status, 'unavailable')
  assert.equal(result.memory.itemCount, 0)
  assert.deepEqual(agent.invocations.at(0)?.memory, [])
  assert.equal(agent.invocations.length, 1)
}

async function evaluateAgentRegistryFailures() {
  const agent = new RecordingConversationAgent('ana')

  assert.throws(
    () => new ConversationRuntime({ agents: [agent, agent] }),
    (error: unknown) => error instanceof DuplicateConversationAgentError
  )

  const runtime = new ConversationRuntime({ agents: [agent] })
  await assert.rejects(
    () =>
      runtime.execute(
        createConversationTurnInput({
          agentId: 'nico'
        })
      ),
    (error: unknown) => error instanceof ConversationAgentNotConfiguredError
  )
}

async function evaluateAgentFailure() {
  const agent = new RecordingConversationAgent(
    'ana',
    {
      response: 'não utilizado',
      usage: null
    },
    new Error('synthetic provider outage')
  )
  const runtime = new ConversationRuntime({ agents: [agent] })

  await assert.rejects(
    () => runtime.execute(createConversationTurnInput({ message: 'Oi!' })),
    (error: unknown) => error instanceof ConversationAgentInvocationError
  )
}

async function evaluateStrictInputBoundary() {
  const agent = new RecordingConversationAgent('ana')
  const runtime = new ConversationRuntime({ agents: [agent] })
  const invalid = {
    ...createConversationTurnInput(),
    unexpected: true
  }

  assert.equal(ConversationTurnInputSchema.safeParse(invalid).success, false)
  await assert.rejects(() => runtime.execute(invalid))
  assert.equal(agent.invocations.length, 0)
}

async function run() {
  await evaluateRoutingPolicy()
  await evaluateHistoryBudget()
  await evaluateReflexTurn()
  await evaluateContextualTurn()
  await evaluateDeliberativeTurn()
  await evaluateUnavailableMemory()
  await evaluateAgentRegistryFailures()
  await evaluateAgentFailure()
  await evaluateStrictInputBoundary()
  console.log('Conversation runtime eval PASS')
}

await run()
