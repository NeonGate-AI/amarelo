import {
  Queue,
  Worker,
  UnrecoverableError,
  type ConnectionOptions
} from 'bullmq'
import {
  MemoryBackgroundJobSchema,
  type MemoryBackgroundJob,
  type MemoryBackgroundProcessResult
} from '@application/background'

export const MEMORY_BACKGROUND_QUEUE = 'memory-curation-v1'
export interface MemoryBackgroundWorkerRuntime {
  pending(limit: number): Promise<readonly MemoryBackgroundJob[]>
  markPublished(eventId: string): Promise<void>
  process(
    job: MemoryBackgroundJob,
    options: { readonly attempt: number }
  ): Promise<MemoryBackgroundProcessResult>
  metrics(): Promise<unknown>
  close(): Promise<void>
}
export interface MemoryBackgroundWorkerOptions {
  readonly runtime: MemoryBackgroundWorkerRuntime
  readonly redisQueueUrl: string
  readonly redisCacheUrl?: string
  readonly concurrency?: number
  readonly dispatchIntervalMs?: number
  readonly observe?: (report: Readonly<Record<string, unknown>>) => void
}
function redisConnection(
  queueUrl: string,
  cacheUrl?: string
): ConnectionOptions {
  const queue = new URL(queueUrl)
  if (!['redis:', 'rediss:'].includes(queue.protocol))
    throw new Error('Use a Redis Queue URL')
  if (cacheUrl !== undefined) {
    const cache = new URL(cacheUrl)
    if (
      cache.hostname.toLowerCase() === queue.hostname.toLowerCase() &&
      (cache.port || '6379') === (queue.port || '6379')
    )
      throw new Error(
        'Redis Queue and Redis Cache must be physically separate instances'
      )
  }
  const db = Number(queue.pathname.slice(1) || '0')
  if (!Number.isSafeInteger(db) || db < 0)
    throw new Error('Invalid Redis Queue database')
  return {
    host: queue.hostname,
    port: Number(queue.port || 6379),
    db,
    username: queue.username ? decodeURIComponent(queue.username) : undefined,
    password: queue.password ? decodeURIComponent(queue.password) : undefined,
    tls: queue.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
    connectTimeout: 5_000
  }
}

/** Redis carries references only; the Neo4j outbox remains authoritative. */
export async function startMemoryBackgroundWorker(
  options: MemoryBackgroundWorkerOptions
) {
  const concurrency = options.concurrency ?? 1
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw new Error('Memory worker concurrency must be between one and four')
  const dispatchIntervalMs = options.dispatchIntervalMs ?? 1_000
  if (
    !Number.isSafeInteger(dispatchIntervalMs) ||
    dispatchIntervalMs < 250 ||
    dispatchIntervalMs > 60_000
  )
    throw new Error('Invalid outbox dispatch interval')
  const connection = redisConnection(
    options.redisQueueUrl,
    options.redisCacheUrl
  )
  const queue = new Queue<MemoryBackgroundJob>(MEMORY_BACKGROUND_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000, jitter: 0.2 },
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: { age: 604_800, count: 10_000 }
    }
  })
  const startedAt = Date.now()
  let completed = 0
  let failed = 0
  let closing = false
  let publishing: Promise<void> | undefined
  const ages: number[] = []
  const observe = (report: Readonly<Record<string, unknown>>) => {
    try {
      options.observe?.(report)
    } catch {
      /* Observation does not replay paid work. */
    }
  }
  const worker = new Worker<MemoryBackgroundJob, MemoryBackgroundProcessResult>(
    MEMORY_BACKGROUND_QUEUE,
    async (job) => {
      const parsed = MemoryBackgroundJobSchema.safeParse(job.data)
      if (!parsed.success)
        throw new UnrecoverableError('invalid-reference-payload')
      ages.push(Math.max(0, Date.now() - job.timestamp))
      if (ages.length > 1_000) ages.shift()
      const result = await options.runtime.process(parsed.data, {
        attempt: job.attemptsMade + 1
      })
      if (result.status === 'deferred') throw new Error('memory-work-deferred')
      if (result.status === 'quarantined')
        throw new UnrecoverableError('memory-work-quarantined')
      observe({
        schemaVersion: 'memory-background-outcome-v1',
        status: result.status,
        modelCalls: result.modelCalls,
        accepted: result.accepted
      })
      return result
    },
    { connection, concurrency, lockDuration: 60_000, maxStalledCount: 1 }
  )
  worker.on('completed', () => {
    completed++
  })
  worker.on('failed', (job) => {
    if (
      job === undefined ||
      job.attemptsMade >= (job.opts.attempts ?? 3) ||
      job.finishedOn !== undefined
    )
      failed++
    observe({
      schemaVersion: 'memory-background-outcome-v1',
      status: 'attempt-failed',
      attempt: job?.attemptsMade ?? null
    })
  })
  worker.on('error', () =>
    observe({
      schemaVersion: 'memory-background-outcome-v1',
      status: 'broker-error'
    })
  )
  queue.on('error', () =>
    observe({
      schemaVersion: 'memory-background-outcome-v1',
      status: 'publisher-error'
    })
  )
  const dispatch = (): Promise<void> => {
    if (publishing !== undefined) return publishing
    if (closing) return Promise.resolve()
    publishing = (async () => {
      for (const raw of await options.runtime.pending(100)) {
        if (closing) break
        const job = MemoryBackgroundJobSchema.parse(raw)
        await queue.add('curate', job, { jobId: job.eventId })
        await options.runtime.markPublished(job.eventId)
      }
    })().finally(() => {
      publishing = undefined
    })
    return publishing
  }
  const tick = () => {
    void dispatch().catch(() =>
      observe({
        schemaVersion: 'memory-background-outcome-v1',
        status: 'publication-pending'
      })
    )
  }
  const timer = setInterval(tick, dispatchIntervalMs)
  try {
    await Promise.all([queue.waitUntilReady(), worker.waitUntilReady()])
    tick()
  } catch (error) {
    clearInterval(timer)
    await Promise.allSettled([
      worker.close(true),
      queue.close(),
      options.runtime.close()
    ])
    throw error
  }
  return {
    dispatch,
    async metrics() {
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'failed'
      )
      const sorted = [...ages].sort((a, b) => a - b)
      return {
        schemaVersion: 'memory-background-worker-metrics-v1',
        observedAt: new Date().toISOString(),
        counts,
        completed,
        terminalFailures: failed,
        ageSampleSize: sorted.length,
        p95QueueAgeMs:
          sorted.length === 0
            ? null
            : sorted[Math.ceil(sorted.length * 0.95) - 1],
        completedPerSecond:
          completed / Math.max(1, (Date.now() - startedAt) / 1_000),
        strongModelEscalations: 0,
        accounting: await options.runtime.metrics()
      }
    },
    async close() {
      if (closing) return
      closing = true
      clearInterval(timer)
      await publishing?.catch(() => undefined)
      // BullMQ renews its own lock while the fenced database claim runs.
      await worker.close()
      await queue.close()
      await options.runtime.close()
    }
  }
}
