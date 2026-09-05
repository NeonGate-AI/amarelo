import { randomUUID } from 'node:crypto'

import type {
  AuthenticatedIdentity,
  ConversationAuthenticator
} from './authenticated-identity.contract'
import { createLocalOwnerIdentity } from './local-owner-identity.factory'

interface LocalSessionAdapterOptions {
  readonly host: string
  readonly nodeEnvironment: string | undefined
  readonly ownerId: string
  readonly sessionTtlMs: number
  readonly nowMs?: () => number
}

/** Local transport supplies identity; callers never choose the account in a request. */
export function createLocalSessionAuthenticator(
  options: LocalSessionAdapterOptions
): ConversationAuthenticator {
  if (
    !['development', 'test'].includes(options.nodeEnvironment ?? '') ||
    !['127.0.0.1', '::1', 'localhost'].includes(options.host) ||
    !Number.isInteger(options.sessionTtlMs) ||
    options.sessionTtlMs <= 0 ||
    options.sessionTtlMs > 3_600_000
  )
    throw new Error(
      'Local authentication requires an explicit loopback development server'
    )

  const owner = createLocalOwnerIdentity(options.ownerId)
  const nowMs = options.nowMs ?? Date.now
  let session: AuthenticatedIdentity | undefined

  return async () => {
    const now = nowMs()
    if (session === undefined || session.expiresAtMs <= now) {
      session = Object.freeze({
        ...owner,
        authenticationSessionId: randomUUID(),
        expiresAtMs: now + options.sessionTtlMs
      })
    }
    // Renewal never extends an existing conversation: its own expiry and auth
    // session binding remain authoritative in ConversationSessionService.
    return session
  }
}
