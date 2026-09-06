import { WorkOS } from '@workos-inc/node'
import { z } from 'zod'

import {
  AuthenticatedIdentitySchema,
  type ConversationAuthenticator
} from './authenticated-identity.contract'

interface WorkOsSessionAdapterOptions {
  readonly apiKey: string
  readonly clientId: string
  readonly cookieName: string
  readonly cookiePassword: string
  readonly nowMs?: () => number
  readonly timeoutMs?: number
  readonly userManagement?: {
    loadSealedSession(options: {
      readonly sessionData: string
      readonly cookiePassword: string
    }): {
      authenticate(): Promise<
        | { readonly authenticated: false }
        | {
            readonly authenticated: true
            readonly accessToken: string
            readonly sessionId: string
            readonly organizationId?: string
            readonly user: { readonly id: string }
            readonly impersonator?: unknown
          }
      >
    }
  }
}

const VerifiedClaimsSchema = z.object({
  exp: z.number().int().positive(),
  org_id: z.string().min(1).max(200).optional(),
  sid: z.string().min(1).max(200),
  sub: z.string().min(1).max(200)
})

function readCookie(header: string | undefined, name: string): string | null {
  if (header === undefined || header.length > 16_384) return null
  const matches = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
  if (matches.length !== 1) return null
  const value = matches[0]?.slice(name.length + 1)
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/** Verifies the existing AuthKit seal and access token; never refreshes or exposes it. */
export function createWorkOsSessionAuthenticator(
  options: WorkOsSessionAdapterOptions
): ConversationAuthenticator {
  const userManagement =
    options.userManagement ??
    new WorkOS(options.apiKey, {
      clientId: options.clientId,
      maxRetries: 0,
      timeout: options.timeoutMs ?? 5_000
    }).userManagement
  const nowMs = options.nowMs ?? Date.now

  return async (header) => {
    const sessionData = readCookie(header, options.cookieName)
    if (sessionData === null) return null
    const result = await userManagement
      .loadSealedSession({
        cookiePassword: options.cookiePassword,
        sessionData
      })
      .authenticate()
    if (!result.authenticated || result.impersonator !== undefined) return null

    // Decode only after SDK signature/expiry verification. Bind the sealed user
    // to the signed subject, matching AuthKit's own defense-in-depth contract.
    let claims: z.infer<typeof VerifiedClaimsSchema>
    try {
      claims = VerifiedClaimsSchema.parse(
        JSON.parse(
          Buffer.from(
            result.accessToken.split('.')[1] ?? '',
            'base64url'
          ).toString('utf8')
        )
      )
    } catch {
      return null
    }
    if (
      claims.sub !== result.user?.id ||
      claims.sid !== result.sessionId ||
      claims.org_id !== result.organizationId ||
      claims.exp * 1_000 <= nowMs()
    )
      return null

    return AuthenticatedIdentitySchema.parse({
      actorId: claims.sub,
      authenticationSessionId: claims.sid,
      expiresAtMs: claims.exp * 1_000,
      subjectId: claims.sub,
      tenantId: claims.org_id ?? `personal:${claims.sub}`
    })
  }
}
