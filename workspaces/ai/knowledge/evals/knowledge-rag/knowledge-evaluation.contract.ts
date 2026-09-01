import type { RankingMetrics } from '@repo/evaluation'

export interface KnowledgeEvalResult {
  readonly name: string
  readonly metrics?: RankingMetrics
}

export type KnowledgeEvalCase = () => Promise<KnowledgeEvalResult>
