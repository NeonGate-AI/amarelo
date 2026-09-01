'use client'

import { Eye, EyeSlash, LockKey, WarningCircle } from '@phosphor-icons/react'
import { useActionState, useState } from 'react'

import { signInAction } from '@action'
import { SubmitButton } from '@component/auth-form'
import { INITIAL_AUTH_STATE } from '@lib/auth'

export function SignInForm() {
  const [state, formAction] = useActionState(signInAction, INITIAL_AUTH_STATE)
  const [showPassword, setShowPassword] = useState(false)

  function handlePasswordVisibility() {
    setShowPassword((isVisible) => !isVisible)
  }

  return (
    <section
      aria-labelledby="sign-in-title"
      className="w-[min(100%,30rem)] rounded-[1.55rem] border border-border bg-[color-mix(in_srgb,var(--card)_94%,transparent)] p-[clamp(1.5rem,4vw,2.7rem)] shadow-[var(--shadow-auth)] backdrop-blur-[1.5rem] max-[32rem]:rounded-[1.25rem]"
    >
      <header className="mb-7">
        <p className="mb-[.55rem] text-[.68rem] font-extrabold uppercase tracking-[.16em] text-[color-mix(in_srgb,var(--foreground)_62%,transparent)]">
          Sua conta Amarelo
        </p>
        <h1
          className="m-0 font-heading text-[clamp(1.7rem,4vw,2rem)] font-bold leading-[1.05] tracking-[-.045em]"
          id="sign-in-title"
        >
          Iniciar sessão
        </h1>
        <p className="mt-[.65rem] text-[.95rem] leading-[1.55] text-muted-foreground">
          Continue para o seu espaço privado.
        </p>
      </header>

      <form action={formAction} className="grid gap-[1.2rem]" noValidate>
        <div className="grid gap-2">
          <label
            className="text-[.86rem] font-[650] text-foreground"
            htmlFor="sign-in-email"
          >
            E-mail
          </label>
          <input
            aria-describedby={
              state.fieldErrors?.email ? 'sign-in-email-error' : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.email)}
            autoComplete="email"
            className="min-h-12 w-full rounded-[.68rem] border border-input bg-[color-mix(in_srgb,var(--background)_68%,transparent)] px-[.9rem] py-3 text-foreground outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-[color-mix(in_srgb,var(--muted-foreground)_70%,transparent)] hover:border-[color-mix(in_srgb,var(--foreground)_40%,var(--border))] focus:border-ring focus:bg-background focus:shadow-[0_0_0_.2rem_color-mix(in_srgb,var(--ring)_22%,transparent)] aria-invalid:border-danger"
            id="sign-in-email"
            inputMode="email"
            name="email"
            placeholder="voce@exemplo.com"
            required
            type="email"
          />
          {state.fieldErrors?.email ? (
            <p
              className="m-0 text-[.76rem] leading-[1.4] text-danger"
              id="sign-in-email-error"
            >
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label
            className="text-[.86rem] font-[650] text-foreground"
            htmlFor="sign-in-password"
          >
            Senha
          </label>
          <div className="relative">
            <input
              aria-describedby={
                state.fieldErrors?.password
                  ? 'sign-in-password-error'
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.password)}
              autoComplete="current-password"
              className="min-h-12 w-full rounded-[.68rem] border border-input bg-[color-mix(in_srgb,var(--background)_68%,transparent)] px-[.9rem] py-3 pr-12 text-foreground outline-none transition-[border-color,box-shadow,background] duration-150 hover:border-[color-mix(in_srgb,var(--foreground)_40%,var(--border))] focus:border-ring focus:bg-background focus:shadow-[0_0_0_.2rem_color-mix(in_srgb,var(--ring)_22%,transparent)] aria-invalid:border-danger"
              id="sign-in-password"
              minLength={8}
              name="password"
              required
              type={showPassword ? 'text' : 'password'}
            />
            <button
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
              type="button"
              onClick={handlePasswordVisibility}
            >
              {showPassword ? (
                <EyeSlash aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          </div>
          {state.fieldErrors?.password ? (
            <p
              className="m-0 text-[.76rem] leading-[1.4] text-danger"
              id="sign-in-password-error"
            >
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <label className="grid cursor-pointer grid-cols-[1.1rem_1fr] items-start gap-[.65rem] text-[.86rem] leading-[1.4] text-foreground">
          <input
            className="mt-[.05rem] size-[1.1rem] accent-primary"
            defaultChecked
            name="remember"
            type="checkbox"
          />
          <span className="grid gap-[.1rem] [&_small]:text-muted-foreground">
            <span>Mantenha-me conectado</span>
            <small>Recomendado somente em dispositivos de confiança.</small>
          </span>
        </label>

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

        <SubmitButton>Iniciar sessão</SubmitButton>
      </form>

      <hr className="mb-[1.15rem] mt-[1.4rem] h-px border-0 bg-border" />
      <p className="m-0 text-center text-[.86rem] text-muted-foreground">
        Ainda não tem conta?{' '}
        <a
          className="font-bold text-foreground underline-offset-[.2rem] hover:text-primary-hover"
          href="/sign-up"
        >
          Criar conta
        </a>
      </p>
      <p className="mt-[1.1rem] flex items-center justify-center gap-[.45rem] text-[.72rem] text-muted-foreground">
        <LockKey
          aria-hidden="true"
          className="text-success"
          size={13}
          weight="fill"
        />
        Autenticação protegida pelo WorkOS.
      </p>
    </section>
  )
}
