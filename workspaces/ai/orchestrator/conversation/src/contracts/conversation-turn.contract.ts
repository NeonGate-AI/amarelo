import { z } from 'zod'

import { AGENT_IDS } from './conversation-agent.contract'

export const MAX_CONVERSATION_HISTORY_MESSAGES = 24
export const MAX_CONVERSATION_MESSAGE_CHARACTERS = 16_000

const ConversationIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/)

const ConversationPurposeSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._:-]{0,79}$/)

const ConversationTimestampSchema = z.string().datetime({ offset: true })

export const ConversationMessageRoleSchema = z.enum(['assistant', 'user'])
export type ConversationMessageRole = z.infer<
  typeof ConversationMessageRoleSchema
>

export const ConversationMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(MAX_CONVERSATION_MESSAGE_CHARACTERS),
    role: ConversationMessageRoleSchema
  })
  .strict()
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>

export const ConversationTurnInputSchema = z
  .object({
    agentId: z.enum(AGENT_IDS),
    asOf: ConversationTimestampSchema,
    conversationId: ConversationIdentifierSchema,
    history: z
      .array(ConversationMessageSchema)
      .max(MAX_CONVERSATION_HISTORY_MESSAGES)
      .default([]),
    message: z.string().trim().min(1).max(MAX_CONVERSATION_MESSAGE_CHARACTERS),
    purpose: ConversationPurposeSchema,
    requestId: ConversationIdentifierSchema
  })
  .strict()

export type ConversationTurnInput = z.input<typeof ConversationTurnInputSchema>
export type ValidatedConversationTurnInput = z.output<
  typeof ConversationTurnInputSchema
>
