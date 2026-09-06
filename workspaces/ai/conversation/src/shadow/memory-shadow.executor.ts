import { createHash } from 'node:crypto'
import {
  MemorySearchInputSchema,
  MemorySearchResultSchema
} from '@repo/memory-sdk'
import { ConversationMessageSchema } from '../contracts'
import { estimateConversationMessageTokens } from '../context'
import { createMemoryReplacementPlan } from './memory-replacement-plan.compute'
import {
  MemoryPairVersionsSchema,
  type MemoryShadowReport,
  type MemoryShadowTask
} from './memory-shadow.contract'

// A stalled dependency retains its slot. Deadlines never turn hung tasks into an unbounded queue.
let activeShadowJobs = 0
const GLOBAL_SHADOW_LIMIT = 4
export interface MemoryShadowExecutorOptions {
  readonly enabled?: boolean
  readonly maxConcurrent?: number
  readonly timeoutMs?: number
  readonly record: (report: MemoryShadowReport) => Promise<void> | void
}

export class MemoryShadowExecutor {
  constructor(private readonly options: MemoryShadowExecutorOptions) {}

  schedule(
    task: MemoryShadowTask
  ): 'scheduled' | 'disabled' | 'capacity' | 'ineligible' {
    if (this.options.enabled !== true) return 'disabled'
    const limit = this.options.maxConcurrent ?? 2
    const timeoutMs = this.options.timeoutMs ?? 250
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > GLOBAL_SHADOW_LIMIT ||
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > 5_000
    )
      return 'ineligible'
    if (activeShadowJobs >= limit || activeShadowJobs >= GLOBAL_SHADOW_LIMIT)
      return 'capacity'
    try {
      if (task.audience !== 'synthetic' && task.audience !== 'internal')
        return 'ineligible'
      const versions = MemoryPairVersionsSchema.parse(task.versions)
      const candidateVersions = MemoryPairVersionsSchema.parse(
        task.candidateVersions
      )
      if (
        JSON.stringify(versions) !== JSON.stringify(candidateVersions) ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(task.reportId)
      )
        return 'ineligible'
      if (
        task.controlUsage !== null &&
        (task.controlUsage.modelId !== versions.modelId ||
          task.controlUsage.providerId !== versions.providerId)
      )
        return 'ineligible'
      const query = MemorySearchInputSchema.parse(task.query)
      const invocation = Object.freeze({
        ...task.invocation,
        messages: Object.freeze(
          task.invocation.messages.map((message) =>
            Object.freeze(ConversationMessageSchema.parse(message))
          )
        ),
        memory: Object.freeze([...task.invocation.memory]),
        routing: Object.freeze({
          ...task.invocation.routing,
          budget: Object.freeze({ ...task.invocation.routing.budget })
        })
      })
      if (
        invocation.memory.length !== 0 ||
        invocation.messages.at(-1)?.content !== query.query
      )
        return 'ineligible'
      const snapshot = {
        ...task,
        query,
        invocation,
        versions,
        candidateVersions
      }
      activeShadowJobs += 1
      queueMicrotask(() => {
        void this.execute(snapshot, timeoutMs)
          .catch(() => undefined)
          .finally(() => {
            activeShadowJobs -= 1
          })
      })
      return 'scheduled'
    } catch {
      return 'ineligible'
    }
  }

  private async execute(
    task: MemoryShadowTask,
    timeoutMs: number
  ): Promise<void> {
    const start = performance.now()
    const base = {
      schemaVersion: 'memory-shadow-report-v1' as const,
      specId: 'SPEC-011' as const,
      reportId: task.reportId,
      versions: task.versions,
      controlHash: createHash('sha256')
        .update(JSON.stringify(task.invocation))
        .digest('hex'),
      controlComparableTokensEstimated: task.invocation.messages
        .slice(0, -1)
        .reduce(
          (sum, message) =>
            sum + estimateConversationMessageTokens(message.content),
          0
        ),
      controlTotalInputTokens: task.controlUsage?.inputTokens ?? null,
      treatmentTotalInputTokens: null,
      modelCallsInShadow: 0 as const,
      costBrl: null,
      voiceEvidence: 'not-measured' as const,
      sampleSize: 1 as const,
      decision: {
        status: 'hold' as const,
        reasons: ['paired-response-quality-and-cost-not-measured']
      }
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const work = Promise.resolve().then(
      async (): Promise<MemoryShadowReport> => {
        const result = MemorySearchResultSchema.parse(
          await task.memory.search(task.query)
        )
        if (
          result.governance.purpose !== task.query.purpose ||
          result.governance.viewId !== task.expectedViewId ||
          result.tokenBudget.requestedTokens !== task.query.tokenBudget
        )
          throw new Error('Shadow governance mismatch')
        const plan = createMemoryReplacementPlan(
          task.invocation,
          result,
          task.recentBufferTokens
        )
        return {
          ...base,
          status: 'observed',
          reason: 'projection-only',
          treatmentHash: plan.treatmentHash,
          treatmentComparableTokensEstimated:
            plan.treatmentComparableTokensEstimated,
          retrievalLatencyMs: performance.now() - start,
          fullTextCalls: result.diagnostics.fullTextCalls ?? null,
          vectorCalls: 0,
          webCalls: 0
        }
      }
    )
    const unavailable = (
      reason: 'deadline' | 'dependency-or-contract'
    ): MemoryShadowReport => ({
      ...base,
      status: 'unavailable',
      reason,
      treatmentHash: null,
      treatmentComparableTokensEstimated: null,
      retrievalLatencyMs: null,
      fullTextCalls: null,
      vectorCalls: null,
      webCalls: null
    })
    const settled = work.catch(() => unavailable('dependency-or-contract'))
    const deadline = new Promise<MemoryShadowReport>((resolve) => {
      timer = setTimeout(() => resolve(unavailable('deadline')), timeoutMs)
    })
    const report = await Promise.race([settled, deadline])
    if (timer !== undefined) clearTimeout(timer)
    const sink = Promise.resolve()
      .then(() => this.options.record(Object.freeze(report)))
      .catch(() => undefined)
    // Retain the global slot until retrieval and the sink both settle, including after deadline.
    await Promise.allSettled([settled, sink])
  }
}
