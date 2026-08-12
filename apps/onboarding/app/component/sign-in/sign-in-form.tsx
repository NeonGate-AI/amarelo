'use client'

import { Eye, EyeSlash, LockKey, WarningCircle } from '@phosphor-icons/react'
import { useActionState, useState } from 'react'

import { signInAction } from '@action/sign-in'
import styles from '@component/auth-form/auth-form.module.css'
import { SubmitButton } from '@component/auth-form/submit-button'
import { INITIAL_AUTH_STATE } from '@lib/auth/auth-state'

export function SignInForm() {
  const [state, formAction] = useActionState(signInAction, INITIAL_AUTH_STATE)
  const [showPassword, setShowPassword] = useState(false)

  function handlePasswordVisibility() {
    setShowPassword((isVisible) => !isVisible)
  }

  return (
    <section aria-labelledby="sign-in-title" className={styles.card}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Sua conta Amarelo</p>
        <h1 className={styles.title} id="sign-in-title">
          Iniciar sessão
        </h1>
        <p className={styles.subtitle}>Continue para o seu espaço privado.</p>
      </header>

      <form action={formAction} className={styles.form} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="sign-in-email">
            E-mail
          </label>
          <input
            aria-describedby={
              state.fieldErrors?.email ? 'sign-in-email-error' : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.email)}
            autoComplete="email"
            className={styles.input}
            id="sign-in-email"
            inputMode="email"
            name="email"
            placeholder="voce@exemplo.com"
            required
            type="email"
          />
          {state.fieldErrors?.email ? (
            <p className={styles.message} id="sign-in-email-error">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="sign-in-password">
            Senha
          </label>
          <div className={styles.inputWrap}>
            <input
              aria-describedby={
                state.fieldErrors?.password
                  ? 'sign-in-password-error'
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.password)}
              autoComplete="current-password"
              className={[styles.input, styles.inputWithAction].join(' ')}
              id="sign-in-password"
              minLength={8}
              name="password"
              required
              type={showPassword ? 'text' : 'password'}
            />
            <button
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className={styles.inputAction}
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
            <p className={styles.message} id="sign-in-password-error">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        <label className={styles.checkboxRow}>
          <input
            className={styles.checkbox}
            defaultChecked
            name="remember"
            type="checkbox"
          />
          <span className={styles.checkboxCopy}>
            <span>Mantenha-me conectado</span>
            <small>Recomendado somente em dispositivos de confiança.</small>
          </span>
        </label>

        {state.error ? (
          <p aria-live="polite" className={styles.errorBanner} role="alert">
            <WarningCircle aria-hidden="true" size={18} weight="fill" />
            {state.error}
          </p>
        ) : null}

        <SubmitButton>Iniciar sessão</SubmitButton>
      </form>

      <hr className={styles.separator} />
      <p className={styles.switch}>
        Ainda não tem conta? <a href="/sign-up">Criar conta</a>
      </p>
      <p className={styles.privacyNote}>
        <LockKey aria-hidden="true" size={13} weight="fill" />
        Autenticação protegida pelo WorkOS.
      </p>
    </section>
  )
}
