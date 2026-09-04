import { z } from 'zod'

const OptionalNonEmptyString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).max(200).optional()
)

const ChatterboxEnvironmentSchema = z.object({
  AI_CONVERSATION_MODEL: OptionalNonEmptyString,
  CHATTERBOX_HOST: z.string().trim().min(1).default('0.0.0.0'),
  CHATTERBOX_MODEL_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(120_000)
    .default(30_000),
  CHATTERBOX_PORT: z.coerce.number().int().positive().max(65_535).default(3004),
  OPENAI_API_KEY: OptionalNonEmptyString
})

export type ChatterboxEnvironment = z.output<
  typeof ChatterboxEnvironmentSchema
>

export function validateChatterboxEnvironment(
  environment: NodeJS.ProcessEnv
): ChatterboxEnvironment {
  return ChatterboxEnvironmentSchema.parse(environment)
}

export function hasChatterboxProviderConfiguration(
  configuration: ChatterboxEnvironment
): configuration is ChatterboxEnvironment & {
  readonly AI_CONVERSATION_MODEL: string
  readonly OPENAI_API_KEY: string
} {
  return (
    configuration.AI_CONVERSATION_MODEL !== undefined &&
    configuration.OPENAI_API_KEY !== undefined
  )
}
