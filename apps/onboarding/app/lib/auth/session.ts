import 'server-only'

import type { AuthenticationResponse } from '@workos-inc/node'
import { cookies } from 'next/headers'

import { getAuthConfiguration } from '@lib/auth/configuration'

export async function persistSession(
  authenticationResponse: AuthenticationResponse,
  remember: boolean
) {
  const configuration = getAuthConfiguration()
  const { saveSession } = await import('@workos-inc/authkit-nextjs')

  await saveSession(authenticationResponse, configuration.appUrl)

  if (!remember) {
    await convertToBrowserSessionCookie()
  }
}

async function convertToBrowserSessionCookie() {
  const cookieStore = await cookies()
  const cookieName = process.env.WORKOS_COOKIE_NAME || 'wos-session'
  const sessionCookie = cookieStore.get(cookieName)

  if (!sessionCookie) {
    return
  }

  const sameSite = getSameSite()

  cookieStore.set(cookieName, sessionCookie.value, {
    domain: process.env.WORKOS_COOKIE_DOMAIN || undefined,
    httpOnly: true,
    path: '/',
    sameSite,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none'
  })
}

function getSameSite(): 'lax' | 'none' | 'strict' {
  const sameSite = process.env.WORKOS_COOKIE_SAMESITE

  if (sameSite === 'none' || sameSite === 'strict') {
    return sameSite
  }

  return 'lax'
}
