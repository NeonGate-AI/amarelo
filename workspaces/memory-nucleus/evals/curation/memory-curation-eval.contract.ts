export interface MemoryCurationEvalCase {
  name: string
  run: () => Promise<void>
}

export interface MemoryCurationEvalCaseResult {
  durationMs: number
  name: string
}

export interface MemoryCurationEvalReport {
  durationMs: number
  passed: number
  results: MemoryCurationEvalCaseResult[]
  total: number
}
