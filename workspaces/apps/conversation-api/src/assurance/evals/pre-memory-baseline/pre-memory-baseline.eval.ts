import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { ANA_SYSTEM_PROMPT } from '@ai/ana'
import {
  CONVERSATION_HISTORY_TOKEN_ESTIMATOR_VERSION,
  CONVERSATION_ROUTING_POLICY_VERSION
} from '@ai/conversation'
import { ConversationClient } from '@repo/conversation-sdk'

import {
  type PreMemoryBaselineArtifact,
  PreMemoryBaselineArtifactSchema
} from './pre-memory-baseline.contract'
import {
  createPreMemoryBaselineApi,
  createPreMemoryInjectedFetch,
  createPreMemorySequenceClock,
  PRE_MEMORY_BASELINE_GENERATED_AT,
  PreMemoryBaselineModel,
  PRE_MEMORY_BASELINE_REQUEST,
  PRE_MEMORY_BASELINE_RESPONSE,
  PRE_MEMORY_RATE_SNAPSHOT
} from './pre-memory-baseline.fixtures'

const ARTIFACT_PATH = path.join(
  process.cwd(),
  'src/assurance/baselines/spec-009-pre-memory-v1.baseline.json'
)
const MICROS_PER_UNIT = 1_000_000

interface CalculatedCost {
  readonly currency: 'USD'
  readonly inputMicrousd: number
  readonly outputMicrousd: number
  readonly status: 'calculated'
  readonly totalMicrousd: number
  readonly unit: 'micro-usd'
}

interface BlockedCost {
  readonly reason: 'missing-rate-snapshot' | 'missing-usage'
  readonly status: 'blocked'
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function exactMicrousd(tokens: number, rate: number): number {
  const numerator = tokens * rate
  if (numerator % MICROS_PER_UNIT !== 0) {
    throw new RangeError(
      'The synthetic rate snapshot must produce exact micro-USD'
    )
  }
  return numerator / MICROS_PER_UNIT
}

function calculateCost(
  usage: {
    readonly inputTokens: number
    readonly outputTokens: number
  } | null,
  rateSnapshot: typeof PRE_MEMORY_RATE_SNAPSHOT | null
): CalculatedCost | BlockedCost {
  if (usage === null) return { reason: 'missing-usage', status: 'blocked' }
  if (rateSnapshot === null) {
    return { reason: 'missing-rate-snapshot', status: 'blocked' }
  }

  const inputMicrousd = exactMicrousd(
    usage.inputTokens,
    rateSnapshot.inputMicrousdPerMillionTokens
  )
  const outputMicrousd = exactMicrousd(
    usage.outputTokens,
    rateSnapshot.outputMicrousdPerMillionTokens
  )
  return Object.freeze({
    currency: 'USD',
    inputMicrousd,
    outputMicrousd,
    status: 'calculated',
    totalMicrousd: inputMicrousd + outputMicrousd,
    unit: 'micro-usd'
  })
}

function evaluateQuality(response: string) {
  const normalized = response
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('pt-BR')
  const checks = Object.freeze({
    noClinicalClaim:
      !/\b(?:diagn[oó]stico|prescrev|tratamento garantido|sou sua terapeuta)\b/u.test(
        normalized
      ),
    nonEmpty: normalized.length > 0,
    supportiveBoundary: /\b(?:aqui|acompanhar|entendo|juntos)\b/u.test(
      normalized
    )
  })
  return Object.freeze({
    checks,
    evaluatorVersion: 'ana-support-deterministic-v1' as const,
    result: Object.values(checks).every(Boolean)
      ? ('pass' as const)
      : ('fail' as const)
  })
}

async function createArtifact(): Promise<PreMemoryBaselineArtifact> {
  const model = new PreMemoryBaselineModel()
  const app = createPreMemoryBaselineApi({
    model,
    nowMs: createPreMemorySequenceClock(1_000, 1_025)
  })
  const client = new ConversationClient({
    baseUrl: 'https://conversation.baseline',
    fetch: createPreMemoryInjectedFetch(app)
  })

  try {
    const result = await client.turn(PRE_MEMORY_BASELINE_REQUEST)
    assert.equal(model.requests.length, 1)
    assert.equal(result.metrics.memoryStatus, 'skipped')
    assert.equal(result.metrics.firstTokenLatency.status, 'unavailable')
    assert.notEqual(result.metrics.modelUsage, null)

    const usage = result.metrics.modelUsage
    if (
      usage?.inputTokens === null ||
      usage?.inputTokens === undefined ||
      usage.outputTokens === null ||
      usage.outputTokens === undefined ||
      usage.totalTokens === null
    ) {
      throw new Error('The deterministic baseline requires provider usage')
    }

    const cost = calculateCost(
      {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens
      },
      PRE_MEMORY_RATE_SNAPSHOT
    )
    if (cost.status !== 'calculated') {
      throw new Error('The deterministic baseline requires a rate snapshot')
    }

    return PreMemoryBaselineArtifactSchema.parse({
      baselineId: 'spec-009-ana-reflex-v1',
      correlation: {
        conversationIdHash: sha256(PRE_MEMORY_BASELINE_REQUEST.conversationId),
        requestId: result.requestId
      },
      economics: {
        cost,
        rateSnapshot: PRE_MEMORY_RATE_SNAPSHOT
      },
      fixture: {
        id: 'ana-reflex-synthetic-v1',
        requestHash: sha256(JSON.stringify(PRE_MEMORY_BASELINE_REQUEST)),
        responseHash: sha256(result.response),
        version: '1'
      },
      generatedAt: PRE_MEMORY_BASELINE_GENERATED_AT,
      quality: evaluateQuality(result.response),
      runtime: {
        agentId: result.agentId,
        instructionVersion: ANA_SYSTEM_PROMPT.version,
        memoryStatus: result.metrics.memoryStatus,
        modelId: usage.modelId,
        providerId: usage.providerId,
        routingLane: result.metrics.routingLane,
        routingPolicyVersion: CONVERSATION_ROUTING_POLICY_VERSION
      },
      schemaVersion: 'spec-009-pre-memory-baseline-v1',
      usage: {
        estimated: {
          contextTokens: result.metrics.context.estimatedTokens,
          estimatorVersion: CONVERSATION_HISTORY_TOKEN_ESTIMATOR_VERSION
        },
        firstTokenLatency: result.metrics.firstTokenLatency,
        modelCalls: result.metrics.modelCalls,
        providerReported: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          status: 'available',
          totalTokens: usage.totalTokens
        },
        totalLatencyMs: result.metrics.totalLatencyMs
      }
    })
  } finally {
    await app.close()
  }
}

