from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dedent(content).lstrip(), encoding='utf-8')


write(
    'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/pre-memory-baseline.contract.ts',
    r'''
    import { z } from 'zod'

    const NullableTokenCountSchema = z.number().int().nonnegative().nullable()

    export const PreMemoryBaselineSchema = z
      .object({
        baselineId: z.literal('pre-memory.v1'),
        correlationId: z.string().min(1),
        evaluatorVersion: z.literal('pre-memory-quality.v1'),
        fixtureVersion: z.literal('pre-memory-fixture.v1'),
        generatedAt: z.literal('2026-09-03T12:00:00.000Z'),
        hashes: z
          .object({
            requestSha256: z.string().regex(/^[a-f0-9]{64}$/),
            responseSha256: z.string().regex(/^[a-f0-9]{64}$/)
          })
          .strict(),
        metrics: z
          .object({
            estimatedContextTokens: z.number().int().nonnegative(),
            firstTokenLatency: z
              .object({ status: z.literal('unavailable') })
              .strict(),
            memoryStatus: z.literal('skipped'),
            modelCalls: z.literal(1),
            providerUsage: z
              .object({
                inputTokens: NullableTokenCountSchema,
                modelId: z.string().min(1),
                outputTokens: NullableTokenCountSchema,
                providerId: z.string().min(1),
                totalTokens: NullableTokenCountSchema
              })
              .strict()
              .nullable(),
            totalLatency: z
              .object({
                measurementMode: z.literal('deterministic-harness'),
                milliseconds: z.number().nonnegative(),
                status: z.literal('measured')
              })
              .strict()
          })
          .strict(),
        pricing: z
          .object({
            cost: z
              .object({
                reason: z.literal('provider-pricing-unavailable'),
                status: z.literal('blocked')
              })
              .strict(),
            rateSnapshotId: z.literal('provider-pricing-unavailable.v1'),
            rateStatus: z.literal('unavailable'),
            unit: z.literal('usd-per-million-tokens')
          })
          .strict(),
        quality: z
          .object({
            checks: z
              .object({
                bounded: z.literal(true),
                nonEmpty: z.literal(true),
                syntheticExpectationMatched: z.literal(true)
              })
              .strict(),
            status: z.literal('pass')
          })
          .strict()
      })
      .strict()

    export type PreMemoryBaseline = z.infer<typeof PreMemoryBaselineSchema>
    ''',
)

write(
    'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/pre-memory-baseline.fixture.ts',
    r'''
    import { createHash } from 'node:crypto'

    import { AnaChatModelPort, type AnaChatModelRequest } from '@ai/ana'
    import {
      type ConversationAgentResult,
      ConversationAgentResultSchema
    } from '@ai/conversation'
    import type { ConversationTurnRequest } from '@repo/conversation-sdk'

    export const PRE_MEMORY_FIXTURE_VERSION = 'pre-memory-fixture.v1' as const
    export const PRE_MEMORY_EVALUATOR_VERSION = 'pre-memory-quality.v1' as const
    export const PRE_MEMORY_GENERATED_AT = '2026-09-03T12:00:00.000Z' as const
    export const PRE_MEMORY_TOTAL_LATENCY_MS = 12
    export const PRE_MEMORY_EXPECTED_RESPONSE =
      'Estou aqui para acompanhar você com calma e sem julgamentos.'

    export const PRE_MEMORY_REQUEST: ConversationTurnRequest = Object.freeze({
      agentId: 'ana',
      asOf: PRE_MEMORY_GENERATED_AT,
      conversationId: 'baseline-conversation-1',
      history: [],
      message: 'Oi, Ana. Quero organizar o que estou sentindo hoje.',
      purpose: 'conversation.support',
      requestId: 'baseline-request-1'
    })

    const PRE_MEMORY_MODEL_RESULT = ConversationAgentResultSchema.parse({
      response: PRE_MEMORY_EXPECTED_RESPONSE,
      usage: {
        inputTokens: 52,
        modelId: 'deterministic-ana-v1',
        outputTokens: 14,
        providerId: 'deterministic',
        totalTokens: 66
      }
    })

    export class PreMemoryBaselineModel extends AnaChatModelPort {
      calls = 0

      async invoke(_input: AnaChatModelRequest): Promise<ConversationAgentResult> {
        this.calls += 1
        return PRE_MEMORY_MODEL_RESULT
      }
    }

    export function sha256(value: string): string {
      return createHash('sha256').update(value).digest('hex')
    }
    ''',
)

