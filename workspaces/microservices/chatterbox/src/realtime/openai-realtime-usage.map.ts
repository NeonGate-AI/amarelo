import {
  createUnknownCostMemoryUsageLedgerEntry,
  MemoryUsageEventSchema,
  MemoryProviderUsageSchema,
  type MemoryUsageLedgerEntry,
  type MemoryRequestScope
} from '@nucleus/memory'

/** Content-free provider accounting, including cancelled responses and partial usage. */
export function mapOpenAiRealtimeUsage(input: {
  readonly scope: MemoryRequestScope
  readonly responseId: string
  readonly model: string
  readonly usage: unknown
  readonly occurredAt: string
}): MemoryUsageLedgerEntry {
  const usage = object(input.usage)
  const inputDetails = object(usage.input_token_details)
  const outputDetails = object(usage.output_token_details)
  const cached = object(inputDetails.cached_tokens_details)
  const parsed = MemoryProviderUsageSchema.safeParse({
    providerId: 'openai',
    modelId: input.model,
    modelVersion: null,
    adapterVersion: 'openai-realtime-sideband-v1',
    provenance: 'provider-reported',
    inputTokens: counter(usage.input_tokens),
    outputTokens: counter(usage.output_tokens),
    totalTokens: counter(usage.total_tokens),
    inputTextTokens: counter(inputDetails.text_tokens),
    inputAudioTokens: counter(inputDetails.audio_tokens),
    outputTextTokens: counter(outputDetails.text_tokens),
    outputAudioTokens: counter(outputDetails.audio_tokens),
    cachedInputTokens: counter(inputDetails.cached_tokens),
    cachedInputTextTokens: counter(cached.text_tokens),
    cachedInputAudioTokens: counter(cached.audio_tokens)
  })
  const eventId = `realtime:${input.responseId}`
  return createUnknownCostMemoryUsageLedgerEntry(
    MemoryUsageEventSchema.parse({
      schemaVersion: 'memory-usage-v1',
      eventId,
      attemptId: eventId,
      tenantId: input.scope.tenantId,
      subjectId: input.scope.subjectId,
      actorId: input.scope.actorId,
      requestId: input.scope.requestId,
      conversationId: input.scope.conversationId,
      occurredAt: input.occurredAt,
      operation: 'conversation-serving',
      sourceKind: 'observed-voice',
      workloadVersion: 'local-realtime-voice-v1',
      profileVersion: 'single-owner-voice-mvp-v1',
      costClass: 'experiment',
      durationBasis: null,
      durations: {
        patientSpeechMilliseconds: null,
        assistantSpeechMilliseconds: null,
        inactivityMilliseconds: null,
        patientSpeechProvenance: 'unavailable',
        assistantSpeechProvenance: 'unavailable',
        inactivityProvenance: 'unavailable',
        measurementVersion: null
      },
      calls: { llm: 1, web: 0, fullText: 0, vector: 0 },
      providerUsage:
        input.usage !== undefined && parsed.success ? parsed.data : null,
      estimatedUsage: null
    }),
    `${eventId}:unpriced-v1`
  )
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
function counter(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}
