import {
  AuthenticatedIdentitySchema,
  type AuthenticatedIdentity,
  type ConversationAuthenticator
} from './authenticated-identity.contract'

interface ChatterboxAuthenticationGuardOptions {
  readonly allowedOrigins: readonly string[]
  readonly authenticate?: ConversationAuthenticator
  readonly clock: () => Date
  readonly timeoutMs: number
}

type AuthenticationDecision =
  | {
      readonly identity: AuthenticatedIdentity
      readonly status: 'authenticated'
    }
  | {
      readonly status:
        | 'forbidden'
        | 'session_unavailable'
        | 'unauthenticated'
        | 'rate_limited'
    }

export class ChatterboxAuthenticationGuard {
  readonly #options: ChatterboxAuthenticationGuardOptions
  #pending = 0

  constructor(options: ChatterboxAuthenticationGuardOptions) {
    this.#options = options
  }

  async authorize(
    origin: string | undefined,
    cookie: string | undefined
  ): Promise<AuthenticationDecision> {
    const { authenticate, allowedOrigins } = this.#options
    if (authenticate === undefined || allowedOrigins.length === 0)
      return { status: 'session_unavailable' }
    if (origin === undefined || !allowedOrigins.includes(origin))
      return { status: 'forbidden' }
    if (this.#pending >= 16) return { status: 'rate_limited' }
    this.#pending += 1
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      // Timed-out external work retains its slot until it settles.
      const pending = Promise.resolve()
        .then(() => authenticate(cookie))
        .finally(() => {
          this.#pending -= 1
        })
      const result = await Promise.race([
        pending,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Authentication timeout')),
            this.#options.timeoutMs
          )
        })
      ])
      if (result === null) return { status: 'unauthenticated' }
      const parsed = AuthenticatedIdentitySchema.safeParse(result)
      if (!parsed.success) return { status: 'session_unavailable' }
      if (parsed.data.expiresAtMs <= this.#options.clock().getTime())
        return { status: 'unauthenticated' }
      if (parsed.data.actorId !== parsed.data.subjectId)
        return { status: 'forbidden' }
      return { identity: parsed.data, status: 'authenticated' }
    } catch {
      return { status: 'session_unavailable' }
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }
}
