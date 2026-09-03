import type { MemoryClient, MemorySearchInput } from '@repo/memory-sdk'
import { createMemorySearchContextProjection } from '@repo/memory-sdk'

import {
  type ConversationMemoryContext,
  MemoryContextPort
} from './memory-context.port'

export class MemoryContextProvider extends MemoryContextPort {
  constructor(private readonly client: MemoryClient) {
    super()
  }

  async retrieve(input: MemorySearchInput): Promise<ConversationMemoryContext> {
    const result = await this.client.search(input)
    return Object.freeze({
      projection: Object.freeze(
        result.items.map((item) => createMemorySearchContextProjection(item))
      ),
      requestId: result.requestId,
      tokenBudgetUsed: result.tokenBudget.usedTokens
    })
  }
}
