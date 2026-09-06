import { CurateMemoryUseCase } from '@application/use-cases'
import type { MemoryCurationResult } from '@application/contracts'
import {
  MemoryExtractor,
  type MemoryExtractionInput,
  type MemoryExtractionResult,
  type MemoryExtractionExecutionContext
} from '@application/ports'
import {
  MemoryBackgroundJobSchema,
  type MemoryBackgroundExecution,
  type MemoryBackgroundJob,
  type MemoryBackgroundStore
} from './memory-background.contract'
import type { MemoryBackgroundOrchestrationPort } from './memory-background-orchestration.port'

/** At most one model call per durable claim; queue retries are accounted separately. */
export class MemoryBackgroundEngine {
  constructor(
    private readonly store: MemoryBackgroundStore,
    private readonly extractor: MemoryExtractor,
    private readonly now: () => Date,
    private readonly orchestration: MemoryBackgroundOrchestrationPort
  ) {}

  async process(
    rawJob: MemoryBackgroundJob,
    options: { readonly attempt: number }
  ) {
    const job = MemoryBackgroundJobSchema.parse(rawJob)
    if (!Number.isSafeInteger(options.attempt) || options.attempt < 1)
      throw new Error('Background attempt must be a positive integer')

    // Per-invocation closures isolate concurrent jobs without exposing protected
    // evidence, callbacks or authorization state to framework state/checkpoints.
    let execution: MemoryBackgroundExecution | null = null
    let curated: MemoryCurationResult | null = null
    const requireExecution = () => {
      if (execution === null) throw new Error('Background claim is unavailable')
      return execution
    }

    return this.orchestration.run({
      claimAndAdmit: async () => {
        const opened = await this.store.open(job, options.attempt)
        if (opened.status !== 'execute') return opened
        execution = opened.execution
        return null
      },
      curate: async () => {
        const binding = requireExecution()
        curated = await new CurateMemoryUseCase({
          authorizationResolver: binding.authorizationResolver,
          persistence: binding.persistence,
          extractor: this.accountedExtractor(binding),
          textNormalizer: {
            normalize: (text) =>
              text.normalize('NFKC').replace(/\s+/gu, ' ').trim()
          },
          now: this.now
        }).execute(binding.request)
      },
      complete: async () => {
        if (curated === null)
          throw new Error('Background curation is unavailable')
        return requireExecution().complete(curated)
      },
      release: async () => {
        if (execution !== null) await execution.fail()
      }
    })
  }

  private accountedExtractor(
    execution: MemoryBackgroundExecution
  ): MemoryExtractor {
    const delegate = this.extractor
    return new (class extends MemoryExtractor {
      readonly deadlineMilliseconds = delegate.deadlineMilliseconds
      readonly modelId = delegate.modelId
      readonly promptVersion = delegate.promptVersion
      readonly providerId = delegate.providerId
      readonly version = delegate.version

      async extract(
        input: MemoryExtractionInput,
        context: MemoryExtractionExecutionContext
      ) {
        await execution.beforeModel()
        let result: MemoryExtractionResult
        try {
          result = await delegate.extract(input, context)
        } catch (error) {
          await execution.afterModel(null)
          throw error
        }
        await execution.afterModel(result.usage)
        return result
      }
    })()
  }
}
