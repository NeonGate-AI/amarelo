import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthShell } from '@component/auth-shell/auth-shell'
import { VoiceOnboarding } from '@component/onboarding/voice-onboarding'
import { isPlanId } from '@data/plans'
import { isAuthConfigured } from '@lib/auth/configuration'

interface OnboardingPageProps {
  searchParams: Promise<{ plan?: string | string[] }>
}

export const metadata: Metadata = {
  title: 'Começar'
}

export default async function OnboardingPage(props: OnboardingPageProps) {
  const { searchParams } = props
  const parameters = await searchParams
  const planValue = Array.isArray(parameters.plan)
    ? parameters.plan[0]
    : parameters.plan
  const plan = planValue && isPlanId(planValue) ? planValue : 'essencial'

  if (isAuthConfigured()) {
    const { withAuth } = await import('@workos-inc/authkit-nextjs')
    const { user } = await withAuth()

    if (!user) {
      redirect('/sign-in')
    }
  }

  return (
    <AuthShell>
      <VoiceOnboarding plan={plan} />
    </AuthShell>
  )
}
