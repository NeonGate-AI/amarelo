'use client'

import { EnvelopeSimple, WarningCircle } from '@phosphor-icons/react'
import { AgentOrb } from '@repo/react/ui/agent-orb'
import { useActionState } from 'react'

import { verifyEmailAction } from '@action'
import { SubmitButton } from '@component/auth-form'
import { VoiceGuide } from '@component/voice-guide'
import { INITIAL_AUTH_STATE } from '@lib/auth'

const VERIFICATION_PROMPT =
  'Enviamos um código de seis números para o seu e-mail. Digite esse código aqui. Depois da verificação, seu Elo acompanha você no onboarding.'

export function VerifyEmailForm() {
  const [state, formAction] = useActionState(
    verifyEmailAction,
    INITIAL_AUTH_STATE
  )

  return (
    <section
      aria-labelledby="verify-title"
      className="w-[min(100%,32rem)] rounded-[1.55rem] border border-border bg-[color-mix(in_srgb,var(--card)_94%,transparent)] p-[clamp(1.4rem,5vw,2.6rem)] text-center shadow-[var(--shadow-auth)] backdrop-blur-[1.5rem]"
    >
      <div
        aria-label="Seu Elo"
        className="mb-[1.1rem] grid min-h-36 place-items-center"
        role="img"
      >
        <AgentOrb size="8.5rem" state="idle" />
      </div>
      <p className="mb-[.55rem] text-[.68rem] font-extrabold uppercase tracking-[.16em] text-muted-foreground">
        Confirme que é você
      </p>
      <h1
        className="m-0 text-[clamp(1.8rem,5vw,2.35rem)] leading-[1.05] tracking-[-.05em]"
        id="verify-title"
      >
        Verifique seu e-mail
      </h1>
      <p className="mb-5 mt-3 flex items-center justify-center gap-[.45rem] text-[.82rem] text-muted-foreground">
        <EnvelopeSimple
          aria-hidden="true"
          className="text-primary-hover"
          size={17}
          weight="fill"
        />
        O código expira em poucos minutos.
      </p>

      <VoiceGuide compact text={VERIFICATION_PROMPT} />

      <form
        action={formAction}
        className="mt-6 grid gap-4 text-left"
        noValidate
      >
        <div className="grid gap-2">
          <label
            className="text-[.86rem] font-[650] text-foreground"
            htmlFor="verification-code"
          >
            Código de verificação
          </label>
          <input
            aria-describedby={
              state.fieldErrors?.code ? 'verification-code-error' : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.code)}
            autoComplete="one-time-code"
            className="min-h-16 w-full rounded-[.68rem] border border-input bg-[color-mix(in_srgb,var(--background)_68%,transparent)] px-[.9rem] py-3 text-center font-mono text-[1.65rem] font-[750] tracking-[.38em] text-foreground [text-indent:.38em] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-[color-mix(in_srgb,var(--muted-foreground)_70%,transparent)] hover:border-[color-mix(in_srgb,var(--foreground)_40%,var(--border))] focus:border-ring focus:bg-background focus:shadow-[0_0_0_.2rem_color-mix(in_srgb,var(--ring)_22%,transparent)] aria-invalid:border-danger"
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
            <p
              className="m-0 text-[.76rem] leading-[1.4] text-danger"
              id="verification-code-error"
            >
              {state.fieldErrors.code}
            </p>
          ) : null}
        </div>

        {state.error ? (
          <p
            aria-live="polite"
            className="m-0 flex items-start gap-[.55rem] rounded-[.7rem] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] px-[.9rem] py-[.8rem] text-[.8rem] leading-[1.45] text-danger"
            role="alert"
          >
            <WarningCircle aria-hidden="true" size={18} weight="fill" />
            {state.error}
          </p>
        ) : null}

        <SubmitButton>Verificar e continuar</SubmitButton>
      </form>

      <p className="mt-[1.4rem] text-[.78rem] text-muted-foreground">
        Código expirou?{' '}
        <a
          className="font-bold text-foreground underline-offset-[.18rem]"
          href="/sign-up"
        >
          Voltar ao cadastro
        </a>
      </p>
    </section>
  )
}
