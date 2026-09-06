import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ChatOpenAI } from '@langchain/openai'
import { createNeo4jMemoryBackgroundRuntime } from '@infrastructure/background'
import { LangChainMemoryExtractor } from '@infrastructure/adapters/inference'
import { startMemoryBackgroundWorker } from '@infrastructure/queue'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error('Missing server configuration: ' + name)
  return value
}
export async function runMemoryBackgroundWorker() {
  if (process.env.MEMORY_BACKGROUND_ENABLED !== 'true')
    throw new Error(
      'Set MEMORY_BACKGROUND_ENABLED=true to start the worker explicitly'
    )
  const modelId = required('MEMORY_EXTRACTION_MODEL')
  const extractor = new LangChainMemoryExtractor(
    new ChatOpenAI({
      apiKey: required('OPENAI_API_KEY'),
      model: modelId,
      maxRetries: 0,
      timeout: 20_000,
      temperature: 0
    }),
    {
      modelId,
      providerId: 'openai',
      version: 'memory-background-provider-v1',
      deadlineMilliseconds: 20_000
    }
  )
  const runtime = await createNeo4jMemoryBackgroundRuntime({
    uri: required('MEMORY_NEO4J_URI'),
    username: required('MEMORY_NEO4J_USERNAME'),
    password: required('MEMORY_NEO4J_PASSWORD'),
    database: required('MEMORY_NEO4J_DATABASE'),
    extractor
  })
  let worker: Awaited<ReturnType<typeof startMemoryBackgroundWorker>>
  try {
    worker = await startMemoryBackgroundWorker({
      runtime,
      redisQueueUrl: required('MEMORY_REDIS_QUEUE_URL'),
      redisCacheUrl: required('MEMORY_REDIS_CACHE_URL'),
      concurrency: Number(process.env.MEMORY_WORKER_CONCURRENCY ?? '1'),
      observe: (report) => {
        process.stdout.write(JSON.stringify(report) + '\n')
      }
    })
  } catch (error) {
    await runtime.close()
    throw error
  }
  const metrics = setInterval(() => {
    void worker
      .metrics()
      .then((report) => process.stdout.write(JSON.stringify(report) + '\n'))
      .catch(() => undefined)
  }, 30_000)
  let closing = false
  const close = async () => {
    if (closing) return
    closing = true
    clearInterval(metrics)
    await worker.close()
  }
  process.once('SIGTERM', () => {
    void close().catch(() => {
      process.exitCode = 1
    })
  })
  process.once('SIGINT', () => {
    void close().catch(() => {
      process.exitCode = 1
    })
  })
}
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void runMemoryBackgroundWorker().catch(() => {
    // Driver/provider exceptions may contain URLs or request content.
    process.stderr.write(
      'Memory background worker could not start or close; inspect server configuration.\n'
    )
    process.exitCode = 1
  })
}
