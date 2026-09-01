'use server'

import { redirect } from 'next/navigation'

import type { AuthActionState } from '@lib/auth/auth-state'
import { getAuthConfiguration, getWorkOSClient } from '@lib/auth/configuration'
import { getAuthErrorMessage } from '@lib/auth/error-message'
import { clearPendingAuth, readPendingAuth } from '@lib/auth/pending-auth'
import { getRequestContext } from '@lib/auth/request-context'
import { persistSession } from '@lib/auth/session'

const VERIFICATION_CODE_PATTERN = /^\d{6}$/

export async function verifyEmailAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const codeValue = formData.get('code')
  const code = typeof codeValue === 'string' ? codeValue.replace(/\s/g, '') : ''

  if (!VERIFICATION_CODE_PATTERN.test(code)) {
    return {
      fieldErrors: {
        code: 'Digite os seis números enviados ao seu e-mail.'
      }
    }
  }

  const pendingAuth = await readPendingAuth()

  if (!pendingAuth) {
    return {
      error: 'Esta verificação expirou. Volte e tente entrar novamente.'
    }
  }

  let destination = ''

  try {
    const configuration = getAuthConfiguration()
    const requestContext = await getRequestContext()
    const authenticationResponse =
      await getWorkOSClient().userManagement.authenticateWithEmailVerification({
        clientId: configuration.clientId,
        code,
        pendingAuthenticationToken: pendingAuth.pendingAuthenticationToken,
        ...requestContext
      })

    await persistSession(authenticationResponse, pendingAuth.remember)
    await clearPendingAuth()
    destination =
      pendingAuth.intent === 'sign-up'
        ? `/onboarding?plan=${pendingAuth.plan}`
        : configuration.consoleUrl
  } catch (error) {
    return { error: getAuthErrorMessage(error, 'verify') }
  }

  redirect(destination)
}
