import type { Metadata } from 'next'

import { AuthShell } from '@component/auth-shell'
import { SignInForm } from '@component/sign-in'

export const metadata: Metadata = {
  title: 'Iniciar sessão'
}

export default function SignInPage() {
  return (
    <AuthShell centered>
      <SignInForm />
    </AuthShell>
  )
}
