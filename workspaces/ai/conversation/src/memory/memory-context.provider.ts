import type {
  MemoryClient,
  MemorySearchContextProjection,
  MemorySearchInput
} from '@repo/memory-sdk'
import { createMemorySearchContextProjection } from '@repo/memory-sdk'

export interface ConversationMemoryContext {
  readonly projection: readonly MemorySearchContextProjection[]
  readonly requestId: string
  readonly tokenBudgetUsed: number
}

export class MemoryContextProvider {
  constructor(private readonly client: MemoryClient) {}

  async retrieve(input: MemorySearchInput): Promise<ConversationMemoryContext> {
    const result = await this.client.search(input)
    return Object.freeze({
      projection: Object.freeze(result.items.map((item) => createMemorySearchContextProjection(item))),
      requestId: result.requestId,
      tokenBudgetUsed: result.tokenBudget.usedTokens
    })
  }
}
