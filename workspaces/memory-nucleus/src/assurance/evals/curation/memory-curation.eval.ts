import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { memoryCurationCostEvalCases } from './memory-curation-cost.eval'
import type {
  MemoryCurationEvalCase,
  MemoryCurationEvalCaseResult,
  MemoryCurationEvalReport
} from './memory-curation-eval.contract'
import { memoryCurationExtractionEvalCases } from './memory-curation-extraction.eval'
import { memoryCurationGateEvalCases } from './memory-curation-gates.eval'
import { memoryCurationIdempotencyEvalCases } from './memory-curation-idempotency.eval'

export const memoryCurationEvalCases: readonly MemoryCurationEvalCase[] = [
  ...memoryCurationGateEvalCases,
  ...memoryCurationIdempotencyEvalCases,
  ...memoryCurationExtractionEvalCases,
  ...memoryCurationCostEvalCases
]

export const runMemoryCurationEvals =
  async (): Promise<MemoryCurationEvalReport> => {
    const startedAt = Date.now()
    const results: MemoryCurationEvalCaseResult[] = []
    const failures: Error[] = []

    for (const evalCase of memoryCurationEvalCases) {
      const caseStartedAt = Date.now()

      try {
        await evalCase.run()
        const result = {
          durationMs: Date.now() - caseStartedAt,
          name: evalCase.name
        }
        results.push(result)
        process.stdout.write(`✓ ${evalCase.name}\n`)
      } catch (error) {
        const cause = error instanceof Error ? error : new Error(String(error))
        failures.push(
          new Error(`${evalCase.name}: ${cause.message}`, { cause })
        )
        process.stderr.write(
          `✗ ${evalCase.name}\n${cause.stack ?? cause.message}\n`
        )
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        `${failures.length} of ${memoryCurationEvalCases.length} memory-curation evals failed`
      )
    }

    const report = {
      durationMs: Date.now() - startedAt,
      passed: results.length,
      results,
      total: memoryCurationEvalCases.length
    }

    process.stdout.write(
      `\n${report.passed}/${report.total} memory-curation evals passed in ${report.durationMs}ms\n`
    )

    return report
  }

const isDirectExecution =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isDirectExecution) {
  runMemoryCurationEvals().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
