import type {
  ExplicitMemoryInput,
  ExplicitMemoryOptions,
  MemoryConsentState,
  MemoryDeletionReceipt,
  MemoryRecord,
  MemorySearchInput,
  UpdateMemoryConsentInput
} from '@repo/memory-sdk'
import type {
  AuthorizedMemoryQuery,
  EligibleMemorySource,
  MemoryRequestScope
} from '@application/contracts'
import type { CanonicalMemoryPort } from './canonical-memory.port'
import type { AuthorizedMemoryRetrievalDependencies } from './memory-authorization.port'

export type OperationalMemoryOperation =
  | 'consent'
  | 'persist'
  | 'retrieve'
  | 'delete'

/** Explicit submissions retain the SDK's 4,000-character boundary, not the extractor's 320. */
export interface StagedExplicitMemory {
  readonly candidateId: string
  readonly commandId: string
  readonly requestedAt: string
}

/** Candidate content is reloaded from the governed store rather than supplied at promotion. */
export interface StoredExplicitMemoryCandidate {
  readonly staged: StagedExplicitMemory
  readonly input: ExplicitMemoryInput
}

export interface OperationalMemorySearch {
  readonly query: AuthorizedMemoryQuery
  readonly dependencies: AuthorizedMemoryRetrievalDependencies
  readonly consentVersion: number
}

/** Every port is bound to the same authenticated scope and database transaction. */
export interface OperationalMemoryTransaction {
  readonly canonical: CanonicalMemoryPort
  getConsent(): Promise<MemoryConsentState>
  updateConsent(input: UpdateMemoryConsentInput): Promise<MemoryConsentState>
  stageExplicit(
    input: ExplicitMemoryInput,
    options: ExplicitMemoryOptions,
    source?: EligibleMemorySource
  ): Promise<StagedExplicitMemory>
  loadExplicitCandidate(
    candidateId: string
  ): Promise<StoredExplicitMemoryCandidate>
  authorizeSearch(input: MemorySearchInput): Promise<OperationalMemorySearch>
  readRecord(memoryId: string): Promise<MemoryRecord | null>
  readDeletionReceipt(memoryId: string): Promise<MemoryDeletionReceipt | null>
  /** Recheck current request expiry and the locked consent version before exposure. */
  assertAuthority(): Promise<void>
}

/**
 * Mutations serialize with consent changes on the same tenant/subject consent
 * head. Evidence, candidate, canonical state and outbox either all commit or
 * all roll back. Callback ports never start independent transactions.
 */
export abstract class OperationalMemoryUnitOfWork {
  abstract run<T>(
    scope: MemoryRequestScope,
    operation: OperationalMemoryOperation,
    work: (transaction: OperationalMemoryTransaction) => Promise<T>
  ): Promise<T>
}
