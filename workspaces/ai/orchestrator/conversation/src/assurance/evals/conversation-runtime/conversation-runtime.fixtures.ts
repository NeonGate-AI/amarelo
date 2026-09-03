import type {
  MemorySearchContextProjection,
  MemorySearchInput
} from '@repo/memory-sdk'

import type { AgentId, ConversationTurnInput } from '@contracts'
import {
  type ConversationMemoryContext,
  MemoryContextPort
} from '@memory'
import {
  ConversationAgentPort,
  type ConversationAgentInvocation,
  type ConversationAgentResult
} from '@ports'

export const SYNTHETIC_MEMORY_PROJECTION = Object.freeze({
  memory: Object.freeze({
    category: 'wellbeing.sleep',
    confidence: 0.9,
    kind: 'semantic' as const,
    observedAt: '2026-09-02T12:00:00.000Z',
    provenance: Object.freeze({
      actorType: 'user' as const,
      sourceType: 'conversation' as const,
      transformed: true
    }),
    statement: 'A pessoa prefere reduzir luzes antes de dormir.',
    temporal: Object.freeze({
      validFrom: '2026-09-02T12:00:00.000Z',
      validUntil: null
    }),
    uncertainty: null
  }),
  trust: 'untrusted-memory-data' as const
}) satisfies MemorySearchContextProjection

const DEFAULT_AGENT_RESULT = Object.freeze({
  response: 'Resposta sintética da Ana.',
  usage: Object.freeze({
    inputTokens: 120,
    modelId: 'synthetic-model',
    outputTokens: 24,
    providerId: 'synthetic-provider',
    totalTokens: 144
  })
}) satisfies ConversationAgentResult

export class RecordingConversationAgent extends ConversationAgentPort {
  readonly invocations: ConversationAgentInvocation[] = []

  constructor(
    readonly id: AgentId,
    private readonly result: ConversationAgentResult = DEFAULT_AGENT_RESULT,
    private readonly failure: Error | null = null
  ) {
    super()
  }

  async invoke(
    input: ConversationAgentInvocation
  ): Promise<ConversationAgentResult> {
    this.invocations.push(input)
    if (this.failure !== null) throw this.failure
    return this.result
  }
}

const DEFAULT_MEMORY_CONTEXT = Object.freeze({
  projection: Object.freeze([SYNTHETIC_MEMORY_PROJECTION]),
  requestId: 'memory-request-1',
  tokenBudgetUsed: 120
}) satisfies ConversationMemoryContext

export class FixedMemoryContextPort extends MemoryContextPort {
  readonly inputs: MemorySearchInput[] = []

  constructor(
    private readonly context: ConversationMemoryContext = DEFAULT_MEMORY_CONTEXT
  ) {
    super()
  }

  async retrieve(input: MemorySearchInput): Promise<ConversationMemoryContext> {
    this.inputs.push(input)
    return this.context
  }
}

export class FailingMemoryContextPort extends MemoryContextPort {
  readonly inputs: MemorySearchInput[] = []

  async retrieve(input: MemorySearchInput): Promise<ConversationMemoryContext> {
    this.inputs.push(input)
    throw new Error('synthetic memory outage')
  }
}

export function createConversationTurnInput(
  overrides: Partial<ConversationTurnInput> = {}
): ConversationTurnInput {
  return {
    agentId: 'ana',
    asOf: '2026-09-03T04:00:00.000Z',
    conversationId: 'conversation-1',
    history: [],
    message: 'Como eu tenho lidado com o meu sono ultimamente?',
    purpose: 'conversation.support',
    requestId: 'request-1',
    ...overrides
  }
}
