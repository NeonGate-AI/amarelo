import type { MemoryBackgroundProcessResult } from './memory-background.contract'

/** Framework-neutral stages. Protected evidence stays inside the execution binding. */
export interface MemoryBackgroundStages {
  claimAndAdmit(): Promise<MemoryBackgroundProcessResult | null>
  curate(): Promise<void>
  complete(): Promise<MemoryBackgroundProcessResult>
  release(): Promise<void>
}

export interface MemoryBackgroundOrchestrationPort {
  run(stages: MemoryBackgroundStages): Promise<MemoryBackgroundProcessResult>
}
