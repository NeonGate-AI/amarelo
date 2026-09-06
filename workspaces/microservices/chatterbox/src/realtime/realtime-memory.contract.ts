import type { MemoryClient } from '@repo/memory-sdk'
import type { MemoryUsageLedger, MemoryRequestScope } from '@nucleus/memory'

import type { AuthenticatedConversationContext } from '../session'

export type RealtimeMemoryStatus =
  | 'idle'
  | 'buffered'
  | 'queued'
  | 'accepted'
  | 'skipped'
  | 'unconfirmed'

export interface RealtimeSessionStatus {
  readonly state: 'active' | 'stopped' | 'unavailable'
  readonly memory: {
    readonly status: RealtimeMemoryStatus
    /** Count observed in governed recall, not a claimed count of all stored memories. */
    readonly acceptedCount: number | null
  }
  readonly expiresAtMs: number | null
}

export interface RealtimeMemoryDependencies {
  readonly createMemoryClient: (
    context: AuthenticatedConversationContext
  ) => MemoryClient
  readonly createScope: (
    context: AuthenticatedConversationContext
  ) => MemoryRequestScope
  readonly usageLedgerForRequest: (
    context: AuthenticatedConversationContext
  ) => MemoryUsageLedger | null
  readonly ingest: (input: {
    readonly context: AuthenticatedConversationContext
    readonly message: string
    readonly sourceTurnId: string
  }) => Promise<
    'committed' | 'buffered' | 'duplicate' | 'skipped' | 'unconfirmed'
  >
}
