import { z } from 'zod'

import { MEMORY_CANDIDATE_SCHEMA_VERSION } from '@domain/entities'
import {
  type MemoryExtractionInput,
  MemoryExtractionSchema
} from '@application/ports'
import {
  MEMORY_EXTRACTION_PROMPT,
  MEMORY_EXTRACTION_PROMPT_VERSION
} from '@application/prompts'

export const MEMORY_EXTRACTION_STRUCTURED_OUTPUT_NAME =
  'amarelo_memory_candidates'

/**
 * Provider-neutral upper-bound estimator for the serialized application
 * payload. One UTF-8 byte is charged as one estimated token, plus an explicit
 * reserve for provider message framing. This is intentionally conservative,
 * but it is not a provider tokenizer or a substitute for the provider's own
 * context/output limits.
 */
export const MEMORY_EXTRACTION_INPUT_ESTIMATOR_VERSION =
  'memory-extraction-utf8-byte-v1'

const PROVIDER_MESSAGE_FRAMING_RESERVE_TOKENS = 256
const textEncoder = new TextEncoder()
const responseJsonSchema = z.toJSONSchema(MemoryExtractionSchema)

export interface MemoryExtractionApplicationPayload {
  readonly systemPrompt: string
  readonly userPrompt: string
}

export const createMemoryExtractionApplicationPayload = (
  input: MemoryExtractionInput
): MemoryExtractionApplicationPayload =>
  Object.freeze({
    systemPrompt: MEMORY_EXTRACTION_PROMPT,
    userPrompt: JSON.stringify({
      maxCandidates: input.maxCandidates,
      purpose: input.purpose,
      turns: input.turns
    })
  })

export const serializeMemoryExtractionApplicationPayload = (
  input: MemoryExtractionInput
): string => {
  const payload = createMemoryExtractionApplicationPayload(input)

  return JSON.stringify({
    messages: [
      { content: payload.systemPrompt, role: 'system' },
      { content: payload.userPrompt, role: 'user' }
    ],
    structuredOutput: {
      candidateSchemaVersion: MEMORY_CANDIDATE_SCHEMA_VERSION,
      name: MEMORY_EXTRACTION_STRUCTURED_OUTPUT_NAME,
      promptVersion: MEMORY_EXTRACTION_PROMPT_VERSION,
      schema: responseJsonSchema
    }
  })
}

export const estimateMemoryExtractionInputTokens = (
  input: MemoryExtractionInput
): number =>
  textEncoder.encode(serializeMemoryExtractionApplicationPayload(input))
    .byteLength + PROVIDER_MESSAGE_FRAMING_RESERVE_TOKENS
