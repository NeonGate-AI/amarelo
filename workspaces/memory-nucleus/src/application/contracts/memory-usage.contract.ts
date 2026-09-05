import { z } from 'zod'

export const MemoryUsageIdentifierSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/)

const CounterSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
const NullableCounterSchema = CounterSchema.nullable()
const DurationProvenanceSchema = z.enum([
  'unavailable',
  'observed',
  'synthetic'
])

const MemoryUsageDurationsSchema = z
  .strictObject({
    patientSpeechMilliseconds: NullableCounterSchema,
    assistantSpeechMilliseconds: NullableCounterSchema,
    inactivityMilliseconds: NullableCounterSchema,
    patientSpeechProvenance: DurationProvenanceSchema,
    assistantSpeechProvenance: DurationProvenanceSchema,
    inactivityProvenance: DurationProvenanceSchema,
    measurementVersion: MemoryUsageIdentifierSchema.nullable()
  })
  .readonly()

export const MemoryProviderUsageSchema = z
  .strictObject({
    providerId: MemoryUsageIdentifierSchema,
    modelId: MemoryUsageIdentifierSchema,
    modelVersion: MemoryUsageIdentifierSchema.nullable(),
    adapterVersion: MemoryUsageIdentifierSchema,
    provenance: z.enum(['provider-reported', 'synthetic']),
    inputTokens: NullableCounterSchema,
    outputTokens: NullableCounterSchema,
    totalTokens: NullableCounterSchema,
    inputTextTokens: NullableCounterSchema,
    inputAudioTokens: NullableCounterSchema,
    outputTextTokens: NullableCounterSchema,
    outputAudioTokens: NullableCounterSchema,
    cachedInputTokens: NullableCounterSchema,
    cachedInputTextTokens: NullableCounterSchema,
    cachedInputAudioTokens: NullableCounterSchema
  })
  .superRefine((usage, context) => {
    const totals = [
      [usage.totalTokens, usage.inputTokens, usage.outputTokens],
      [usage.inputTokens, usage.inputTextTokens, usage.inputAudioTokens],
      [usage.outputTokens, usage.outputTextTokens, usage.outputAudioTokens],
      [
        usage.cachedInputTokens,
        usage.cachedInputTextTokens,
        usage.cachedInputAudioTokens
      ]
    ] as const
    for (const [total, first, second] of totals) {
      if (
        total !== null &&
        ((first !== null && second !== null && total !== first + second) ||
          total < (first ?? 0) + (second ?? 0))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Provider token totals are inconsistent'
        })
      }
    }
    const subsets = [
      [usage.cachedInputTokens, usage.inputTokens],
      [usage.cachedInputTextTokens, usage.inputTextTokens],
      [usage.cachedInputAudioTokens, usage.inputAudioTokens]
    ] as const
    for (const [cached, input] of subsets) {
      if (cached !== null && input !== null && cached > input) {
        context.addIssue({
          code: 'custom',
          message: 'Cached tokens must be an input subset'
        })
      }
    }
  })
  .readonly()
export type MemoryProviderUsage = z.infer<typeof MemoryProviderUsageSchema>

const MemoryEstimatedUsageSchema = z
  .strictObject({
    inputTokens: NullableCounterSchema,
    outputTokens: NullableCounterSchema,
    totalTokens: NullableCounterSchema,
    estimatorVersion: MemoryUsageIdentifierSchema
  })
  .readonly()

/** Server-attributed, content-free measurements; null never means measured zero. */
export const MemoryUsageEventSchema = z
  .strictObject({
    schemaVersion: z.literal('memory-usage-v1'),
    eventId: MemoryUsageIdentifierSchema,
    tenantId: MemoryUsageIdentifierSchema,
    subjectId: MemoryUsageIdentifierSchema,
    actorId: MemoryUsageIdentifierSchema,
    requestId: MemoryUsageIdentifierSchema,
    conversationId: MemoryUsageIdentifierSchema,
    attemptId: MemoryUsageIdentifierSchema,
    occurredAt: z.iso.datetime(),
    operation: z.enum([
      'explicit-write',
      'retrieve',
      'suppress',
      'consent',
      'curation',
      'conversation-serving'
    ]),
    sourceKind: z.enum([
      'development-text',
      'synthetic-transcript',
      'observed-voice'
    ]),
    workloadVersion: MemoryUsageIdentifierSchema,
    profileVersion: MemoryUsageIdentifierSchema,
    costClass: z.enum(['operational', 'experiment']),
    durationBasis: z
      .enum([
        'patient-speech',
        'patient-and-assistant-speech',
        'session-elapsed'
      ])
      .nullable(),
    durations: MemoryUsageDurationsSchema,
    calls: z
      .strictObject({
        llm: NullableCounterSchema,
        web: NullableCounterSchema,
        fullText: NullableCounterSchema,
        vector: NullableCounterSchema
      })
      .readonly(),
    providerUsage: MemoryProviderUsageSchema.nullable(),
    estimatedUsage: MemoryEstimatedUsageSchema.nullable()
  })
  .superRefine((event, context) => {
    const measurements = [
      [
        event.durations.patientSpeechMilliseconds,
        event.durations.patientSpeechProvenance
      ],
      [
        event.durations.assistantSpeechMilliseconds,
        event.durations.assistantSpeechProvenance
      ],
      [
        event.durations.inactivityMilliseconds,
        event.durations.inactivityProvenance
      ]
    ] as const
    for (const [milliseconds, provenance] of measurements) {
      if (
        (milliseconds === null) !== (provenance === 'unavailable') ||
        (milliseconds !== null &&
          (event.sourceKind === 'development-text' ||
            event.durations.measurementVersion === null ||
            (event.sourceKind === 'observed-voice' &&
              provenance !== 'observed') ||
            (event.sourceKind === 'synthetic-transcript' &&
              provenance !== 'synthetic')))
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Duration values require matching source and measurement provenance',
          path: ['durations']
        })
      }
    }
  })
  .readonly()
export type MemoryUsageEvent = z.infer<typeof MemoryUsageEventSchema>
