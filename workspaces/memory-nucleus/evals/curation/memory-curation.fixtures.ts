import assert from 'node:assert/strict'

import type { ExtractedMemoryCandidate } from '#domain/entities/memory-candidate.entity'
import type {
  MemoryCurationAuthorizationDecision,
  MemoryCurationAuthorizationDecisionResolver
} from '#application/contracts/memory-curation-authorization.contract'
import { InMemoryMemoryCurationAuthorizationResolver } from '#infrastructure/adapters/testing/in-memory-curation-authorization.adapter'
import type { MemoryCurationRequest } from '#application/contracts/memory-curation.contract'
import { createMemoryCurationHandler } from '#application/use-cases/memory-curation.handler'
import type { MemoryCurationPolicy } from '#application/use-cases/memory-formation.policy'
import {
  MemoryExtractor,
  type MemoryExtractionResult
} from '#application/ports/memory-extractor.port'
import { MemoryPersistenceClient } from '#application/ports/memory-curation-persistence.port'

export const FIXED_NOW = new Date('2026-08-27T12:00:00.000Z')
export const HASH_PATTERN = /^[a-f0-9]{64}$/

type ExtractCall = Parameters<MemoryExtractor['extract']>[0]
type ExtractExecutionContext = Parameters<MemoryExtractor['extract']>[1]
type ClaimCall = Parameters<MemoryPersistenceClient['claimSource']>[0]
type SaveCall = Parameters<MemoryPersistenceClient['saveCurationRun']>[0]
export type CurationCallEvent = 'resolve' | 'claim' | 'extract' | 'save'

interface RequestOverrides
  extends Omit<Partial<MemoryCurationRequest>, 'authorization'> {
  authorization?: Partial<MemoryCurationRequest['authorization']>
}

interface ScenarioOptions {
  authorizationDecisions?: readonly MemoryCurationAuthorizationDecision[]
  authorizationResolver?: MemoryCurationAuthorizationDecisionResolver
  claimResult?: Awaited<ReturnType<MemoryPersistenceClient['claimSource']>>
  extraction?: MemoryExtractionResult
  extractorError?: Error
  extractorDeadlineMilliseconds?: number
  extractorWaitsForAbort?: boolean
  now?: () => Date
  policy?: MemoryCurationPolicy
  saveResult?: Awaited<ReturnType<MemoryPersistenceClient['saveCurationRun']>>
}

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value

const eligiblePersonText =
  'Quero guardar que preparo chá de hibisco nas quintas-feiras, separo os cartões por cor e confiro o calendário do planetário antes de escolher a próxima sessão.'

export const buildAuthorizationDecision = (
  overrides: Partial<MemoryCurationAuthorizationDecision> = {}
): MemoryCurationAuthorizationDecision => ({
  actorId: 'actor-ember',
  expiresAt: '2026-08-28T12:00:00.000Z',
  id: 'decision-citrine',
  permitsCandidateProposal: true,
  purpose: 'memory.curation',
  status: 'active',
  subjectId: 'subject-lumen',
  tenantId: 'tenant-aurora',
  ...overrides
})

export const buildRequest = (
  overrides: RequestOverrides = {}
): MemoryCurationRequest => {
  const base: MemoryCurationRequest = {
    actorId: 'actor-ember',
    authorization: {
      decisionId: 'decision-citrine'
    },
    conversationId: 'conversation-orbit',
    formationSignal: 'eligible-source-delta',
    purpose: 'memory.curation',
    requestId: 'request-saffron',
    subjectId: 'subject-lumen',
    tenantId: 'tenant-aurora',
    turns: [
      {
        id: 'turn-person-1',
        observedAt: '2026-08-27T10:00:00.000Z',
        speaker: 'person',
        text: eligiblePersonText
      },
      {
        id: 'turn-elo-1',
        observedAt: '2026-08-27T10:00:03.000Z',
        speaker: 'elo',
        text: 'Entendido; posso organizar essa informação para revisão.'
      }
    ]
  }

  return {
    ...base,
    ...overrides,
    authorization: {
      ...base.authorization,
      ...overrides.authorization
    },
    turns: overrides.turns ?? base.turns
  }
}

export const episodicCandidate = (
  overrides: Partial<ExtractedMemoryCandidate> = {}
): ExtractedMemoryCandidate => ({
  confidence: 'high',
  kind: 'episodic',
  occurredAt: '2026-08-27T10:00:00.000Z',
  sourceTurnIds: ['turn-person-1'],
  statement: 'A pessoa preparou chá de hibisco antes de organizar os cartões.',
  tags: ['chá de hibisco', 'cartões'],
  temporalPrecision: 'exact',
  temporalReference: null,
  uncertainty: null,
  validFrom: null,
  ...overrides
})

export const semanticCandidate = (
  overrides: Partial<ExtractedMemoryCandidate> = {}
): ExtractedMemoryCandidate => ({
  confidence: 'medium',
  kind: 'semantic',
  occurredAt: null,
  sourceTurnIds: ['turn-person-1'],
  statement:
    'A pessoa prefere conferir o calendário do planetário com antecedência.',
  tags: ['planetário', 'planejamento'],
  temporalPrecision: null,
  temporalReference: null,
  uncertainty: null,
  validFrom: '2026-08-27T10:00:00.000Z',
  ...overrides
})

