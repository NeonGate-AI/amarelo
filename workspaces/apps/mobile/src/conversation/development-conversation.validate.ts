export type DevelopmentConversationConfiguration =
  | {
      readonly enabled: false
    }
  | {
      readonly baseUrl: string
      readonly enabled: true
    }

const DEFAULT_DEVELOPMENT_API_BASE_URL = '/api'

function validateBaseUrl(value: unknown): string {
  const candidate =
    typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : DEFAULT_DEVELOPMENT_API_BASE_URL

  if (/^\/[a-zA-Z0-9/_-]*$/u.test(candidate) && !candidate.startsWith('//')) {
    return candidate
  }
  throw new TypeError(
    'The authenticated development API must use a same-origin absolute path'
  )
}

export function validateDevelopmentConversationConfiguration(
  environment: Readonly<Record<string, unknown>>
): DevelopmentConversationConfiguration {
  if (environment.VITE_AMARELO_TEXT_DRIVER !== 'true') {
    return Object.freeze({ enabled: false })
  }

  return Object.freeze({
    baseUrl: validateBaseUrl(environment.VITE_CHATTERBOX_URL),
    enabled: true
  })
}
