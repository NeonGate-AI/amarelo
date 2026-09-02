import type { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  SystemMessage
} from '@langchain/core/messages'
import type { Runnable } from '@langchain/core/runnables'
import { z } from 'zod'

import {
  type MemoryExtraction,
  MemoryExtractionDeadlineMillisecondsSchema,
  type MemoryExtractionExecutionContext,
  type MemoryExtractionInput,
  type MemoryExtractionResult,
  MemoryExtractionSchema,
  MemoryExtractor
} from '@application/ports/memory-extractor.port'
import {
  createMemoryExtractionApplicationPayload,
  MEMORY_EXTRACTION_STRUCTURED_OUTPUT_NAME
} from '@application/contracts/memory-extraction.contract'
import { MEMORY_EXTRACTION_PROMPT_VERSION } from '@application/prompts/memory-extraction.prompt'

export interface LangChainMemoryExtractorOptions {
  deadlineMilliseconds: number
  modelId: string
  providerId: string
  version: string
}

const LangChainMemoryExtractorOptionsSchema: z.ZodType<LangChainMemoryExtractorOptions> =
  z
    .object({
      deadlineMilliseconds: MemoryExtractionDeadlineMillisecondsSchema,
      modelId: z.string().trim().min(1).max(200),
      providerId: z.string().trim().min(1).max(200),
      version: z.string().trim().min(1).max(100)
    })
    .strict()

export class LangChainMemoryExtractor extends MemoryExtractor {
  readonly deadlineMilliseconds: number
  readonly modelId: string
  readonly promptVersion = MEMORY_EXTRACTION_PROMPT_VERSION
  readonly providerId: string
  readonly version: string

  readonly #structuredModel: Runnable<
    BaseLanguageModelInput,
    { parsed: MemoryExtraction; raw: BaseMessage }
  >

  constructor(model: BaseChatModel, options: LangChainMemoryExtractorOptions) {
    super()
    const validatedOptions =
      LangChainMemoryExtractorOptionsSchema.parse(options)

    this.deadlineMilliseconds = validatedOptions.deadlineMilliseconds
    this.modelId = validatedOptions.modelId
    this.providerId = validatedOptions.providerId
    this.version = validatedOptions.version
    this.#structuredModel = model.withStructuredOutput<MemoryExtraction>(
      MemoryExtractionSchema,
      {
        includeRaw: true,
        name: MEMORY_EXTRACTION_STRUCTURED_OUTPUT_NAME
      }
    )
  }

  async extract(
    input: MemoryExtractionInput,
    context: MemoryExtractionExecutionContext
  ): Promise<MemoryExtractionResult> {
    const payload = createMemoryExtractionApplicationPayload(input)
    const output = await this.#structuredModel.invoke(
      [
        new SystemMessage(payload.systemPrompt),
        new HumanMessage(payload.userPrompt)
      ],
      { signal: context.signal }
    )

    const usageMetadata = AIMessage.isInstance(output.raw)
      ? output.raw.usage_metadata
      : undefined

    return {
      extraction: MemoryExtractionSchema.parse(output.parsed),
      usage: {
        inputTokens: usageMetadata?.input_tokens ?? null,
        modelId: this.modelId,
        outputTokens: usageMetadata?.output_tokens ?? null,
        providerId: this.providerId,
        totalTokens: usageMetadata?.total_tokens ?? null
      }
    }
  }
}
