'use server'

import { redirect } from 'next/navigation'

import { isPlanId } from '@data'
import { isEloId } from '@data'
import type { OnboardingActionState } from '@lib/auth'
import { getAuthConfiguration, getWorkOSClient } from '@lib/auth'

export async function completeOnboardingAction(
  _previousState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const displayNameValue = formData.get('displayName')
  const planValue = formData.get('plan')
  const selectedEloValue = formData.get('selectedElo')
  const voiceEnabled = formData.get('voiceEnabled') === 'true'
  const displayName =
    typeof displayNameValue === 'string'
      ? displayNameValue.trim().slice(0, 80)
      : ''
  const plan =
    typeof planValue === 'string' && isPlanId(planValue)
      ? planValue
      : 'essencial'
  const selectedElo =
    typeof selectedEloValue === 'string' && isEloId(selectedEloValue)
      ? selectedEloValue
      : null

  if (!displayName) {
    return { error: 'Diga ou escreva como você prefere ser chamado.' }
  }

  if (!selectedElo) {
    return { error: 'Escolha seu Elo antes de continuar.' }
  }

  let destination = ''

  try {
    const configuration = getAuthConfiguration()
    const { withAuth } = await import('@workos-inc/authkit-nextjs')
    const { user } = await withAuth()

    if (!user) {
      return { error: 'Sua sessão expirou. Entre novamente para continuar.' }
    }

    await getWorkOSClient().userManagement.updateUser({
      userId: user.id,
      name: displayName,
      metadata: {
        ...user.metadata,
        onboarding_completed: 'true',
        onboarding_version: 'voice-v2',
        selected_plan: plan,
        selected_elo: selectedElo,
        voice_enabled: voiceEnabled ? 'true' : 'false'
      }
    })
    destination = configuration.consoleUrl
  } catch {
    return {
      error:
        'Não foi possível finalizar agora. Suas respostas continuam nesta tela para você tentar novamente.'
    }
  }

  redirect(destination)
}
