import type { OperationalMemoryRuntime } from '@nucleus/memory'
import type { MemoryClient } from '@repo/memory-sdk'

import type { AuthenticatedConversationContext } from '../session'
import { mapMemoryIdentity } from './memory-identity.map'

export function createRequestMemoryClient(options: {
  readonly runtime: OperationalMemoryRuntime
  readonly context: AuthenticatedConversationContext
}): MemoryClient {
  return options.runtime.forRequest({
    authenticationSessionId: options.context.authenticationSessionId,
    expiresAtMs: options.context.expiresAtMs,
    conversationId: options.context.conversationId,
    requestId: options.context.requestId,
    purpose: options.context.purpose,
    actorId: mapMemoryIdentity(
      'person',
      options.context.tenantId,
      options.context.actorId
    ),
    subjectId: mapMemoryIdentity(
      'person',
      options.context.tenantId,
      options.context.subjectId
    ),
    tenantId: mapMemoryIdentity('tenant', options.context.tenantId),
    sourceKind: 'development-text'
  })
}
