import type { Metadata } from 'next'

import { AuthShell } from '@component/auth-shell/auth-shell'
import { SignInForm } from '@component/sign-in/sign-in-form'

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
