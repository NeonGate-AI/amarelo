'use client'

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeSlash,
  LockKey,
  WarningCircle
} from '@phosphor-icons/react'
import { AgentOrb } from '@repo/react-web/ui/agent-orb'
import {
  Chroma,
  ShimmerSweep,
  SmoothButton
} from '@repo/react-web/vendors/smoothui'
import { useActionState, useState } from 'react'

import { signUpAction } from '@action/sign-up'
import formStyles from '@component/auth-form/auth-form.module.css'
import { SubmitButton } from '@component/auth-form/submit-button'
import { VoiceGuide } from '@component/voice-guide/voice-guide'
import { planOptions, type PlanId, type PlanOption } from '@data/plans'
import { INITIAL_AUTH_STATE } from '@lib/auth/auth-state'

import styles from '@component/sign-up/sign-up-experience.module.css'

type SignUpStep = 'account' | 'plans'

const ACCOUNT_PROMPT =
  'Agora vamos criar sua conta. Digite seu e-mail e uma senha com pelo menos oito caracteres. Depois disso, eu continuo com você por voz no onboarding.'

export function SignUpExperience() {
  const [state, formAction] = useActionState(signUpAction, INITIAL_AUTH_STATE)
  const [step, setStep] = useState<SignUpStep>('plans')
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('essencial')
  const [showPassword, setShowPassword] = useState(false)
  const activePlan =
    planOptions.find((plan) => plan.id === selectedPlan) ?? planOptions[0]

  function handleContinue() {
    setStep('account')
  }

  function handleBack() {
    setStep('plans')
  }

  return (
    <section aria-labelledby="sign-up-title" className={styles.experience}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Comece com privacidade</p>
        <h1 className={styles.title} id="sign-up-title">
          <ShimmerSweep>Crie seu espaço na Amarelo.</ShimmerSweep>
        </h1>
        <p className={styles.subtitle}>
          Escolha como quer começar. Sem versão empresarial, sem campos
          desnecessários e sem cobrança surpresa.
        </p>
      </header>

      <div className={styles.progress}>
        <span className={step === 'plans' ? styles.currentStep : ''}>
          <b>1</b> Plano
        </span>
        <i aria-hidden="true" />
        <span className={step === 'account' ? styles.currentStep : ''}>
          <b>2</b> Conta
        </span>
      </div>

      <Chroma className={styles.transition} transitionKey={step}>
        {step === 'plans' ? (
          <PlanSelection
            selectedPlan={selectedPlan}
            onContinue={handleContinue}
            onSelect={setSelectedPlan}
          />
        ) : (
          <div className={styles.accountGrid}>
            <aside className={styles.voiceCard}>
              <div className={styles.orbStage}>
                <AgentOrb size="clamp(9rem, 18vw, 13rem)" state="idle" />
              </div>
              <p className={styles.voiceEyebrow}>Amarelo por voz</p>
              <h2>Uma conta, depois uma conversa.</h2>
              <p>
                Eu explico cada etapa em voz alta. Você também pode preencher
                tudo por texto, sempre.
              </p>
              <VoiceGuide compact text={ACCOUNT_PROMPT} />
            </aside>

            <div className={styles.formCard}>
              <button
                className={styles.backButton}
                type="button"
                onClick={handleBack}
              >
                <ArrowLeft aria-hidden="true" size={16} />
                Trocar plano
              </button>
              <div className={styles.selectedPlan}>
                <span>{activePlan.label}</span>
                <b>{activePlan.price}</b>
              </div>
              <h2>Crie suas credenciais</h2>
              <p className={styles.formIntro}>
                Você vai verificar o e-mail antes de começar o onboarding.
              </p>

              <form action={formAction} className={formStyles.form} noValidate>
                <input name="plan" type="hidden" value={selectedPlan} />

                <div className={formStyles.field}>
                  <label className={formStyles.label} htmlFor="sign-up-email">
                    Endereço de e-mail
                  </label>
                  <input
                    aria-describedby={
                      state.fieldErrors?.email
                        ? 'sign-up-email-error'
                        : undefined
                    }
                    aria-invalid={Boolean(state.fieldErrors?.email)}
                    autoComplete="email"
                    className={formStyles.input}
                    id="sign-up-email"
                    inputMode="email"
                    name="email"
                    placeholder="voce@exemplo.com"
                    required
                    type="email"
                  />
                  {state.fieldErrors?.email ? (
                    <p className={formStyles.message} id="sign-up-email-error">
                      {state.fieldErrors.email}
                    </p>
                  ) : null}
                </div>

                <div className={formStyles.field}>
                  <label
                    className={formStyles.label}
                    htmlFor="sign-up-password"
                  >
                    Senha
                  </label>
                  <div className={formStyles.inputWrap}>
                    <input
                      aria-describedby={
                        state.fieldErrors?.password
                          ? 'sign-up-password-error'
                          : 'sign-up-password-help'
                      }
                      aria-invalid={Boolean(state.fieldErrors?.password)}
                      autoComplete="new-password"
                      className={`${formStyles.input} ${formStyles.inputWithAction}`}
                      id="sign-up-password"
                      minLength={8}
                      name="password"
                      required
                      type={showPassword ? 'text' : 'password'}
                    />
                    <button
                      aria-label={
                        showPassword ? 'Ocultar senha' : 'Mostrar senha'
                      }
                      className={formStyles.inputAction}
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                    >
                      {showPassword ? (
                        <EyeSlash aria-hidden="true" size={18} />
                      ) : (
                        <Eye aria-hidden="true" size={18} />
                      )}
                    </button>
                  </div>
                  <p className={styles.fieldHelp} id="sign-up-password-help">
                    Pelo menos 8 caracteres.
                  </p>
                  {state.fieldErrors?.password ? (
                    <p
                      className={formStyles.message}
                      id="sign-up-password-error"
                    >
                      {state.fieldErrors.password}
                    </p>
                  ) : null}
                </div>

                <label className={formStyles.checkboxRow}>
                  <input
                    className={formStyles.checkbox}
                    defaultChecked
                    name="remember"
                    type="checkbox"
                  />
                  <span className={formStyles.checkboxCopy}>
                    <span>Mantenha-me conectado</span>
                    <small>Use apenas em dispositivos de confiança.</small>
                  </span>
                </label>

                <label className={formStyles.checkboxRow}>
                  <input
                    className={formStyles.checkbox}
                    name="terms"
                    type="checkbox"
                  />
                  <span className={formStyles.checkboxCopy}>
                    <span>Aceito os termos essenciais e a privacidade.</span>
                    <small>Sem comunicações promocionais obrigatórias.</small>
                  </span>
                </label>
                {state.fieldErrors?.terms ? (
                  <p className={formStyles.message}>
                    {state.fieldErrors.terms}
                  </p>
                ) : null}

                {state.error ? (
                  <p
                    aria-live="polite"
                    className={formStyles.errorBanner}
                    role="alert"
                  >
                    <WarningCircle aria-hidden="true" size={18} weight="fill" />
                    {state.error}
                  </p>
                ) : null}

                <SubmitButton>Criar conta</SubmitButton>
              </form>

              <p className={styles.workosNote}>
                <LockKey aria-hidden="true" size={14} weight="fill" />
                Identidade protegida pelo WorkOS. O conteúdo do onboarding não
                entra no seu perfil de autenticação.
              </p>
            </div>
          </div>
        )}
      </Chroma>

      <p className={styles.signInLink}>
        Já tem conta? <a href="/sign-in">Iniciar sessão</a>
      </p>
    </section>
  )
}

