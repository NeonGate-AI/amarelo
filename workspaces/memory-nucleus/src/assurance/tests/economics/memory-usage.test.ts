import { describe, expect, it } from 'vitest'

import { calculateMemoryEconomics } from '@domain/services'
import {
  MemoryUsageEventSchema,
  MemoryProviderUsageSchema
} from '@application/contracts'
import {
  memoryUsageFixture,
  memoryProviderUsageFixture
} from '@assurance/fixtures/economics'

describe('operational Memory economics', () => {
  it('reports profitable Memory with a negative net cost', () => {
    const result = calculateMemoryEconomics({
      inputCostPerMillionTokens: 2,
      memoryProcessingCost: 0.2,
      servingBaselineInputTokens: 600_000,
      servingWithMemoryInputTokens: 200_000,
      totalContextTokens: 2_000,
      usefulContextTokens: 1_500
    })

    expect(result.netMemoryCost).toBeCloseTo(-0.6)
    expect(result.netMemorySaving).toBeCloseTo(0.6)
  })

  it('keeps an uneconomic run positive and zero-processing ROI unknown', () => {
    const input = {
      inputCostPerMillionTokens: 2,
      memoryProcessingCost: 0.2,
      servingBaselineInputTokens: 0,
      servingWithMemoryInputTokens: 100_000,
      totalContextTokens: 1,
      usefulContextTokens: 1
    }
    expect(calculateMemoryEconomics(input).netMemoryCost).toBeCloseTo(0.4)
    const zero = calculateMemoryEconomics({
      ...input,
      memoryProcessingCost: 0,
      servingWithMemoryInputTokens: 0
    })
    expect(zero.netMemoryCost).toBe(0)
    expect(zero.memoryRoi).toBeNull()
  })

  it('accepts content-free usage and rejects extra transcript fields', () => {
    expect(MemoryUsageEventSchema.parse(memoryUsageFixture())).toEqual(
      memoryUsageFixture()
    )
    expect(
      MemoryUsageEventSchema.safeParse({
        ...memoryUsageFixture(),
        transcript: 'SYNTHETIC_PRIVATE_CONTENT'
      }).success
    ).toBe(false)
  })

  it('requires truthful duration provenance and leaves unobserved audio unknown', () => {
    const input = memoryUsageFixture()
    const measured = {
      ...input,
      sourceKind: 'observed-voice',
      durations: {
        ...input.durations,
        patientSpeechMilliseconds: 1_200,
        patientSpeechProvenance: 'observed',
        measurementVersion: 'voice-clock-v1'
      }
    }
    expect(MemoryUsageEventSchema.safeParse(measured).success).toBe(true)
    expect(
      MemoryUsageEventSchema.safeParse({
        ...measured,
        sourceKind: 'development-text'
      }).success
    ).toBe(false)
    expect(
      MemoryUsageEventSchema.safeParse({
        ...measured,
        durations: {
          ...measured.durations,
          patientSpeechProvenance: 'unavailable'
        }
      }).success
    ).toBe(false)
    expect(
      MemoryUsageEventSchema.safeParse({
        ...measured,
        durations: { ...measured.durations, measurementVersion: null }
      }).success
    ).toBe(false)
  })

  it('preserves provider totals and treats cached counters as input subsets', () => {
    const provider = memoryProviderUsageFixture()
    expect(MemoryProviderUsageSchema.parse(provider).totalTokens).toBe(120)
    expect(
      MemoryProviderUsageSchema.safeParse({
        ...provider,
        cachedInputTextTokens: 81
      }).success
    ).toBe(false)
    expect(
      MemoryProviderUsageSchema.safeParse({ ...provider, totalTokens: 160 })
        .success
    ).toBe(false)
    const aggregateOnly = MemoryProviderUsageSchema.parse({
      ...provider,
      inputTextTokens: null,
      inputAudioTokens: null,
      outputTextTokens: null,
      outputAudioTokens: null,
      cachedInputTokens: null,
      cachedInputTextTokens: null,
      cachedInputAudioTokens: null
    })
    expect(aggregateOnly.totalTokens).toBe(120)
    expect(aggregateOnly.inputTextTokens).toBeNull()
    expect(aggregateOnly.cachedInputTokens).toBeNull()
  })
})