export const extractionResult = (
  candidates: ExtractedMemoryCandidate[],
  usage: MemoryExtractionResult['usage'] = {
    inputTokens: 211,
    modelId: 'mock-memory-model',
    outputTokens: 37,
    providerId: 'mock-provider',
    totalTokens: 248
  }
): MemoryExtractionResult => ({
  extraction: { candidates },
  usage
})

class RecordingMemoryCurationAuthorizationResolver
  implements MemoryCurationAuthorizationDecisionResolver
{
  readonly calls: string[] = []

  constructor(
    private readonly delegate: MemoryCurationAuthorizationDecisionResolver,
    private readonly events: CurationCallEvent[]
  ) {}

  get diagnostics(): Readonly<{ resolveCalls: number }> {
    return { resolveCalls: this.calls.length }
  }

  async resolve(
    authorizationDecisionId: string
  ): Promise<MemoryCurationAuthorizationDecision | null> {
    this.calls.push(authorizationDecisionId)
    this.events.push('resolve')
    return clone(await this.delegate.resolve(authorizationDecisionId))
  }
}

class MockMemoryExtractor extends MemoryExtractor {
  readonly calls: ExtractCall[] = []
  readonly deadlineMilliseconds: number
  readonly executionSignals: AbortSignal[] = []
  readonly modelId = 'mock-memory-model'
  readonly promptVersion = 'mock-memory-prompt-v1'
  readonly providerId = 'mock-provider'
  readonly version = 'mock-extractor-v1'

  constructor(
    private readonly response: MemoryExtractionResult,
    private readonly events: CurationCallEvent[],
    deadlineMilliseconds: number,
    private readonly waitsForAbort: boolean,
    private readonly failure?: Error
  ) {
    super()
    this.deadlineMilliseconds = deadlineMilliseconds
  }

  async extract(
    input: ExtractCall,
    context: ExtractExecutionContext
  ): Promise<MemoryExtractionResult> {
    this.calls.push(clone(input))
    this.executionSignals.push(context.signal)
    this.events.push('extract')

    if (this.failure) {
      throw this.failure
    }

    if (this.waitsForAbort) {
      await new Promise<void>((_resolve, reject) => {
        if (context.signal.aborted) {
          reject(new Error('Mock extractor was aborted'))
          return
        }

        context.signal.addEventListener(
          'abort',
          () => reject(new Error('Mock extractor was aborted')),
          { once: true }
        )
      })
    }

    return clone(this.response)
  }
}

class MockMemoryPersistenceClient extends MemoryPersistenceClient {
  readonly claimCalls: ClaimCall[] = []
  readonly saveCalls: SaveCall[] = []

  constructor(
    private readonly events: CurationCallEvent[],
    private readonly claimResult: Awaited<
      ReturnType<MemoryPersistenceClient['claimSource']>
    > = {
      claimExpiresAt: '2026-08-27T12:05:00.000Z',
      claimId: 'claim-citrine',
      runId: null,
      status: 'claimed'
    },
    private readonly saveResult?: Awaited<
      ReturnType<MemoryPersistenceClient['saveCurationRun']>
    >
  ) {
    super()
  }

  async claimSource(input: ClaimCall) {
    this.claimCalls.push(clone(input))
    this.events.push('claim')
    return clone(this.claimResult)
  }

  async saveCurationRun(input: SaveCall) {
    this.saveCalls.push(clone(input))
    this.events.push('save')

    return this.saveResult
      ? clone(this.saveResult)
      : {
          candidateIds: input.candidates.map(
            (_, index) => `candidate-${this.saveCalls.length}-${index + 1}`
          ),
          runId: `run-${this.saveCalls.length}`,
          status: 'completed' as const
        }
  }
}

export const createScenario = (options: ScenarioOptions = {}) => {
  const events: CurationCallEvent[] = []
  const referenceAuthorizationResolver =
    options.authorizationResolver ??
    new InMemoryMemoryCurationAuthorizationResolver(
      options.authorizationDecisions ?? [buildAuthorizationDecision()]
    )
  const authorizationResolver =
    new RecordingMemoryCurationAuthorizationResolver(
      referenceAuthorizationResolver,
      events
    )
  const extractor = new MockMemoryExtractor(
    options.extraction ?? extractionResult([episodicCandidate()]),
    events,
    options.extractorDeadlineMilliseconds ?? 10_000,
    options.extractorWaitsForAbort ?? false,
    options.extractorError
  )
  const persistence = new MockMemoryPersistenceClient(
    events,
    options.claimResult,
    options.saveResult
  )
  const handler = createMemoryCurationHandler({
    authorizationResolver,
    extractor,
    now: options.now ?? (() => new Date(FIXED_NOW)),
    persistence,
    policy: options.policy
  })

  return { authorizationResolver, events, extractor, handler, persistence }
}

export const assertCallCounts = (
  scenario: ReturnType<typeof createScenario>,
  expected: { claim: number; extract: number; persist: number; resolve: number }
) => {
  assert.equal(
    scenario.authorizationResolver.diagnostics.resolveCalls,
    expected.resolve
  )
  assert.equal(scenario.extractor.calls.length, expected.extract)
  assert.equal(scenario.persistence.claimCalls.length, expected.claim)
  assert.equal(scenario.persistence.saveCalls.length, expected.persist)
}

export const fixedLengthText = (prefix: string, length: number): string => {
  assert.ok(prefix.length <= length)
  return `${prefix}${'x'.repeat(length - prefix.length)}`
}
