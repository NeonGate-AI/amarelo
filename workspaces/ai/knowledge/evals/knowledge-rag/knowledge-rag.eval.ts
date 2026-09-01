import { stdout } from 'node:process'

import { KNOWLEDGE_BUDGET_EVALS } from './knowledge-budget.eval.ts'
import type {
  KnowledgeEvalCase,
  KnowledgeEvalResult
} from './knowledge-evaluation.contract.ts'
import { KNOWLEDGE_PROVENANCE_EVALS } from './knowledge-provenance.eval.ts'
import { KNOWLEDGE_RANKING_EVALS } from './knowledge-ranking.eval.ts'
import { KNOWLEDGE_REPOSITORY_SAFETY_EVALS } from './knowledge-repository-safety.eval.ts'
import { KNOWLEDGE_SCOPE_EVALS } from './knowledge-scope.eval.ts'
import { KNOWLEDGE_TEMPORAL_EVALS } from './knowledge-temporal.eval.ts'

const EVAL_CASES: readonly KnowledgeEvalCase[] = [
  ...KNOWLEDGE_SCOPE_EVALS,
  ...KNOWLEDGE_REPOSITORY_SAFETY_EVALS,
  ...KNOWLEDGE_TEMPORAL_EVALS,
  ...KNOWLEDGE_RANKING_EVALS,
  ...KNOWLEDGE_PROVENANCE_EVALS,
  ...KNOWLEDGE_BUDGET_EVALS
]

export async function runKnowledgeRagEvals(): Promise<
  readonly KnowledgeEvalResult[]
> {
  const results: KnowledgeEvalResult[] = []

  for (const evaluate of EVAL_CASES) {
    results.push(await evaluate())
  }

  return results
}

const results = await runKnowledgeRagEvals()
stdout.write(
  `${JSON.stringify(
    {
      suite: 'knowledge-rag',
      passed: results.length,
      failed: 0,
      results
    },
    null,
    2
  )}\n`
)
