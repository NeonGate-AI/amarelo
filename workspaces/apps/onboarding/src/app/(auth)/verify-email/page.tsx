import type { Metadata } from 'next'

import { AuthShell } from '@component/auth-shell/auth-shell'
import { VerifyEmailForm } from '@component/verify-email/verify-email-form'

export const metadata: Metadata = {
  title: 'Verificar e-mail'
}

export default function VerifyEmailPage() {
  return (
    <AuthShell centered>
      <VerifyEmailForm />
    </AuthShell>
  )
}
