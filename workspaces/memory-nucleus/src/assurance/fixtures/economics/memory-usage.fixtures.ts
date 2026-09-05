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
    calls: { llm: null, web: null, fullText: null, vector: null },
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

export function memoryUsageLedgerFixture() {
  return {
    schemaVersion: 'memory-usage-ledger-v1',
    ledgerEntryId: 'ledger-1',
    usageEvent: memoryUsageFixture(),
    pricingSnapshot: null,
    brlConversionSnapshot: null,
    cost: {
      sourceAmount: null,
      sourceCurrency: null,
      brlAmount: null,
      evidence: 'unknown',
      calculationVersion: null
    }
  }
}

export function memoryPricingFixture() {
  return {
    schemaVersion: 'memory-pricing-v1',
    pricingVersion: 'synthetic-pricing-v1',
    providerId: 'synthetic-provider',
    modelId: 'synthetic-model',
    modelVersion: 'model-v1',
    currency: 'USD',
    effectiveAt: '2026-09-01T00:00:00.000Z',
    provenance: 'synthetic',
    sourceReference: 'synthetic-rates-v1',
    unit: 'currency-per-million-tokens',
    rates: {
      inputText: 2,
      cachedInputText: 1,
      inputAudio: 4,
      cachedInputAudio: 2,
      outputText: 6,
      outputAudio: 8
    }
  }
}

export function memoryBrlConversionFixture() {
  return {
    schemaVersion: 'memory-brl-conversion-v1',
    rateVersion: 'synthetic-fx-v1',
    sourceCurrency: 'USD',
    targetCurrency: 'BRL',
    brlPerSourceCurrencyUnit: 5,
    effectiveAt: '2026-09-01T00:00:00.000Z',
    provenance: 'synthetic',
    sourceReference: 'synthetic-fx-fixture'
  }
}

export function pricedMemoryUsageLedgerFixture() {
  return {
    ...memoryUsageLedgerFixture(),
    usageEvent: {
      ...memoryUsageFixture(),
      providerUsage: memoryProviderUsageFixture()
    },
    pricingSnapshot: memoryPricingFixture(),
    cost: {
      sourceAmount: 0.00032,
      sourceCurrency: 'USD',
      brlAmount: null,
      evidence: 'calculated',
      calculationVersion: 'synthetic-calculation-v1'
    }
  }
}
