export function memoryUsageFixture() {
  return {
    schemaVersion: 'memory-usage-v1',
    eventId: 'usage-1',
    tenantId: 'tenant-a',
    subjectId: 'subject-a',
    actorId: 'subject-a',
    requestId: 'request-1',
    conversationId: 'conversation-1',
    attemptId: 'attempt-1',
    occurredAt: '2026-09-05T12:00:00.000Z',
    operation: 'explicit-write',
    sourceKind: 'development-text',
    workloadVersion: 'spec025-60-minutes-weekly-v1',
    profileVersion: 'internal-memory-validation-v1',
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
    providerUsage: null,
    estimatedUsage: null
  }
}

export function memoryProviderUsageFixture() {
  return {
    providerId: 'synthetic-provider',
    modelId: 'synthetic-model',
    modelVersion: 'model-v1',
    adapterVersion: 'adapter-v1',
    provenance: 'synthetic',
    inputTokens: 100,
    outputTokens: 20,
    totalTokens: 120,
    inputTextTokens: 80,
    inputAudioTokens: 20,
    outputTextTokens: 15,
    outputAudioTokens: 5,
    cachedInputTokens: 40,
    cachedInputTextTokens: 30,
    cachedInputAudioTokens: 10
  }
}
