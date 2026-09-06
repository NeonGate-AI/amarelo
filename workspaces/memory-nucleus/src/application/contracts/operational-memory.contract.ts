import type { MemoryClient } from '@repo/memory-sdk'
import type { MemoryUsageLedger } from '@application/ports'
import type { MemoryCandidateDeliveryClient } from './memory-candidate-delivery.contract'

/** Server-authenticated context; never construct this from browser identity headers. */
export interface MemoryRequestScope {
  readonly tenantId: string
  readonly subjectId: string
  readonly actorId: string
  readonly authenticationSessionId: string
  readonly expiresAtMs: number
  readonly conversationId: string
  readonly requestId: string
  readonly purpose: 'conversation.support'
  readonly sourceKind: 'development-text' | 'synthetic-transcript' | 'realtime-transcript'
}

export interface OperationalMemoryReadiness {
  readonly status: 'ready' | 'not-ready'
  readonly database: 'available' | 'unavailable'
  readonly schemaVersion: string | null
}

export interface OperationalMemoryRuntime {
  forRequest(scope: MemoryRequestScope): MemoryClient
  /** Server-only evidence staging and later promotion under fresh authority. */
  candidatesForRequest(scope: MemoryRequestScope): MemoryCandidateDeliveryClient
  /** Server-only usage accounting; the authenticated request bounds ledger access. */
  usageLedgerForRequest(scope: MemoryRequestScope): MemoryUsageLedger
  readiness(): Promise<OperationalMemoryReadiness>
  close(): Promise<void>
}
