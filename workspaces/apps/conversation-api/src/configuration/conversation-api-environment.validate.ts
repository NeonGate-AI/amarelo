import { z } from 'zod'

const ConversationApiEnvironmentSchema = z.object({
  AI_CONVERSATION_MODEL: z.string().trim().min(1).max(200),
  CONVERSATION_API_HOST: z.string().trim().min(1).default('0.0.0.0'),
  CONVERSATION_API_MODEL_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(120_000)
    .default(30_000),
  OPENAI_API_KEY: z.string().trim().min(1),
  PORT: z.coerce.number().int().positive().max(65_535).default(3004)
})

export type ConversationApiEnvironment = z.output<
  typeof ConversationApiEnvironmentSchema
>

export function validateConversationApiEnvironment(
  environment: NodeJS.ProcessEnv
): ConversationApiEnvironment {
  return ConversationApiEnvironmentSchema.parse(environment)
}
