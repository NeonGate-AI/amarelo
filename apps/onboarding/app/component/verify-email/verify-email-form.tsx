'use client'

import { EnvelopeSimple, WarningCircle } from '@phosphor-icons/react'
import { AgentOrb } from '@repo/react-web/ui/agent-orb'
import { useActionState } from 'react'

import { verifyEmailAction } from '@action/verify-email'
import formStyles from '@component/auth-form/auth-form.module.css'
import { SubmitButton } from '@component/auth-form/submit-button'
import { VoiceGuide } from '@component/voice-guide/voice-guide'
import { INITIAL_AUTH_STATE } from '@lib/auth/auth-state'

import styles from '@component/verify-email/verify-email-form.module.css'

const VERIFICATION_PROMPT =
  'Enviamos um código de seis números para o seu e-mail. Digite esse código aqui. Depois da verificação, eu começo o onboarding com você.'

export function VerifyEmailForm() {
  const [state, formAction] = useActionState(
    verifyEmailAction,
    INITIAL_AUTH_STATE
  )

  return (
    <section aria-labelledby="verify-title" className={styles.card}>
      <div className={styles.orbStage}>
        <AgentOrb size="8.5rem" state="idle" />
      </div>
      <p className={styles.eyebrow}>Confirme que é você</p>
      <h1 id="verify-title">Verifique seu e-mail</h1>
      <p className={styles.intro}>
        <EnvelopeSimple aria-hidden="true" size={17} weight="fill" />O código
        expira em poucos minutos.
      </p>

      <VoiceGuide compact text={VERIFICATION_PROMPT} />

      <form action={formAction} className={styles.form} noValidate>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="verification-code">
            Código de verificação
          </label>
          <input
            aria-describedby={
              state.fieldErrors?.code ? 'verification-code-error' : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.code)}
            autoComplete="one-time-code"
            className={`${formStyles.input} ${styles.codeInput}`}
            id="verification-code"
            inputMode="numeric"
            maxLength={6}
            name="code"
            pattern="[0-9]{6}"
            placeholder="000000"
            required
            type="text"
          />
          {state.fieldErrors?.code ? (
            <p className={formStyles.message} id="verification-code-error">
              {state.fieldErrors.code}
            </p>
          ) : null}
        </div>

        {state.error ? (
          <p aria-live="polite" className={formStyles.errorBanner} role="alert">
            <WarningCircle aria-hidden="true" size={18} weight="fill" />
            {state.error}
          </p>
        ) : null}

        <SubmitButton>Verificar e continuar</SubmitButton>
      </form>

      <p className={styles.backLink}>
        Código expirou? <a href="/sign-up">Voltar ao cadastro</a>
      </p>
    </section>
  )
}
