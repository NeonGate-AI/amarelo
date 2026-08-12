'use server'

import { AuthenticationException } from '@workos-inc/node'
import { redirect } from 'next/navigation'

import type { AuthActionState } from '@lib/auth/auth-state'
import { getAuthConfiguration, getWorkOSClient } from '@lib/auth/configuration'
import { getAuthErrorMessage } from '@lib/auth/error-message'
import { savePendingAuth } from '@lib/auth/pending-auth'
import { getRequestContext } from '@lib/auth/request-context'
import { persistSession } from '@lib/auth/session'
import { parseSignInInput } from '@lib/auth/validation'

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { fieldErrors, input } = parseSignInInput(formData)

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  let destination = ''

  try {
    const configuration = getAuthConfiguration()
    const requestContext = await getRequestContext()
    const authenticationResponse =
      await getWorkOSClient().userManagement.authenticateWithPassword({
        clientId: configuration.clientId,
        email: input.email,
        password: input.password,
        ...requestContext
      })

    await persistSession(authenticationResponse, input.remember)
    destination = configuration.consoleUrl
  } catch (error) {
    if (
      error instanceof AuthenticationException &&
      error.code === 'email_verification_required' &&
      error.pendingAuthenticationToken
    ) {
      await savePendingAuth({
        intent: 'sign-in',
        pendingAuthenticationToken: error.pendingAuthenticationToken,
        plan: 'essencial',
        remember: input.remember
      })
      destination = '/verify-email'
    } else {
      return { error: getAuthErrorMessage(error, 'sign-in') }
    }
  }

  redirect(destination)
}
