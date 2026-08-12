import 'server-only'

import { WorkOS } from '@workos-inc/node'

export interface AuthConfiguration {
  apiKey: string
  appUrl: string
  clientId: string
  consoleUrl: string
}

export class AuthConfigurationError extends Error {
  constructor() {
    super('A integração do WorkOS ainda não foi configurada neste ambiente.')
    this.name = 'AuthConfigurationError'
  }
}

let workOSClient: WorkOS | undefined
let workOSApiKey: string | undefined

export function getAuthConfiguration(): AuthConfiguration {
  const apiKey = process.env.WORKOS_API_KEY
  const clientId = process.env.WORKOS_CLIENT_ID
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD

  if (!(apiKey && clientId && cookiePassword && cookiePassword.length >= 32)) {
    throw new AuthConfigurationError()
  }

  return {
    apiKey,
    appUrl: process.env.NEXT_PUBLIC_ONBOARDING_URL ?? 'http://localhost:3002',
    clientId,
    consoleUrl: process.env.NEXT_PUBLIC_CONSOLE_URL ?? 'http://localhost:3001'
  }
}

export function getWorkOSClient(): WorkOS {
  const configuration = getAuthConfiguration()

  if (!(workOSClient && workOSApiKey === configuration.apiKey)) {
    workOSClient = new WorkOS(configuration.apiKey)
    workOSApiKey = configuration.apiKey
  }

  return workOSClient
}

export function isAuthConfigured(): boolean {
  try {
    getAuthConfiguration()
    return true
  } catch {
    return false
  }
}
