import { CurateMemoryUseCase } from '@application/use-cases'
import { MemoryExtractor, type MemoryExtractionInput, type MemoryExtractionExecutionContext } from '@application/ports'
import { MemoryBackgroundJobSchema, type MemoryBackgroundJob, type MemoryBackgroundStore } from './memory-background.contract'

/** At most one model call per durable claim; queue retries remain separate accounted attempts. */
export class MemoryBackgroundEngine {
  constructor(private readonly store: MemoryBackgroundStore, private readonly extractor: MemoryExtractor, private readonly now: () => Date) {}

  async process(rawJob: MemoryBackgroundJob, options: { readonly attempt: number }) {
    const job = MemoryBackgroundJobSchema.parse(rawJob)
    if (!Number.isSafeInteger(options.attempt) || options.attempt < 1)
      throw new Error('Background attempt must be a positive integer')
    const opened = await this.store.open(job, options.attempt)
    if (opened.status !== 'execute') return opened
    const execution = opened.execution
    const delegate = this.extractor
    class AccountedExtractor extends MemoryExtractor {
      readonly deadlineMilliseconds = delegate.deadlineMilliseconds
      readonly modelId = delegate.modelId
      readonly promptVersion = delegate.promptVersion
      readonly providerId = delegate.providerId
      readonly version = delegate.version
      async extract(input: MemoryExtractionInput, context: MemoryExtractionExecutionContext) {
        await execution.beforeModel()
        let result
        try {
          result = await delegate.extract(input, context)
        } catch (error) {
          await execution.afterModel(null)
          throw error
        }
        await execution.afterModel(result.usage)
        return result
      }
    }
    try {
      const result = await new CurateMemoryUseCase({
        authorizationResolver: execution.authorizationResolver,
        persistence: execution.persistence,
        extractor: new AccountedExtractor(),
        textNormalizer: { normalize: (text) => text.normalize('NFKC').replace(/\s+/gu, ' ').trim() },
        now: this.now
      }).execute(execution.request)
      return await execution.complete(result)
    } catch (error) {
      await execution.fail()
      throw error
    }
  }
}
