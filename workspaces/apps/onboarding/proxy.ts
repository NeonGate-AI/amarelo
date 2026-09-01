import { authkitProxy } from '@workos-inc/authkit-nextjs'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const workOSProxy = authkitProxy()

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!hasWorkOSRuntimeConfiguration()) {
    return NextResponse.next()
  }

  return workOSProxy(request, event)
}

export const config = {
  matcher: ['/onboarding/:path*', '/auth-complete']
}

function hasWorkOSRuntimeConfiguration(): boolean {
  return Boolean(
    process.env.WORKOS_API_KEY &&
      process.env.WORKOS_CLIENT_ID &&
      process.env.WORKOS_COOKIE_PASSWORD &&
      process.env.WORKOS_COOKIE_PASSWORD.length >= 32
  )
}
