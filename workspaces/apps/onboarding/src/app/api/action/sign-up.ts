'use server'

import { AuthenticationException } from '@workos-inc/node'
import { redirect } from 'next/navigation'

import type { AuthActionState } from '@lib/auth'
import { getAuthConfiguration, getWorkOSClient } from '@lib/auth'
import { getAuthErrorMessage } from '@lib/auth'
import { savePendingAuth } from '@lib/auth'
import { getRequestContext } from '@lib/auth'
import { persistSession } from '@lib/auth'
import { parseSignUpInput } from '@lib/auth'

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { fieldErrors, input } = parseSignUpInput(formData)

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  let destination = ''

  try {
    const configuration = getAuthConfiguration()
    const requestContext = await getRequestContext()
    const workOS = getWorkOSClient()

    await workOS.userManagement.createUser({
      email: input.email,
      metadata: {
        onboarding_completed: 'false',
        onboarding_version: 'voice-v2',
        selected_plan: input.plan
      },
      password: input.password,
      ...requestContext
    })

    const authenticationResponse =
      await workOS.userManagement.authenticateWithPassword({
        clientId: configuration.clientId,
        email: input.email,
        password: input.password,
        ...requestContext
      })

    await persistSession(authenticationResponse, input.remember)
    destination = `/onboarding?plan=${input.plan}`
  } catch (error) {
    if (
      error instanceof AuthenticationException &&
      error.code === 'email_verification_required' &&
      error.pendingAuthenticationToken
    ) {
      await savePendingAuth({
        intent: 'sign-up',
        pendingAuthenticationToken: error.pendingAuthenticationToken,
        plan: input.plan,
        remember: input.remember
      })
      destination = '/verify-email'
    } else {
      return { error: getAuthErrorMessage(error, 'sign-up') }
    }
  }

  redirect(destination)
}
