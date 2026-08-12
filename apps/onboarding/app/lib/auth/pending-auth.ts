import 'server-only'

import { cookies } from 'next/headers'

export type AuthIntent = 'sign-in' | 'sign-up'

export interface PendingAuth {
  intent: AuthIntent
  pendingAuthenticationToken: string
  plan: string
  remember: boolean
}

const PENDING_TOKEN_COOKIE = 'amarelo-pending-auth'
const PENDING_INTENT_COOKIE = 'amarelo-pending-intent'
const PENDING_MAX_AGE_SECONDS = 10 * 60

export async function savePendingAuth(pendingAuth: PendingAuth) {
  const cookieStore = await cookies()
  const options = {
    httpOnly: true,
    maxAge: PENDING_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production'
  }

  cookieStore.set(
    PENDING_TOKEN_COOKIE,
    pendingAuth.pendingAuthenticationToken,
    options
  )
  cookieStore.set(
    PENDING_INTENT_COOKIE,
    [
      pendingAuth.intent,
      sanitizeSegment(pendingAuth.plan),
      pendingAuth.remember ? '1' : '0'
    ].join(':'),
    options
  )
}

export async function readPendingAuth(): Promise<PendingAuth | null> {
  const cookieStore = await cookies()
  const pendingAuthenticationToken =
    cookieStore.get(PENDING_TOKEN_COOKIE)?.value
  const serializedIntent = cookieStore.get(PENDING_INTENT_COOKIE)?.value

  if (!(pendingAuthenticationToken && serializedIntent)) {
    return null
  }

  const [intent, plan = 'essencial', remember = '0'] =
    serializedIntent.split(':')

  if (intent !== 'sign-in' && intent !== 'sign-up') {
    return null
  }

  return {
    intent,
    pendingAuthenticationToken,
    plan,
    remember: remember === '1'
  }
}

export async function clearPendingAuth() {
  const cookieStore = await cookies()
  cookieStore.delete(PENDING_TOKEN_COOKIE)
  cookieStore.delete(PENDING_INTENT_COOKIE)
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'essencial'
}
