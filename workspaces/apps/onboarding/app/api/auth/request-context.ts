import 'server-only'

import { headers } from 'next/headers'

export interface RequestContext {
  ipAddress?: string
  userAgent?: string
}

export async function getRequestContext(): Promise<RequestContext> {
  const requestHeaders = await headers()
  const forwardedFor = requestHeaders.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim()
  const userAgent = requestHeaders.get('user-agent') ?? undefined

  return {
    ipAddress: ipAddress || undefined,
    userAgent
  }
}
