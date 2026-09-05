import type { MemoryClient } from '@repo/memory-sdk'

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
  readonly sourceKind: 'development-text' | 'synthetic-transcript'
}

export interface OperationalMemoryReadiness {
  readonly status: 'ready' | 'not-ready'
  readonly database: 'available' | 'unavailable'
  readonly schemaVersion: string | null
}

export interface OperationalMemoryRuntime {
  forRequest(scope: MemoryRequestScope): MemoryClient
  readiness(): Promise<OperationalMemoryReadiness>
  close(): Promise<void>
}
