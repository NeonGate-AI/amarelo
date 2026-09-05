import { z } from 'zod'

const OptionalNonEmptyString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).max(200).optional()
)

const ChatterboxEnvironmentSchema = z.object({
  AI_CONVERSATION_MODEL: OptionalNonEmptyString,
  CHATTERBOX_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    )
    .pipe(
      z
        .array(
          z
            .string()
            .url()
            .refine((origin) => {
              const url = new URL(origin)
              return (
                ['http:', 'https:'].includes(url.protocol) &&
                url.origin === origin
              )
            }, 'Use exact HTTP(S) origins without paths or wildcards')
        )
        .max(10)
    ),
  CHATTERBOX_AUTH_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(30_000)
    .default(5_000),
  CHATTERBOX_HOST: z.string().trim().min(1).default('0.0.0.0'),
  CHATTERBOX_MAX_CONCURRENT_TURNS: z.coerce
    .number()
    .int()
    .positive()
    .max(20)
    .default(4),
  CHATTERBOX_MAX_SESSIONS: z.coerce
    .number()
    .int()
    .positive()
    .max(10_000)
    .default(1_000),
  CHATTERBOX_MODEL_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(120_000)
    .default(30_000),
  CHATTERBOX_PORT: z.coerce.number().int().positive().max(65_535).default(3004),
  CHATTERBOX_RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20),
  CHATTERBOX_SESSION_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(3_600_000)
    .default(900_000),
  OPENAI_API_KEY: OptionalNonEmptyString,
  WORKOS_API_KEY: OptionalNonEmptyString,
  WORKOS_CLIENT_ID: OptionalNonEmptyString,
  WORKOS_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,80}$/)
    .default('wos-session'),
  WORKOS_COOKIE_PASSWORD: OptionalNonEmptyString
})

export type ChatterboxEnvironment = z.output<typeof ChatterboxEnvironmentSchema>

export function validateChatterboxEnvironment(
  environment: NodeJS.ProcessEnv
): ChatterboxEnvironment {
  return ChatterboxEnvironmentSchema.parse(environment)
}

export function hasChatterboxAuthenticationConfiguration(
  configuration: ChatterboxEnvironment
): configuration is ChatterboxEnvironment & {
  readonly WORKOS_API_KEY: string
  readonly WORKOS_CLIENT_ID: string
  readonly WORKOS_COOKIE_PASSWORD: string
} {
  return (
    configuration.WORKOS_API_KEY !== undefined &&
    configuration.WORKOS_CLIENT_ID !== undefined &&
    configuration.WORKOS_COOKIE_PASSWORD !== undefined &&
    configuration.WORKOS_COOKIE_PASSWORD.length >= 32 &&
    configuration.CHATTERBOX_ALLOWED_ORIGINS.length > 0
  )
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