write(
    'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/pre-memory-baseline.generate.ts',
    r'''
    import { mkdir, writeFile } from 'node:fs/promises'
    import path from 'node:path'
    import { fileURLToPath, pathToFileURL } from 'node:url'

    import {
      ConversationTurnResponseSchema,
      type ConversationTurnResponseData
    } from '@repo/conversation-sdk'

    import { createConversationApi } from '@app'

    import {
      type PreMemoryBaseline,
      PreMemoryBaselineSchema
    } from './pre-memory-baseline.contract'
    import {
      PRE_MEMORY_EVALUATOR_VERSION,
      PRE_MEMORY_EXPECTED_RESPONSE,
      PRE_MEMORY_FIXTURE_VERSION,
      PRE_MEMORY_GENERATED_AT,
      PRE_MEMORY_REQUEST,
      PRE_MEMORY_TOTAL_LATENCY_MS,
      PreMemoryBaselineModel,
      sha256
    } from './pre-memory-baseline.fixture'

    const ARTIFACT_PATH = fileURLToPath(
      new URL('../../../../../baselines/pre-memory.v1.json', import.meta.url)
    )

    function evaluateQuality(response: string) {
      const checks = {
        bounded: response.length <= 16_000,
        nonEmpty: response.trim().length > 0,
        syntheticExpectationMatched: response === PRE_MEMORY_EXPECTED_RESPONSE
      }
      return {
        checks,
        status: Object.values(checks).every(Boolean) ? ('pass' as const) : ('fail' as const)
      }
    }

    export async function generatePreMemoryBaseline(): Promise<PreMemoryBaseline> {
      const model = new PreMemoryBaselineModel()
      const app = await createConversationApi({ model })

      try {
        const injected = await app.inject({
          method: 'POST',
          payload: PRE_MEMORY_REQUEST,
          url: '/v1/conversation/turn'
        })
        if (injected.statusCode !== 200) {
          throw new Error(`Baseline endpoint returned ${injected.statusCode}`)
        }

        const response: ConversationTurnResponseData =
          ConversationTurnResponseSchema.parse(injected.json()).data
        const quality = evaluateQuality(response.response)
        if (quality.status !== 'pass') {
          throw new Error('Deterministic baseline quality evaluation failed')
        }
        if (model.calls !== 1 || response.metrics.modelCalls !== 1) {
          throw new Error('Baseline must make exactly one model call')
        }
        if (response.metrics.memoryStatus !== 'skipped') {
          throw new Error('Pre-Memory baseline activated Memory unexpectedly')
        }

        return PreMemoryBaselineSchema.parse({
          baselineId: 'pre-memory.v1',
          correlationId: response.requestId,
          evaluatorVersion: PRE_MEMORY_EVALUATOR_VERSION,
          fixtureVersion: PRE_MEMORY_FIXTURE_VERSION,
          generatedAt: PRE_MEMORY_GENERATED_AT,
          hashes: {
            requestSha256: sha256(JSON.stringify(PRE_MEMORY_REQUEST)),
            responseSha256: sha256(response.response)
          },
          metrics: {
            estimatedContextTokens: response.metrics.context.estimatedTokens,
            firstTokenLatency: { status: 'unavailable' },
            memoryStatus: 'skipped',
            modelCalls: 1,
            providerUsage: response.metrics.modelUsage,
            totalLatency: {
              measurementMode: 'deterministic-harness',
              milliseconds: PRE_MEMORY_TOTAL_LATENCY_MS,
              status: 'measured'
            }
          },
          pricing: {
            cost: {
              reason: 'provider-pricing-unavailable',
              status: 'blocked'
            },
            rateSnapshotId: 'provider-pricing-unavailable.v1',
            rateStatus: 'unavailable',
            unit: 'usd-per-million-tokens'
          },
          quality
        })
      } finally {
        await app.close()
      }
    }

    export async function writePreMemoryBaseline(): Promise<void> {
      const baseline = await generatePreMemoryBaseline()
      await mkdir(path.dirname(ARTIFACT_PATH), { recursive: true })
      await writeFile(ARTIFACT_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
    }

    const invokedPath = process.argv[1]
    if (
      invokedPath !== undefined &&
      import.meta.url === pathToFileURL(path.resolve(invokedPath)).href
    ) {
      await writePreMemoryBaseline()
      console.log(`Pre-Memory baseline written: ${ARTIFACT_PATH}`)
    }
    ''',
)

