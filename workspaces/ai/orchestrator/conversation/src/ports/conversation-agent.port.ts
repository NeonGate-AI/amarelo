import type { MemorySearchContextProjection } from '@repo/memory-sdk'
import { z } from 'zod'

import type { AgentId, ConversationMessage } from '@contracts'
import type { ConversationRoutingDecision } from '@routing'

const NullableTokenCountSchema = z.number().int().nonnegative().nullable()

export const ConversationModelUsageSchema = z
  .object({
    inputTokens: NullableTokenCountSchema,
    modelId: z.string().trim().min(1).max(200),
    outputTokens: NullableTokenCountSchema,
    providerId: z.string().trim().min(1).max(200),
    totalTokens: NullableTokenCountSchema
  })
  .strict()
  .superRefine((usage, context) => {
    if (
      usage.inputTokens !== null &&
      usage.outputTokens !== null &&
      usage.totalTokens !== null &&
      usage.totalTokens !== usage.inputTokens + usage.outputTokens
    ) {
      context.addIssue({
        code: 'custom',
        message: 'totalTokens must equal inputTokens plus outputTokens',
        path: ['totalTokens']
      })
    }
  })
export type ConversationModelUsage = z.infer<
  typeof ConversationModelUsageSchema
>

export const ConversationAgentResultSchema = z
  .object({
    response: z.string().trim().min(1).max(64_000),
    usage: ConversationModelUsageSchema.nullable()
  })
  .strict()
export type ConversationAgentResult = z.infer<
  typeof ConversationAgentResultSchema
>

export interface ConversationAgentInvocation {
  readonly agentId: AgentId
  readonly conversationId: string
  readonly memory: readonly MemorySearchContextProjection[]
  readonly messages: readonly ConversationMessage[]
  readonly requestId: string
  readonly routing: ConversationRoutingDecision
}

export abstract class ConversationAgentPort {
  abstract readonly id: AgentId
  abstract invoke(
    input: ConversationAgentInvocation
  ): Promise<ConversationAgentResult>
}
