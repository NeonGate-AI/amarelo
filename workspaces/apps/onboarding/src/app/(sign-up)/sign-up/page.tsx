import type { Metadata } from 'next'

import { AuthShell } from '@component/auth-shell'
import { SignUpExperience } from '@component/sign-up'

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
