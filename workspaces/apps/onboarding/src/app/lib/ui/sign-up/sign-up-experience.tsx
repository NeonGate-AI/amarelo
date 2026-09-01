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
import {
  Chroma,
  ShimmerSweep,
  SmoothButton
} from '@repo/react/vendors/smoothui'
import { useActionState, useState } from 'react'

import { signUpAction } from '@action'
import { SubmitButton } from '@component/auth-form'
import { planOptions, type PlanId, type PlanOption } from '@data'
import { INITIAL_AUTH_STATE } from '@lib/auth'

type SignUpStep = 'account' | 'plans'

export function SignUpExperience() {
  const [state, formAction] = useActionState(signUpAction, INITIAL_AUTH_STATE)
  const [step, setStep] = useState<SignUpStep>('plans')
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('essencial')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false)
  const activePlan =
    planOptions.find((plan) => plan.id === selectedPlan) ?? planOptions[0]

  function handleContinue() {
    setStep('account')
  }

  function handleBack() {
    setStep('plans')
  }

  return (
    <section
      aria-labelledby="sign-up-title"
      className="mx-auto w-[min(100%,76rem)]"
    >
      <header className="mx-auto max-w-3xl text-center">
        <p className="mb-[.6rem] text-[.7rem] font-extrabold uppercase tracking-[.16em] text-[color-mix(in_srgb,var(--foreground)_62%,transparent)]">
          Comece com privacidade
        </p>
        <h1
          className="m-0 text-[clamp(2.3rem,6vw,4.6rem)] font-[650] leading-[.95] tracking-[-.065em] max-[42rem]:text-[clamp(2.2rem,13vw,3.5rem)]"
          id="sign-up-title"
        >
          <ShimmerSweep>Crie seu espaço na Amarelo.</ShimmerSweep>
        </h1>
        <p className="mx-auto mt-[1.15rem] max-w-[39rem] text-[clamp(.95rem,1.6vw,1.08rem)] leading-[1.6] text-muted-foreground">
          Escolha como quer começar. Sem versão empresarial, sem campos
          desnecessários e sem cobrança surpresa.
        </p>
      </header>

      <div className="mb-[1.4rem] mt-[2.2rem] grid grid-cols-[auto_minmax(2rem,7rem)_auto] items-center justify-center gap-[.7rem] text-[.78rem] font-bold text-muted-foreground">
        <span
          className={`inline-flex items-center gap-[.45rem] ${step === 'plans' ? 'text-foreground' : ''}`}
        >
          <b
            className={`grid size-[1.7rem] place-items-center rounded-full border text-[.7rem] ${step === 'plans' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary'}`}
          >
            1
          </b>{' '}
          Plano
        </span>
        <i aria-hidden="true" className="h-px bg-border" />
        <span
          className={`inline-flex items-center gap-[.45rem] ${step === 'account' ? 'text-foreground' : ''}`}
        >
          <b
            className={`grid size-[1.7rem] place-items-center rounded-full border text-[.7rem] ${step === 'account' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary'}`}
          >
            2
          </b>{' '}
          Conta
        </span>
      </div>

      <Chroma className="relative min-h-[28rem]" transitionKey={step}>
        {step === 'plans' ? (
          <PlanSelection
            selectedPlan={selectedPlan}
            onContinue={handleContinue}
            onSelect={setSelectedPlan}
          />
        ) : (
          <div className="mx-auto block w-[min(100%,34rem)] rounded-[1.7rem] border border-border bg-[color-mix(in_srgb,var(--card)_94%,transparent)] p-[clamp(1rem,3vw,1.5rem)] shadow-[var(--shadow-auth)] backdrop-blur-[1.5rem] max-[42rem]:rounded-[1.25rem] max-[42rem]:p-3">
            <div className="p-[clamp(1rem,3vw,2rem)] max-[42rem]:px-[.7rem] max-[42rem]:py-[1.15rem]">
              <button
                className="mb-6 inline-flex items-center gap-[.4rem] border-0 bg-transparent py-[.4rem] text-[.75rem] font-bold text-muted-foreground hover:text-foreground"
                type="button"
                onClick={handleBack}
              >
                <ArrowLeft aria-hidden="true" size={16} />
                Trocar plano
              </button>
              <div className="mb-4 inline-flex items-center gap-[.6rem] rounded-full border border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] bg-accent px-[.65rem] py-[.4rem] text-[.72rem]">
                <span>{activePlan.label}</span>
                <b className="text-muted-foreground">{activePlan.price}</b>
              </div>
              <h2 className="m-0 text-[clamp(1.6rem,3vw,2.25rem)] leading-[1.05] tracking-[-.045em]">
                Crie suas credenciais
              </h2>
              <p className="mb-6 mt-[.55rem] text-[.86rem] leading-[1.5] text-muted-foreground">
                Você vai verificar o e-mail antes de começar o onboarding.
              </p>

              <form
                action={formAction}
                className="grid gap-[1.2rem]"
                noValidate
              >
                <input name="plan" type="hidden" value={selectedPlan} />

                <div className="grid gap-2">
                  <label
                    className="text-[.86rem] font-[650] text-foreground"
                    htmlFor="sign-up-email"
                  >
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
                    className="min-h-12 w-full rounded-[.68rem] border border-input bg-[color-mix(in_srgb,var(--background)_68%,transparent)] px-[.9rem] py-3 text-foreground outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-[color-mix(in_srgb,var(--muted-foreground)_70%,transparent)] hover:border-[color-mix(in_srgb,var(--foreground)_40%,var(--border))] focus:border-ring focus:bg-background focus:shadow-[0_0_0_.2rem_color-mix(in_srgb,var(--ring)_22%,transparent)] aria-invalid:border-danger"
                    id="sign-up-email"
                    inputMode="email"
                    name="email"
                    placeholder="voce@exemplo.com"
                    required
                    type="email"
                  />
                  {state.fieldErrors?.email ? (
                    <p
                      className="m-0 text-[.76rem] leading-[1.4] text-danger"
                      id="sign-up-email-error"
                    >
                      {state.fieldErrors.email}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label
                    className="text-[.86rem] font-[650] text-foreground"
                    htmlFor="sign-up-password"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      aria-describedby={
                        state.fieldErrors?.password
                          ? 'sign-up-password-error'
                          : 'sign-up-password-help'
                      }
                      aria-invalid={Boolean(state.fieldErrors?.password)}
                      autoComplete="new-password"
                      className="min-h-12 w-full rounded-[.68rem] border border-input bg-[color-mix(in_srgb,var(--background)_68%,transparent)] px-[.9rem] py-3 pr-12 text-foreground outline-none transition-[border-color,box-shadow,background] duration-150 hover:border-[color-mix(in_srgb,var(--foreground)_40%,var(--border))] focus:border-ring focus:bg-background focus:shadow-[0_0_0_.2rem_color-mix(in_srgb,var(--ring)_22%,transparent)] aria-invalid:border-danger"
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
                      className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
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
                  <p
                    className="mt-[-.15rem] text-[.72rem] text-muted-foreground"
                    id="sign-up-password-help"
                  >
                    Pelo menos 8 caracteres.
                  </p>
                  {state.fieldErrors?.password ? (
                    <p
                      className="m-0 text-[.76rem] leading-[1.4] text-danger"
                      id="sign-up-password-error"
                    >
                      {state.fieldErrors.password}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label
                    className="text-[.86rem] font-[650] text-foreground"
                    htmlFor="sign-up-password-confirmation"
                  >
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      aria-describedby={
                        state.fieldErrors?.passwordConfirmation
                          ? 'sign-up-password-confirmation-error'
                          : undefined
                      }
                      aria-invalid={Boolean(
                        state.fieldErrors?.passwordConfirmation
                      )}
                      autoComplete="new-password"
                      className="min-h-12 w-full rounded-[.68rem] border border-input bg-[color-mix(in_srgb,var(--background)_68%,transparent)] px-[.9rem] py-3 pr-12 text-foreground outline-none transition-[border-color,box-shadow,background] duration-150 hover:border-[color-mix(in_srgb,var(--foreground)_40%,var(--border))] focus:border-ring focus:bg-background focus:shadow-[0_0_0_.2rem_color-mix(in_srgb,var(--ring)_22%,transparent)] aria-invalid:border-danger"
                      id="sign-up-password-confirmation"
                      minLength={8}
                      name="passwordConfirmation"
                      required
                      type={showPasswordConfirmation ? 'text' : 'password'}
                    />
                    <button
                      aria-label={
                        showPasswordConfirmation
                          ? 'Ocultar confirmação de senha'
                          : 'Mostrar confirmação de senha'
                      }
                      className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      type="button"
                      onClick={() =>
                        setShowPasswordConfirmation((visible) => !visible)
                      }
                    >
                      {showPasswordConfirmation ? (
                        <EyeSlash aria-hidden="true" size={18} />
                      ) : (
                        <Eye aria-hidden="true" size={18} />
                      )}
                    </button>
                  </div>
                  {state.fieldErrors?.passwordConfirmation ? (
                    <p
                      className="m-0 text-[.76rem] leading-[1.4] text-danger"
                      id="sign-up-password-confirmation-error"
                    >
                      {state.fieldErrors.passwordConfirmation}
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
                    <small>Use apenas em dispositivos de confiança.</small>
                  </span>
                </label>

                <label className="grid cursor-pointer grid-cols-[1.1rem_1fr] items-start gap-[.65rem] text-[.86rem] leading-[1.4] text-foreground">
                  <input
                    className="mt-[.05rem] size-[1.1rem] accent-primary"
                    name="terms"
                    type="checkbox"
                  />
                  <span className="grid gap-[.1rem] [&_small]:text-muted-foreground">
                    <span>Aceito os termos essenciais e a privacidade.</span>
                    <small>Sem comunicações promocionais obrigatórias.</small>
                  </span>
                </label>
                {state.fieldErrors?.terms ? (
                  <p className="m-0 text-[.76rem] leading-[1.4] text-danger">
                    {state.fieldErrors.terms}
                  </p>
                ) : null}

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

                <SubmitButton>Criar conta</SubmitButton>
              </form>

              <p className="mt-5 flex items-start gap-[.45rem] text-[.68rem] leading-[1.45] text-muted-foreground">
                <LockKey
                  aria-hidden="true"
                  className="mt-[.1rem] shrink-0 text-success"
                  size={14}
                  weight="fill"
                />
                Identidade protegida pelo WorkOS. O conteúdo do onboarding não
                entra no seu perfil de autenticação.
              </p>
            </div>
          </div>
        )}
      </Chroma>

      <p className="mt-[1.4rem] text-center text-[.82rem] text-muted-foreground">
        Já tem conta?{' '}
        <a
          className="font-[750] text-foreground underline-offset-[.18rem]"
          href="/sign-in"
        >
          Iniciar sessão
        </a>
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
    <div className="rounded-[1.7rem] border border-border bg-[color-mix(in_srgb,var(--card)_94%,transparent)] p-[clamp(1rem,3vw,1.5rem)] shadow-[var(--shadow-auth)] backdrop-blur-[1.5rem] max-[42rem]:rounded-[1.25rem] max-[42rem]:p-3">
      <div className="grid grid-cols-3 gap-[.85rem] max-[60rem]:grid-cols-1">
        {planOptions.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan === plan.id}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 px-1 pb-[.1rem] pt-[1.2rem] max-[42rem]:flex-col max-[42rem]:items-stretch">
        <div className="grid gap-[.2rem] text-[.78rem] text-foreground [&_span]:text-muted-foreground">
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
      className={`flex min-h-[23rem] cursor-pointer flex-col rounded-[1.25rem] border border-border bg-[color-mix(in_srgb,var(--background)_62%,transparent)] p-[1.35rem] text-left text-foreground transition-[transform,border-color,box-shadow] duration-200 enabled:hover:-translate-y-[.2rem] enabled:hover:border-[color-mix(in_srgb,var(--primary)_65%,var(--border))] enabled:hover:shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-[.58] max-[60rem]:min-h-0 ${selected ? 'border-primary bg-[color-mix(in_srgb,var(--accent)_56%,var(--card))] shadow-[inset_0_0_0_1px_var(--primary)]' : ''}`}
      disabled={unavailable}
      type="button"
      onClick={() => onSelect(plan.id)}
    >
      <span className="mb-[1.3rem] flex items-center justify-between gap-2 text-[.95rem] font-extrabold">
        <span>{plan.label}</span>
        {plan.recommended ? (
          <em className="rounded-full bg-primary px-[.55rem] py-[.3rem] text-[.62rem] not-italic text-primary-foreground">
            Para começar
          </em>
        ) : (
          <em className="rounded-full bg-primary px-[.55rem] py-[.3rem] text-[.62rem] not-italic text-primary-foreground">
            Em breve
          </em>
        )}
      </span>
      <strong className="text-[clamp(1.7rem,3vw,2.5rem)] leading-none tracking-[-.055em]">
        {plan.price}
      </strong>
      <small className="mt-[.3rem] text-[.72rem] text-muted-foreground">
        {plan.priceDetail}
      </small>
      <p className="my-5 min-h-[3.7rem] text-[.84rem] leading-[1.5] text-muted-foreground max-[60rem]:min-h-0">
        {plan.description}
      </p>
      <ul className="mb-[1.4rem] grid list-none gap-[.65rem] p-0">
        {plan.features.map((feature) => (
          <li
            className="grid grid-cols-[1rem_1fr] gap-[.45rem] text-[.75rem] leading-[1.4] text-foreground"
            key={feature}
          >
            <Check
              aria-hidden="true"
              className="mt-[.05rem] text-success"
              size={15}
              weight="bold"
            />
            {feature}
          </li>
        ))}
      </ul>
      <span
        className={`mt-auto grid min-h-[2.55rem] place-items-center rounded-xl px-3 text-[.76rem] font-[750] ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
      >
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
