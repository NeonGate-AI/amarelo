import { randomUUID } from 'node:crypto'

import type { AuthenticatedIdentity } from '../authentication'

interface ConversationSessionServiceOptions {
  readonly clock: () => Date
  readonly createId?: () => string
  readonly maxConcurrentTurns: number
  readonly maxSessions: number
  readonly rateLimitPerMinute: number
  readonly sessionTtlMs: number
}

interface OwnedSession {
  readonly authenticationSessionId: string
  readonly expiresAtMs: number
  readonly owner: string
}

interface RateWindow {
  count: number
  readonly expiresAtMs: number
}

function ownerKey(identity: AuthenticatedIdentity): string {
  return JSON.stringify([
    identity.tenantId,
    identity.actorId,
    identity.subjectId
  ])
}

/** Process-local and bounded: contains authority metadata, never turn content. */
export class ConversationSessionService {
  readonly #options: ConversationSessionServiceOptions
  readonly #sessions = new Map<string, OwnedSession>()
  readonly #rates = new Map<string, RateWindow>()
  readonly #activeOwners = new Set<string>()

  constructor(options: ConversationSessionServiceOptions) {
    this.#options = options
  }

  create(identity: AuthenticatedIdentity): {
    readonly conversationId: string
    readonly expiresAt: string
  } | null {
    this.#purge()
    if (this.#sessions.size >= this.#options.maxSessions) return null
    const owner = ownerKey(identity)
    let ownerSessions = 0
    for (const session of this.#sessions.values()) {
      if (session.owner === owner) ownerSessions += 1
    }
    if (ownerSessions >= 10) return null
    const conversationId = (this.#options.createId ?? randomUUID)()
    if (this.#sessions.has(conversationId)) return null
    const expiresAtMs = Math.min(
      this.#options.clock().getTime() + this.#options.sessionTtlMs,
      identity.expiresAtMs
    )
    this.#sessions.set(conversationId, {
      authenticationSessionId: identity.authenticationSessionId,
      expiresAtMs,
      owner
    })
    return { conversationId, expiresAt: new Date(expiresAtMs).toISOString() }
  }

  owns(conversationId: string, identity: AuthenticatedIdentity): boolean {
    this.#purge()
    const session = this.#sessions.get(conversationId)
    return (
      session !== undefined &&
      session.owner === ownerKey(identity) &&
      session.authenticationSessionId === identity.authenticationSessionId
    )
  }

  expiresAt(conversationId: string, identity: AuthenticatedIdentity): number | null {
    if (!this.owns(conversationId, identity)) return null
    return this.#sessions.get(conversationId)?.expiresAtMs ?? null
  }

  takeRequest(identity: AuthenticatedIdentity): boolean {
    this.#purge()
    const owner = ownerKey(identity)
    let window = this.#rates.get(owner)
    if (window === undefined) {
      if (this.#rates.size >= this.#options.maxSessions) return false
      window = {
        count: 0,
        expiresAtMs: this.#options.clock().getTime() + 60_000
      }
      this.#rates.set(owner, window)
    }
    if (window.count >= this.#options.rateLimitPerMinute) return false
    window.count += 1
    return true
  }

  acquireWork(identity: AuthenticatedIdentity): (() => void) | null {
    const owner = ownerKey(identity)
    if (
      this.#activeOwners.has(owner) ||
      this.#activeOwners.size >= this.#options.maxConcurrentTurns
    )
      return null
    this.#activeOwners.add(owner)
    return () => {
      this.#activeOwners.delete(owner)
    }
  }

  #purge(): void {
    const nowMs = this.#options.clock().getTime()
    for (const [id, session] of this.#sessions) {
      if (session.expiresAtMs <= nowMs) this.#sessions.delete(id)
    }
    for (const [owner, window] of this.#rates) {
      if (window.expiresAtMs <= nowMs) this.#rates.delete(owner)
    }
  }
}
