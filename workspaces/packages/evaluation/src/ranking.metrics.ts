export interface RankingMetrics {
  readonly hitsAtK: number
  readonly precisionAtK: number
  readonly recallAtK: number
  readonly relevantCount: number
  readonly retrievedAtK: number
}

/** Scores a ranked list deterministically without a model-based judge. */
export function scoreRankingAtK(
  rankedIds: readonly string[],
  relevantIds: ReadonlySet<string>,
  k: number
): RankingMetrics {
  if (!Number.isSafeInteger(k) || k <= 0) {
    throw new RangeError('k must be a positive safe integer')
  }

  const retrievedIds = [...new Set(rankedIds.slice(0, k))]
  const hitsAtK = retrievedIds.reduce(
    (hits, id) => hits + (relevantIds.has(id) ? 1 : 0),
    0
  )

  return {
    hitsAtK,
    precisionAtK: retrievedIds.length === 0 ? 0 : hitsAtK / retrievedIds.length,
    recallAtK: relevantIds.size === 0 ? 1 : hitsAtK / relevantIds.size,
    relevantCount: relevantIds.size,
    retrievedAtK: retrievedIds.length
  }
}
