import type { AuthenticatedIdentity } from '../authentication'

/** Server-owned authority for the future request-bound MemoryClient composition. */
export interface AuthenticatedConversationContext
  extends AuthenticatedIdentity {
  readonly asOf: string
  readonly conversationId: string
  readonly purpose: 'conversation.support'
  readonly requestId: string
  readonly sourceKind?: 'development-text' | 'realtime-transcript'
}
