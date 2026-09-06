import { z } from 'zod'
import type {
  MemoryCurationAuthorizationDecisionResolver,
  MemoryCurationRequest,
  MemoryCurationResult
} from '@application/contracts'
import type {
  MemoryModelUsage,
  MemoryPersistenceClient
} from '@application/ports'

export const MemoryBackgroundJobSchema = z
  .object({
    schemaVersion: z.literal('memory-background-job-v1'),
    eventId: z.string().regex(/^[a-f0-9]{64}$/),
    batchId: z.string().uuid(),
    tenantId: z.string().uuid(),
    subjectId: z.string().uuid(),
    requestId: z.string().min(1).max(200)
  })
  .strict()
export type MemoryBackgroundJob = z.infer<typeof MemoryBackgroundJobSchema>
export type MemoryBackgroundProfile = 'free' | 'paid' | 'internal'
export type MemoryBackgroundIngestResult =
  | {
      readonly status: 'queued' | 'duplicate'
      readonly job: MemoryBackgroundJob
    }
  | { readonly status: 'buffered'; readonly reason: 'below-minimum-content' }
  | { readonly status: 'skipped'; readonly reason: string }
export interface MemoryBackgroundProcessResult {
  readonly status:
    | 'completed'
    | 'duplicate'
    | 'skipped'
    | 'deferred'
    | 'quarantined'
  readonly reason: string | null
  readonly modelCalls: number
  readonly candidateCount: number
  readonly accepted: number
}
export interface MemoryBackgroundExecution {
  readonly request: MemoryCurationRequest
  readonly persistence: MemoryPersistenceClient
  readonly authorizationResolver: MemoryCurationAuthorizationDecisionResolver
  beforeModel(): Promise<void>
  afterModel(usage: MemoryModelUsage | null): Promise<void>
  complete(result: MemoryCurationResult): Promise<MemoryBackgroundProcessResult>
  fail(): Promise<void>
}
export interface MemoryBackgroundStore {
  open(
    job: MemoryBackgroundJob,
    attempt: number
  ): Promise<
    | {
        readonly status: 'execute'
        readonly execution: MemoryBackgroundExecution
      }
    | MemoryBackgroundProcessResult
  >
}
