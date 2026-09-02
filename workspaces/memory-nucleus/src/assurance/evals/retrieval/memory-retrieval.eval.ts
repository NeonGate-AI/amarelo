import { stdout } from 'node:process'

import { MEMORY_AUTHORIZATION_EVALS } from './memory-authorization.eval.ts'
import { MEMORY_COST_EVALS } from './memory-cost.eval.ts'
import {
  MEMORY_LIFECYCLE_EVALS,
  MEMORY_PROVENANCE_EVALS
} from './memory-lifecycle.eval.ts'
import { MEMORY_PROMPT_INJECTION_EVALS } from './memory-prompt-injection.eval.ts'
import { MEMORY_OBSERVABILITY_EVALS } from './memory-observability.eval.ts'
import {
  MEMORY_CANDIDATE_FAIRNESS_EVALS,
  MEMORY_RANKING_EVALS
} from './memory-ranking.eval.ts'
import type {
  MemoryRetrievalEvalCase,
  MemoryRetrievalEvalResult
} from './memory-retrieval.contract.ts'
import { MEMORY_REPOSITORY_DEFENSE_EVALS } from './memory-repository-defense.eval.ts'
import { MEMORY_SCOPE_EVALS } from './memory-scope.eval.ts'
import { MEMORY_TEMPORAL_EVALS } from './memory-temporal.eval.ts'
import { MEMORY_TOKEN_BUDGET_EVALS } from './memory-token-budget.eval.ts'

const MEMORY_RETRIEVAL_EVALS: readonly MemoryRetrievalEvalCase[] = [
  ...MEMORY_AUTHORIZATION_EVALS,
  ...MEMORY_SCOPE_EVALS,
  ...MEMORY_LIFECYCLE_EVALS,
  ...MEMORY_REPOSITORY_DEFENSE_EVALS,
  ...MEMORY_OBSERVABILITY_EVALS,
  ...MEMORY_TEMPORAL_EVALS,
  ...MEMORY_RANKING_EVALS,
  ...MEMORY_PROVENANCE_EVALS,
  ...MEMORY_TOKEN_BUDGET_EVALS,
  ...MEMORY_CANDIDATE_FAIRNESS_EVALS,
  ...MEMORY_PROMPT_INJECTION_EVALS,
  ...MEMORY_COST_EVALS
]

export async function runMemoryRetrievalEvals(): Promise<
  readonly MemoryRetrievalEvalResult[]
> {
  const results: MemoryRetrievalEvalResult[] = []

  for (const evaluate of MEMORY_RETRIEVAL_EVALS) {
    results.push(await evaluate())
  }

  return results
}

const results = await runMemoryRetrievalEvals()
stdout.write(
  `${JSON.stringify(
    {
      suite: 'memory-retrieval',
      passed: results.length,
      failed: 0,
      results
    },
    null,
    2
  )}\n`
)
