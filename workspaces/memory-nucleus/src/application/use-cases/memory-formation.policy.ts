import { z } from 'zod'

import { createSourceFingerprint } from './memory-curation.fingerprint'
import {
  estimateMemoryExtractionInputTokens,
  MEMORY_EXTRACTION_INPUT_ESTIMATOR_VERSION
} from '@application/contracts'
import {
  type MemoryCurationGateDecision,
  type MemoryCurationRequest,
  MemoryCurationRequestSchema,
  type PreparedMemorySource,
  PreparedMemorySourceSchema
} from '@application/contracts'
import type { MemoryTextNormalizerPort } from '@application/ports'

export interface MemoryCurationPolicy {
  allowExpensiveFallback: false
  allowExtractorRetry: false
  embedOnWrite: false
  maxCandidates: number
  maxEstimatedInputTokens: number
  maxExtractorInvocations: 1
  maxPersonCharacters: number
  maxPersonTurns: number
  minPersonCharacters: number
  version: string
}

export const MemoryCurationPolicySchema: z.ZodType<MemoryCurationPolicy> = z
  .object({
    allowExpensiveFallback: z.literal(false),
    allowExtractorRetry: z.literal(false),
    embedOnWrite: z.literal(false),
    maxCandidates: z.number().int().min(1).max(5),
    maxEstimatedInputTokens: z.number().int().min(1).max(16_000),
    maxExtractorInvocations: z.literal(1),
    maxPersonCharacters: z.number().int().min(120).max(8_000),
    maxPersonTurns: z.number().int().min(1).max(20),
    minPersonCharacters: z.number().int().min(1).max(8_000),
    version: z.string().min(1).max(100)
  })
  .strict()

export const DEFAULT_MEMORY_CURATION_POLICY: MemoryCurationPolicy = {
  allowExpensiveFallback: false,
  allowExtractorRetry: false,
  embedOnWrite: false,
  maxCandidates: 5,
  maxEstimatedInputTokens: 8_000,
  maxExtractorInvocations: 1,
  maxPersonCharacters: 8_000,
  maxPersonTurns: 20,
  minPersonCharacters: 120,
  version: 'memory-curation-v2'
}

export interface MemoryCurationPreparation {
  decision: MemoryCurationGateDecision
  source: PreparedMemorySource | null
}

const denied = (
  reason: MemoryCurationGateDecision['reason'],
  source: PreparedMemorySource | null = null
): MemoryCurationPreparation => ({
  decision: { eligible: false, reason },
  source
})

export const prepareMemoryCuration = (
  rawRequest: MemoryCurationRequest,
  rawPolicy: MemoryCurationPolicy,
  textNormalizer: MemoryTextNormalizerPort
): MemoryCurationPreparation => {
  const request = MemoryCurationRequestSchema.parse(rawRequest)
  const policy = MemoryCurationPolicySchema.parse(rawPolicy)

  if (request.formationSignal === 'none') {
    return denied('no-formation-signal')
  }

  const personTurns = request.turns
    .filter((turn) => turn.speaker === 'person')
    .map((turn) => ({
      id: turn.id,
      observedAt: new Date(turn.observedAt).toISOString(),
      text: textNormalizer.normalize(turn.text)
    }))
    .filter((turn) => turn.text.length > 0)

  if (personTurns.length === 0) {
    return denied('no-person-source')
  }

  const characterCount = personTurns.reduce(
    (total, turn) => total + turn.text.length,
    0
  )
  const estimatedInputTokens = estimateMemoryExtractionInputTokens({
    maxCandidates: policy.maxCandidates,
    purpose: request.purpose,
    turns: personTurns
  })
  const source = PreparedMemorySourceSchema.parse({
    characterCount,
    estimatedInputTokens,
    inputEstimatorVersion: MEMORY_EXTRACTION_INPUT_ESTIMATOR_VERSION,
    sourceFingerprint: createSourceFingerprint(
      request,
      personTurns,
      textNormalizer
    ),
    truncated: false,
    turns: personTurns
  })

  if (characterCount < policy.minPersonCharacters) {
    return denied('below-minimum-content', source)
  }

  const exceedsBudget =
    personTurns.length > policy.maxPersonTurns ||
    characterCount > policy.maxPersonCharacters ||
    estimatedInputTokens > policy.maxEstimatedInputTokens

  if (exceedsBudget) {
    return denied('input-over-budget', source)
  }

  return {
    decision: { eligible: true, reason: null },
    source
  }
}
