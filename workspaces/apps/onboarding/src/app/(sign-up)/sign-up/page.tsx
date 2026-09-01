import type { Metadata } from 'next'

import { AuthShell } from '@component/auth-shell/auth-shell'
import { SignUpExperience } from '@component/sign-up/sign-up-experience'

export const metadata: Metadata = {
  title: 'Criar conta'
}

export default function SignUpPage() {
  return (
    <AuthShell showThemeToggle>
      <SignUpExperience />
    </AuthShell>
  )
}