write(
    'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/pre-memory-baseline.eval.ts',
    r'''
    import assert from 'node:assert/strict'
    import { readFile } from 'node:fs/promises'

    import { PreMemoryBaselineSchema } from './pre-memory-baseline.contract'
    import {
      PRE_MEMORY_EXPECTED_RESPONSE,
      PRE_MEMORY_REQUEST
    } from './pre-memory-baseline.fixture'
    import { generatePreMemoryBaseline } from './pre-memory-baseline.generate'

    const artifactUrl = new URL(
      '../../../../../baselines/pre-memory.v1.json',
      import.meta.url
    )
    const committed = PreMemoryBaselineSchema.parse(
      JSON.parse(await readFile(artifactUrl, 'utf8'))
    )
    const regenerated = await generatePreMemoryBaseline()

    assert.deepEqual(regenerated, committed)
    assert.equal(committed.metrics.modelCalls, 1)
    assert.equal(committed.metrics.memoryStatus, 'skipped')
    assert.equal(committed.pricing.cost.status, 'blocked')
    assert.equal(committed.pricing.rateStatus, 'unavailable')
    assert.equal(committed.metrics.firstTokenLatency.status, 'unavailable')

    const serialized = JSON.stringify(committed)
    assert.equal(serialized.includes(PRE_MEMORY_REQUEST.message), false)
    assert.equal(serialized.includes(PRE_MEMORY_EXPECTED_RESPONSE), false)
    assert.equal(serialized.includes('OPENAI_API_KEY'), false)
    assert.equal(serialized.includes('rawMemory'), false)
    assert.equal(serialized.includes('transcript'), false)
    assert.equal(serialized.includes('prompt'), false)

    console.log('Pre-Memory baseline eval PASS')
    ''',
)

write(
    'workspaces/apps/conversation-api/src/assurance/baselines/pre-memory/index.ts',
    r'''
    export * from './pre-memory-baseline.contract'
    export * from './pre-memory-baseline.eval'
    export * from './pre-memory-baseline.fixture'
    export * from './pre-memory-baseline.generate'
    ''',
)

package_path = Path('workspaces/apps/conversation-api/package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
existing_test = package['scripts'].get('test', '')
package['scripts']['test:api'] = existing_test
package['scripts']['baseline'] = (
    'node --import tsx '
    'src/assurance/baselines/pre-memory/pre-memory-baseline.generate.ts'
)
package['scripts']['eval'] = (
    'node --import tsx '
    'src/assurance/baselines/pre-memory/pre-memory-baseline.eval.ts'
)
package['scripts']['test'] = 'pnpm run test:api && pnpm run eval'
package_path.write_text(json.dumps(package, indent=2) + '\n', encoding='utf-8')

tsconfig_path = Path('workspaces/apps/conversation-api/tsconfig.json')
tsconfig = json.loads(tsconfig_path.read_text(encoding='utf-8'))
paths = tsconfig['compilerOptions'].setdefault('paths', {})
paths['@app'] = ['src/app/index.ts']
paths['@assurance/baselines/pre-memory'] = [
    'src/assurance/baselines/pre-memory/index.ts'
]
tsconfig_path.write_text(json.dumps(tsconfig, indent=2) + '\n', encoding='utf-8')
