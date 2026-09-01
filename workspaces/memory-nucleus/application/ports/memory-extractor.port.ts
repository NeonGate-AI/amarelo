import { z } from 'zod'

import {
  ExtractedMemoryCandidateSchema,
  type ExtractedMemoryCandidate
} from '#domain/entities/memory-candidate.entity'
import type {
  PreparedConversationTurn,
  PurposeCode
} from '#application/contracts/memory-curation.contract'

export interface MemoryExtraction {
  candidates: ExtractedMemoryCandidate[]
}

export const MemoryExtractionSchema: z.ZodType<MemoryExtraction> = z
  .object({
    candidates: z.array(ExtractedMemoryCandidateSchema).max(5)
  })
  .strict()

export interface MemoryExtractionInput {
  maxCandidates: number
  purpose: PurposeCode
  turns: PreparedConversationTurn[]
}

export interface MemoryModelUsage {
  inputTokens: number | null
  modelId: string
  outputTokens: number | null
  providerId: string
  totalTokens: number | null
}

export const MemoryModelUsageSchema: z.ZodType<MemoryModelUsage> = z
  .object({
    inputTokens: z.number().int().nonnegative().nullable(),
    modelId: z.string().min(1).max(200),
    outputTokens: z.number().int().nonnegative().nullable(),
    providerId: z.string().min(1).max(200),
    totalTokens: z.number().int().nonnegative().nullable()
  })
  .strict()
  .superRefine((usage, context) => {
    if (
      usage.totalTokens !== null &&
      usage.inputTokens !== null &&
      usage.totalTokens < usage.inputTokens
    ) {
      context.addIssue({
        code: 'custom',
        message: 'totalTokens must not be lower than inputTokens',
        path: ['totalTokens']
      })
    }

    if (
      usage.totalTokens !== null &&
      usage.outputTokens !== null &&
      usage.totalTokens < usage.outputTokens
    ) {
      context.addIssue({
        code: 'custom',
        message: 'totalTokens must not be lower than outputTokens',
        path: ['totalTokens']
      })
    }

    if (
      usage.inputTokens !== null &&
      usage.outputTokens !== null &&
      usage.totalTokens !== null &&
      usage.totalTokens !== usage.inputTokens + usage.outputTokens
    ) {
      context.addIssue({
        code: 'custom',
        message: 'totalTokens must equal inputTokens + outputTokens',
        path: ['totalTokens']
      })
    }
  })

export interface MemoryExtractionResult {
  extraction: MemoryExtraction
  usage: MemoryModelUsage
}

export const MemoryExtractionDeadlineMillisecondsSchema = z
  .number()
  .int()
  .min(1)
  .max(120_000)

export interface MemoryExtractionExecutionContext {
  /** Cooperative cancellation signal backed by the engine's event-loop timer. */
  readonly signal: AbortSignal
}

export class MemoryExtractionDeadlineError extends Error {
  constructor() {
    super('Memory extraction exceeded its configured deadline')
    this.name = 'MemoryExtractionDeadlineError'
  }
}

export abstract class MemoryExtractor {
  abstract readonly deadlineMilliseconds: number
  abstract readonly modelId: string
  abstract readonly promptVersion: string
  abstract readonly providerId: string
  abstract readonly version: string

  abstract extract(
    input: MemoryExtractionInput,
    context: MemoryExtractionExecutionContext
  ): Promise<MemoryExtractionResult>
}
