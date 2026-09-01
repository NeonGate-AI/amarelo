import type {
  MemoryConsentState,
  UpdateMemoryConsentInput
} from '../consent/memory-consent.contract.js'
import type { MemoryCorrectionInput, MemoryCorrectionResult } from '../memory/memory-correction.contract.js'
import type {
  ExplicitMemoryInput,
  ExplicitMemoryOptions,
  ExplicitMemoryResult
} from '../memory/explicit-memory.contract.js'
import type { MemoryDeletionReceipt } from '../memory/memory-forget.contract.js'
import type { MemorySearchInput, MemorySearchResult } from '../search/memory-search.contract.js'

/** Cross-workspace contract. Transport/runtime composition belongs to the caller/integration layer. */
export abstract class MemoryClient {
  abstract search(input: MemorySearchInput): Promise<MemorySearchResult>
  abstract rememberExplicitly(
    input: ExplicitMemoryInput,
    options?: ExplicitMemoryOptions
  ): Promise<ExplicitMemoryResult>
  abstract correct(input: MemoryCorrectionInput): Promise<MemoryCorrectionResult>
  abstract forget(memoryId: string): Promise<MemoryDeletionReceipt>
  abstract getConsent(): Promise<MemoryConsentState>
  abstract updateConsent(input: UpdateMemoryConsentInput): Promise<MemoryConsentState>
}
