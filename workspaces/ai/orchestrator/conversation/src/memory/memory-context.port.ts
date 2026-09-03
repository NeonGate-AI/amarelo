import type {
  MemorySearchContextProjection,
  MemorySearchInput
} from '@repo/memory-sdk'

export interface ConversationMemoryContext {
  readonly projection: readonly MemorySearchContextProjection[]
  readonly requestId: string
  readonly tokenBudgetUsed: number
}

export abstract class MemoryContextPort {
  abstract retrieve(input: MemorySearchInput): Promise<ConversationMemoryContext>
}
