import { describe, expect, it } from 'vitest'

import {
  createWorkOsSessionAuthenticator,
  hasChatterboxAuthenticationConfiguration,
  validateChatterboxEnvironment
} from 'chatterbox'

const NOW = Date.parse('2026-09-05T12:00:00.000Z')
const CONFIGURATION = {
  apiKey: 'sk_test_synthetic_not_a_credential',
  clientId: 'client_synthetic',
  cookieName: 'wos-session',
  cookiePassword: 'synthetic-password-only-for-tests-32-chars',
  nowMs: () => NOW
}
const CLAIMS = {
  exp: (NOW + 60_000) / 1000,
  org_id: 'org_synthetic',
  sid: 'session_synthetic',
  sub: 'user_synthetic'
}

function verifiedResult(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: `synthetic.${Buffer.from(JSON.stringify(CLAIMS)).toString('base64url')}.verified-by-sdk-fixture`,
    authenticated: true as const,
    organizationId: 'org_synthetic',
    sessionId: 'session_synthetic',
    user: { id: 'user_synthetic' },
    ...overrides
  }
}

describe('Existing WorkOS sealed-session adapter', () => {
  it('never invokes the identity boundary for absent, duplicate or malformed cookies', async () => {
    let calls = 0
    const authenticate = createWorkOsSessionAuthenticator({
      ...CONFIGURATION,
      userManagement: {
        loadSealedSession: () => {
          calls += 1
          return { authenticate: async () => verifiedResult() }
        }
      }
    })
    for (const cookie of [
      undefined,
      '',
      'other=value',
      'wos-session=%malformed',
      'wos-session=one; wos-session=two'
    ]) {
      expect(await authenticate(cookie)).toBeNull()
    }
    expect(calls).toBe(0)
  })

  it('maps only signed subject and organization after SDK verification', async () => {
    const received: unknown[] = []
    const authenticate = createWorkOsSessionAuthenticator({
      ...CONFIGURATION,
      userManagement: {
        loadSealedSession: (input) => {
          received.push(input)
          return { authenticate: async () => verifiedResult() }
        }
      }
    })
    expect(
      await authenticate('theme=light; wos-session=sealed%3Avalue')
    ).toEqual({
      actorId: 'user_synthetic',
      authenticationSessionId: 'session_synthetic',
      expiresAtMs: NOW + 60_000,
      subjectId: 'user_synthetic',
      tenantId: 'org_synthetic'
    })
    expect(received).toEqual([
      {
        cookiePassword: CONFIGURATION.cookiePassword,
        sessionData: 'sealed:value'
      }
    ])
  })

  it.each([
    { user: { id: 'another_user' } },
    { sessionId: 'another_session' },
    { organizationId: 'another_org' },
    { accessToken: 'not-a-jwt' },
    { impersonator: { email: 'not-exposed@example.test' } }
  ])('rejects inconsistent signed identity or impersonation %#', async (overrides) => {
    const authenticate = createWorkOsSessionAuthenticator({
      ...CONFIGURATION,
      userManagement: {
        loadSealedSession: () => ({
          authenticate: async () => verifiedResult(overrides)
        })
      }
    })
    expect(await authenticate('wos-session=synthetic')).toBeNull()
  })

  it('rejects expired signed claims even if an external resolver claims success', async () => {
    const authenticate = createWorkOsSessionAuthenticator({
      ...CONFIGURATION,
      nowMs: () => NOW + 60_000,
      userManagement: {
        loadSealedSession: () => ({
          authenticate: async () => verifiedResult()
        })
      }
    })
    expect(await authenticate('wos-session=synthetic')).toBeNull()
  })

  it('preserves negative SDK authentication and throws only to the fail-closed caller', async () => {
    const denied = createWorkOsSessionAuthenticator({
      ...CONFIGURATION,
      userManagement: {
        loadSealedSession: () => ({
          authenticate: async () => ({ authenticated: false })
        })
      }
    })
    const failed = createWorkOsSessionAuthenticator({
      ...CONFIGURATION,
      userManagement: {
        loadSealedSession: () => ({
          authenticate: async () => {
            throw new Error('external-unavailable')
          }
        })
      }
    })
    expect(await denied('wos-session=synthetic')).toBeNull()
    await expect(failed('wos-session=synthetic')).rejects.toThrow(
      'external-unavailable'
    )
  })

  it('rejects an invalid seal using the real locked WorkOS SDK without contacting a provider', async () => {
    const authenticate = createWorkOsSessionAuthenticator(CONFIGURATION)
    expect(await authenticate('wos-session=invalid-seal')).toBeNull()
  })

  it('requires credentials, a strong cookie password and exact origins', () => {
    expect(
      hasChatterboxAuthenticationConfiguration(
        validateChatterboxEnvironment({})
      )
    ).toBe(false)
    expect(
      hasChatterboxAuthenticationConfiguration(
        validateChatterboxEnvironment({
          CHATTERBOX_ALLOWED_ORIGINS: 'http://localhost:3003',
          WORKOS_API_KEY: CONFIGURATION.apiKey,
          WORKOS_CLIENT_ID: CONFIGURATION.clientId,
          WORKOS_COOKIE_PASSWORD: CONFIGURATION.cookiePassword
        })
      )
    ).toBe(true)
    for (const origin of [
      '*',
      'http://localhost:3003/path',
      'https://user:password@example.test',
      'null'
    ]) {
      expect(() =>
        validateChatterboxEnvironment({ CHATTERBOX_ALLOWED_ORIGINS: origin })
      ).toThrow()
    }
  })
})
