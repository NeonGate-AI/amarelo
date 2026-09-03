from pathlib import Path
import json

files = {
    'workspaces/apps/conversation-api/src/assurance/evals/pre-memory-baseline/pre-memory-baseline.contract.ts': r"""
import { z } from 'zod'

const Sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/u)
const NonNegativeIntegerSchema = z.number().int().nonnegative()

export const PreMemoryBaselineArtifactSchema = z
  .object({
    baselineId: z.literal('spec-009-ana-reflex-v1'),
    correlation: z
      .object({
        conversationIdHash: Sha256Schema,
        requestId: z.string().trim().min(1)
      })
      .strict(),
    economics: z
      .object({
        cost: z
          .object({
            currency: z.literal('USD'),
            inputMicrousd: NonNegativeIntegerSchema,
            outputMicrousd: NonNegativeIntegerSchema,
            status: z.literal('calculated'),
            totalMicrousd: NonNegativeIntegerSchema,
            unit: z.literal('micro-usd')
          })
          .strict(),
        rateSnapshot: z
          .object({
            effectiveAt: z.string().datetime({ offset: true }),
            id: z.literal('synthetic-chat-model-rate-v1'),
            inputMicrousdPerMillionTokens: NonNegativeIntegerSchema,
            modelId: z.literal('synthetic-chat-model'),
            outputMicrousdPerMillionTokens: NonNegativeIntegerSchema,
            providerId: z.literal('synthetic-provider')
          })
          .strict()
      })
      .strict(),
    fixture: z
      .object({
        id: z.literal('ana-reflex-synthetic-v1'),
        requestHash: Sha256Schema,
        responseHash: Sha256Schema,
        version: z.literal('1')
      })
      .strict(),
    generatedAt: z.string().datetime({ offset: true }),
    quality: z
      .object({
        checks: z
          .object({
            noClinicalClaim: z.boolean(),
            nonEmpty: z.boolean(),
            supportiveBoundary: z.boolean()
          })
          .strict(),
        evaluatorVersion: z.literal('ana-support-deterministic-v1'),
        result: z.enum(['fail', 'pass'])
      })
      .strict(),
    runtime: z
      .object({
        agentId: z.literal('ana'),
        instructionVersion: z.literal('ana-support-v1'),
        memoryStatus: z.literal('skipped'),
        modelId: z.literal('synthetic-chat-model'),
        providerId: z.literal('synthetic-provider'),
        routingLane: z.literal('reflex'),
        routingPolicyVersion: z.literal(
          'conversation-routing-deterministic-v1'
        )
      })
      .strict(),
    schemaVersion: z.literal('spec-009-pre-memory-baseline-v1'),
    usage: z
      .object({
        estimated: z
          .object({
            contextTokens: NonNegativeIntegerSchema,
            estimatorVersion: z.literal(
              'conversation-history-codepoint-quarter-v1'
            )
          })
          .strict(),
        firstTokenLatency: z
          .object({ status: z.literal('unavailable') })
          .strict(),
        modelCalls: z.literal(1),
        providerReported: z
          .object({
            inputTokens: NonNegativeIntegerSchema,
            outputTokens: NonNegativeIntegerSchema,
            status: z.literal('available'),
            totalTokens: NonNegativeIntegerSchema
          })
          .strict(),
        totalLatencyMs: z.number().nonnegative()
      })
      .strict()
  })
  .strict()

export type PreMemoryBaselineArtifact = z.infer<
  typeof PreMemoryBaselineArtifactSchema
>
""",
    'workspaces/apps/conversation-api/src/assurance/evals/pre-memory-baseline/pre-memory-baseline.fixtures.ts': r"""
import {
  AnaChatModelPort,
  AnaConversationAgent,
  type AnaChatModelRequest,
  type AnaChatModelResult
} from '@ai/ana'
import { ConversationRuntime } from '@ai/conversation'
import type { ConversationTurnRequest } from '@repo/conversation-sdk'
import type { FastifyInstance } from 'fastify'

import { createConversationApi } from 'conversation-api'

export const PRE_MEMORY_BASELINE_GENERATED_AT =
  '2026-09-03T12:00:00.000Z' as const

export const PRE_MEMORY_BASELINE_REQUEST: ConversationTurnRequest =
  Object.freeze({
    agentId: 'ana',
    asOf: PRE_MEMORY_BASELINE_GENERATED_AT,
    conversationId: 'spec-009-baseline-conversation-1',
    history: Object.freeze([]),
    message: 'Oi!',
    purpose: 'conversation.support',
    requestId: 'spec-009-baseline-request-1'
  })

export const PRE_MEMORY_BASELINE_RESPONSE =
  'Estou aqui para acompanhar você.' as const

export const PRE_MEMORY_RATE_SNAPSHOT = Object.freeze({
  effectiveAt: '2026-09-03T00:00:00.000Z',
  id: 'synthetic-chat-model-rate-v1' as const,
  inputMicrousdPerMillionTokens: 250_000,
  modelId: 'synthetic-chat-model' as const,
  outputMicrousdPerMillionTokens: 750_000,
  providerId: 'synthetic-provider' as const
})

export class PreMemoryBaselineModel extends AnaChatModelPort {
  readonly requests: AnaChatModelRequest[] = []

  async invoke(input: AnaChatModelRequest): Promise<AnaChatModelResult> {
    this.requests.push(input)
    return Object.freeze({
      response: PRE_MEMORY_BASELINE_RESPONSE,
      usage: Object.freeze({
        inputTokens: 40,
        modelId: PRE_MEMORY_RATE_SNAPSHOT.modelId,
        outputTokens: 8,
        providerId: PRE_MEMORY_RATE_SNAPSHOT.providerId,
        totalTokens: 48
      })
    })
  }
}

export function createPreMemoryBaselineApi(options: {
  readonly model: PreMemoryBaselineModel
  readonly nowMs: () => number
}): FastifyInstance {
  const runtime = new ConversationRuntime({
    agents: [new AnaConversationAgent({ model: options.model })]
  })
  return createConversationApi({ nowMs: options.nowMs, runtime })
}

export function createPreMemorySequenceClock(
  ...values: readonly number[]
): () => number {
  let index = 0
  return () => {
    const value = values.at(Math.min(index, values.length - 1)) ?? 0
    index += 1
    return value
  }
}

export function createPreMemoryInjectedFetch(
  app: FastifyInstance
): typeof fetch {
  const injectedFetch: typeof fetch = async (input, init) => {
    if (init?.signal?.aborted === true) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const inputUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    const url = new URL(inputUrl)
    const requestMethod = (init?.method ?? 'GET').toUpperCase() as
      | 'DELETE'
      | 'GET'
      | 'HEAD'
      | 'OPTIONS'
      | 'PATCH'
      | 'POST'
      | 'PUT'
    const injectedResponse = await app.inject({
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      method: requestMethod,
      payload: typeof init?.body === 'string' ? init.body : undefined,
      url: `${url.pathname}${url.search}`
    })

    return new Response(injectedResponse.body, {
      headers: Object.entries(injectedResponse.headers).flatMap(
        ([name, value]) =>
          value === undefined
            ? []
            : [[name, Array.isArray(value) ? value.join(', ') : String(value)]]
      ),
      status: injectedResponse.statusCode
    })
  }

  return injectedFetch
}
""",
    'workspaces/apps/conversation-api/src/assurance/evals/pre-memory-baseline/pre-memory-baseline.eval.ts': r"""
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
    throw new RangeError('The synthetic rate snapshot must produce exact micro-USD')
  }
  return numerator / MICROS_PER_UNIT
}

function calculateCost(
  usage:
    | {
        readonly inputTokens: number
        readonly outputTokens: number
      }
    | null,
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
  const normalized = response.normalize('NFKC').trim().toLocaleLowerCase('pt-BR')
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
    result: Object.values(checks).every(Boolean) ? ('pass' as const) : ('fail' as const)
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
  await writeFile(ARTIFACT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
}

const artifactText = await readFile(ARTIFACT_PATH, 'utf8')
const committedArtifact = PreMemoryBaselineArtifactSchema.parse(
  JSON.parse(artifactText) as unknown
)
assert.deepEqual(committedArtifact, artifact)
assertSanitized(artifactText, committedArtifact)
console.log('Pre-Memory baseline eval PASS')
""",
    'workspaces/apps/conversation-api/src/assurance/evals/pre-memory-baseline/index.ts': r"""
export * from './pre-memory-baseline.contract'
export * from './pre-memory-baseline.eval'
export * from './pre-memory-baseline.fixtures'
"""
}

for relative, content in files.items():
    path = Path(relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.lstrip(), encoding='utf-8')

package_path = Path('workspaces/apps/conversation-api/package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
baseline_command = (
    'node --import tsx '
    'src/assurance/evals/pre-memory-baseline/pre-memory-baseline.eval.ts'
)
package['scripts']['eval'] = baseline_command
package['scripts']['eval:baseline'] = baseline_command
package['scripts']['test'] = (
    'node --import tsx '
    'src/assurance/evals/conversation-api/conversation-api.eval.ts && '
    + baseline_command
)
package_path.write_text(json.dumps(package, indent=2) + '\n', encoding='utf-8')