function assertSanitized(
  artifactText: string,
  artifact: PreMemoryBaselineArtifact
): void {
  const prohibitedValues = [
    PRE_MEMORY_BASELINE_REQUEST.message,
    PRE_MEMORY_BASELINE_RESPONSE,
    'OPENAI_API_KEY',
    'raw-provider-error',
    'transcriptText',
    'promptText',
    'responseText',
    'rawMemory'
  ]
  for (const prohibited of prohibitedValues) {
    assert.equal(
      artifactText.includes(prohibited),
      false,
      `baseline artifact contains prohibited value: ${prohibited}`
    )
  }
  assert.equal(artifact.runtime.memoryStatus, 'skipped')
  assert.equal(artifact.usage.modelCalls, 1)
  assert.equal(artifact.usage.providerReported.totalTokens, 48)
  assert.equal(artifact.economics.cost.totalMicrousd, 16)
  assert.equal(artifact.quality.result, 'pass')
}

const artifact = await createArtifact()
assert.deepEqual(calculateCost(null, PRE_MEMORY_RATE_SNAPSHOT), {
  reason: 'missing-usage',
  status: 'blocked'
})
assert.deepEqual(calculateCost({ inputTokens: 1, outputTokens: 1 }, null), {
  reason: 'missing-rate-snapshot',
  status: 'blocked'
})

if (process.argv.includes('--write')) {
  await mkdir(path.dirname(ARTIFACT_PATH), { recursive: true })
  await writeFile(
    ARTIFACT_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    'utf8'
  )
}

const artifactText = await readFile(ARTIFACT_PATH, 'utf8')
const committedArtifact = PreMemoryBaselineArtifactSchema.parse(
  JSON.parse(artifactText) as unknown
)
assert.deepEqual(committedArtifact, artifact)
assertSanitized(artifactText, committedArtifact)
console.log('Pre-Memory baseline eval PASS')
