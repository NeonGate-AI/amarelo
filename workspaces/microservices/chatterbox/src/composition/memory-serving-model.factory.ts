import { randomUUID } from 'node:crypto'

import {
  createTextMemoryUsageEvent,
  MemoryUsageLedgerEntrySchema,
  type MemoryUsageLedger
} from '@nucleus/memory'

import type { ChatterboxEnvironment } from '../configuration'
import type { LangChainChatModelInvoker } from '../model'
import { createObservationStreamWriter } from '../observability'
import type { AuthenticatedConversationContext } from '../session'
import { createMemoryComparisonVersions } from './memory-comparison-versions.factory'
import { createMemoryRequestScope } from './request-memory-scope.factory'

/** Counts actual provider invocations for both arms; missing usage/pricing stays unknown. */
export function createMemoryServingModelBinding(
  configuration: ChatterboxEnvironment,
  dependencies: {
    readonly model: LangChainChatModelInvoker
    readonly usageLedgerForRequest: (
      context: AuthenticatedConversationContext
    ) => MemoryUsageLedger | null
  }
): (context: AuthenticatedConversationContext) => LangChainChatModelInvoker {
  const versions = createMemoryComparisonVersions(configuration)
  const writeLine = createObservationStreamWriter(process.stdout)
  let pending = 0
  let pendingReports = 0

  function report(
    attemptId: string,
    outcome: 'returned' | 'failed',
    status: 'recorded' | 'unconfirmed'
  ): void {
    if (pendingReports >= 16) return
    pendingReports += 1
    void writeLine(
      `${JSON.stringify({ name: 'chatterbox.serving-usage', schemaVersion: 'chatterbox-serving-usage-v1', attemptId, outcome, status, modelAttempts: 1 })}\n`
    )
      .catch(() => undefined)
      .finally(() => {
        pendingReports -= 1
      })
  }

  return (context) => ({
    async invoke(messages) {
      const attemptId = randomUUID()
      let response:
        | Awaited<ReturnType<LangChainChatModelInvoker['invoke']>>
        | undefined
      try {
        response = await dependencies.model.invoke(messages)
        return response
      } finally {
        const outcome = response === undefined ? 'failed' : 'returned'
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
          const ledger = dependencies.usageLedgerForRequest(context)
          if (
            ledger === null ||
            pending >= configuration.CHATTERBOX_MEMORY_INGEST_MAX_PENDING
          ) {
            report(attemptId, outcome, 'unconfirmed')
          } else {
            const metadata = response?.usage_metadata
            const inputTokens = counter(metadata?.input_tokens)
            const outputTokens = counter(metadata?.output_tokens)
            const cachedTokens = counter(
              metadata?.input_token_details?.cache_read
            )
            const usageEvent = createTextMemoryUsageEvent({
              scope: createMemoryRequestScope(context),
              eventId: attemptId,
              attemptId,
              occurredAt: new Date().toISOString(),
              operation: 'conversation-serving',
              workloadVersion:
                versions?.workloadVersion ?? 'development-text-serving-v1',
              profileVersion:
                versions?.capabilityProfile ?? 'memory-internal-validation-v1',
              costClass: 'experiment',
              calls: { llm: 1, web: 0, fullText: 0, vector: 0 },
              providerUsage:
                metadata === undefined
                  ? null
                  : {
                      providerId: 'openai',
                      modelId:
                        configuration.AI_CONVERSATION_MODEL ?? 'unavailable',
                      modelVersion: null,
                      adapterVersion: 'chatterbox-serving-usage-v1',
                      provenance: 'provider-reported',
                      inputTokens,
                      outputTokens,
                      totalTokens: counter(metadata.total_tokens),
                      inputTextTokens: inputTokens,
                      outputTextTokens: outputTokens,
                      inputAudioTokens: 0,
                      outputAudioTokens: 0,
                      cachedInputTokens: cachedTokens,
                      cachedInputTextTokens: cachedTokens,
                      cachedInputAudioTokens: 0
                    }
            })
            const entry = MemoryUsageLedgerEntrySchema.parse({
              schemaVersion: 'memory-usage-ledger-v1',
              ledgerEntryId: `${attemptId}:unpriced-v1`,
              usageEvent,
              pricingSnapshot: null,
              brlConversionSnapshot: null,
              cost: {
                sourceAmount: null,
                sourceCurrency: null,
                brlAmount: null,
                evidence: 'unknown',
                calculationVersion: null
              }
            })
            pending += 1
            const append = ledger
              .append(entry)
              .then(() => 'recorded' as const)
              .catch(() => 'unconfirmed' as const)
              .finally(() => {
                pending -= 1
              })
            const status = await Promise.race([
              append,
              new Promise<'unconfirmed'>((resolve) => {
                timer = setTimeout(
                  () => resolve('unconfirmed'),
                  configuration.CHATTERBOX_MEMORY_INGEST_TIMEOUT_MS
                )
                timer.unref()
              })
            ])
            report(attemptId, outcome, status)
          }
        } catch {
          report(attemptId, outcome, 'unconfirmed')
        } finally {
          if (timer !== undefined) clearTimeout(timer)
        }
      }
    }
  })
}

function counter(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}
