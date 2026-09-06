import type { OperationalMemoryRuntime } from '@nucleus/memory'
import type { MemoryClient } from '@repo/memory-sdk'

import type { AuthenticatedConversationContext } from '../session'
import { createMemoryRequestScope } from './request-memory-scope.factory'

export function createRequestMemoryClient(options: {
  readonly runtime: OperationalMemoryRuntime
  readonly context: AuthenticatedConversationContext
}): MemoryClient {
  return options.runtime.forRequest(createMemoryRequestScope(options.context))
}
