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

  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    throw new TypeError('The development conversation API URL is invalid')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError(
      'The development conversation API URL must use HTTP or HTTPS'
    )
  }

  return parsed.toString().replace(/\/$/, '')
}

export function validateDevelopmentConversationConfiguration(
  environment: Readonly<Record<string, unknown>>
): DevelopmentConversationConfiguration {
  if (environment.VITE_AMARELO_TEXT_DRIVER !== 'true') {
    return Object.freeze({ enabled: false })
  }

  return Object.freeze({
    baseUrl: validateBaseUrl(environment.VITE_CONVERSATION_API_URL),
    enabled: true
  })
}