interface PlanSelectionProps {
  onContinue: () => void
  onSelect: (plan: PlanId) => void
  selectedPlan: PlanId
}

function PlanSelection(props: PlanSelectionProps) {
  const { onContinue, onSelect, selectedPlan } = props

  return (
    <div className={styles.plansStep}>
      <div className={styles.planGrid}>
        {planOptions.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan === plan.id}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className={styles.planFooter}>
        <div>
          <b>Nenhum cartão agora.</b>
          <span>Os planos futuros ficam bloqueados até o lançamento.</span>
        </div>
        <SmoothButton
          color="accent"
          shape="pill"
          size="lg"
          suffix={<ArrowRight aria-hidden="true" size={18} />}
          type="button"
          variant="solid"
          onClick={onContinue}
        >
          Continuar com {getPlanLabel(selectedPlan)}
        </SmoothButton>
      </div>
    </div>
  )
}

interface PlanCardProps {
  onSelect: (plan: PlanId) => void
  plan: PlanOption
  selected: boolean
}

function PlanCard(props: PlanCardProps) {
  const { onSelect, plan, selected } = props
  const unavailable = plan.id !== 'essencial'

  return (
    <button
      aria-pressed={selected}
      className={`${styles.planCard} ${selected ? styles.selected : ''}`}
      disabled={unavailable}
      type="button"
      onClick={() => onSelect(plan.id)}
    >
      <span className={styles.planTopline}>
        <span>{plan.label}</span>
        {plan.recommended ? <em>Para começar</em> : <em>Em breve</em>}
      </span>
      <strong>{plan.price}</strong>
      <small>{plan.priceDetail}</small>
      <p>{plan.description}</p>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>
            <Check aria-hidden="true" size={15} weight="bold" />
            {feature}
          </li>
        ))}
      </ul>
      <span className={styles.planChoice}>
        {unavailable
          ? 'Aguardar lançamento'
          : selected
            ? 'Selecionado'
            : 'Escolher'}
      </span>
    </button>
  )
}

function getPlanLabel(planId: PlanId): string {
  return planOptions.find((plan) => plan.id === planId)?.label ?? 'Essencial'
}
