import type { RankingMetrics } from '@repo/evaluation'

export interface MemoryRetrievalEvalResult {
  readonly name: string
  readonly metrics?: RankingMetrics
}

export type MemoryRetrievalEvalCase = () => Promise<MemoryRetrievalEvalResult>
