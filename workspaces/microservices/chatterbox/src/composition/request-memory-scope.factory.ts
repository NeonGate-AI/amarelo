import type { MemoryRequestScope } from '@nucleus/memory'

import type { AuthenticatedConversationContext } from '../session'
import { mapMemoryIdentity } from './memory-identity.map'

/** Only the authenticated server context supplies personal Memory authority. */
export function createMemoryRequestScope(
  context: AuthenticatedConversationContext
): MemoryRequestScope {
  return Object.freeze({
    authenticationSessionId: context.authenticationSessionId,
    expiresAtMs: context.expiresAtMs,
    conversationId: context.conversationId,
    requestId: context.requestId,
    purpose: context.purpose,
    actorId: mapMemoryIdentity('person', context.tenantId, context.actorId),
    subjectId: mapMemoryIdentity('person', context.tenantId, context.subjectId),
    tenantId: mapMemoryIdentity('tenant', context.tenantId),
    sourceKind: context.sourceKind ?? 'development-text'
  })
}
