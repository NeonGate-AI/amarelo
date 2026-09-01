'use client'

import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKey,
  Microphone,
  SpeakerHigh,
  SpeakerSlash,
  WarningCircle
} from '@phosphor-icons/react'
import { AgentOrb, type AgentOrbState } from '@repo/react/ui/agent-orb'
import {
  Chroma,
  ShimmerSweep,
  SmoothButton
} from '@repo/react/vendors/smoothui'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { completeOnboardingAction } from '@action/complete-onboarding'
import { useVoiceGuide } from '@component/voice-guide/use-voice-guide'
import { eloOptions, isEloId, type EloId } from '@data/elos'
import { planOptions, type PlanId } from '@data/plans'
import { INITIAL_ONBOARDING_STATE } from '@lib/auth/auth-state'

interface VoiceOnboardingProps {
  plan: PlanId
}

interface OnboardingAnswers {
  displayName: string
  elo: EloId | ''
  focus: string
  pace: string
  support: string
}

interface Choice {
  description: string
  keywords: readonly string[]
  label: string
  value: string
}

interface ChoiceQuestion {
  answerKey: Exclude<keyof OnboardingAnswers, 'displayName'>
  choices: readonly Choice[]
  eyebrow: string
  prompt: string
  title: string
}

const NAME_PROMPT =
  'Antes de tudo: como você prefere que eu chame você? Pode falar seu nome ou usar o campo da tela.'
const REVIEW_PROMPT =
  'Pronto. Revise suas escolhas. Elas só ajustam a primeira experiência e poderão ser alteradas depois. Quando estiver confortável, acesse seu espaço.'

const CHOICE_QUESTIONS: readonly ChoiceQuestion[] = [
  {
    answerKey: 'elo',
    eyebrow: 'Seu Elo',
    title: 'Com quem você quer começar?',
    prompt:
      'Escolha seu Elo. Pode ser Ana, Nico ou Isa. A escolha pertence somente à sua conta e nunca compartilha conversas, memória ou permissões com outra pessoa.',
    choices: eloOptions.map((elo) => ({
      value: elo.id,
      label: elo.label,
      description: elo.description,
      keywords: elo.keywords
    }))
  },
  {
    answerKey: 'focus',
    eyebrow: 'Sua primeira memória',
    title: 'O que você quer organizar primeiro?',
    prompt:
      'O que você quer organizar primeiro? Pode escolher rotina e sobrecarga, emoções e limites, relacionamentos e conversas, ou apenas explorar.',
    choices: [
      {
        value: 'routine',
        label: 'Rotina e sobrecarga',
        description: 'Prioridades, energia, tarefas e o que pesa hoje.',
        keywords: ['rotina', 'sobrecarga', 'tarefa', 'energia']
      },
      {
        value: 'emotions',
        label: 'Emoções e limites',
        description: 'Nomear o que acontece e preparar pedidos claros.',
        keywords: ['emoção', 'emocao', 'limite', 'sentimento']
      },
      {
        value: 'relationships',
        label: 'Relacionamentos e conversas',
        description: 'Preparar conversas importantes e acordos.',
        keywords: ['relacionamento', 'conversa', 'pessoa', 'acordo']
      },
      {
        value: 'explore',
        label: 'Só quero explorar',
        description: 'Uma introdução leve, sem definir um foco agora.',
        keywords: ['explorar', 'conhecer', 'ainda não', 'ainda nao']
      }
    ]
  },
  {
    answerKey: 'pace',
    eyebrow: 'Ritmo da conversa',
    title: 'Como você prefere que eu converse?',
    prompt:
      'Como você prefere que eu converse? De forma breve e direta, passo a passo, ou com mais tempo para pensar?',
    choices: [
      {
        value: 'direct',
        label: 'Breve e direto',
        description: 'Perguntas curtas e próximos passos objetivos.',
        keywords: ['breve', 'direto', 'rápido', 'rapido', 'curto']
      },
      {
        value: 'guided',
        label: 'Passo a passo',
        description: 'Uma pergunta por vez, com explicações quando ajudarem.',
        keywords: ['passo', 'guiado', 'explicar']
      },
      {
        value: 'reflective',
        label: 'Com tempo para pensar',
        description: 'Mais pausas e espaço antes de avançar.',
        keywords: ['pensar', 'tempo', 'pausa', 'calma']
      }
    ]
  },
  {
    answerKey: 'support',
    eyebrow: 'Rede de apoio',
    title: 'Quer configurar alguém de confiança agora?',
    prompt:
      'Você quer configurar sua rede de apoio agora? Cada participante usa uma conta privada e escolhe seu próprio Elo. Nada será compartilhado sem sua revisão e autorização.',
    choices: [
      {
        value: 'later',
        label: 'Deixar para depois',
        description: 'Começar somente no seu espaço privado.',
        keywords: ['depois', 'agora não', 'agora nao', 'sozinho']
      },
      {
        value: 'trusted-person',
        label: 'Pessoa de confiança',
        description: 'Preparar o que você quer dizer, sem enviar nada ainda.',
        keywords: ['confiança', 'confianca', 'família', 'familia', 'amigo']
      },
      {
        value: 'professional',
        label: 'Profissional',
        description: 'Preparar uma futura conexão com quem acompanha você.',
        keywords: ['profissional', 'terapeuta', 'médico', 'medico']
      }
    ]
  }
]

const TOTAL_STEPS = CHOICE_QUESTIONS.length + 2
const PROGRESS_WIDTH_CLASSES = [
  'w-[16.6667%]',
  'w-[33.3333%]',
  'w-1/2',
  'w-[66.6667%]',
  'w-[83.3333%]',
  'w-full'
] as const

export function VoiceOnboarding(props: VoiceOnboardingProps) {
  const { plan } = props
  const [state, formAction] = useActionState(
    completeOnboardingAction,
    INITIAL_ONBOARDING_STATE
  )
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    displayName: '',
    elo: '',
    focus: '',
    pace: '',
    support: ''
  })
  const [isListening, setIsListening] = useState(false)
  const [microphoneSupported, setMicrophoneSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const { isEnabled, playbackState, speak, stop, toggle } = useVoiceGuide()

  useEffect(() => {
    setMicrophoneSupported(
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    )

    return () => recognitionRef.current?.stop()
  }, [])

  const prompt = getPrompt(step)
  const canContinue = getCanContinue(step, answers)
  const eloState = getEloState(isListening, playbackState)

  function handleStart() {
    setStarted(true)
    void speak(NAME_PROMPT)
  }

  function handleNext() {
    if (!canContinue || step >= TOTAL_STEPS - 1) {
      return
    }

    const nextStep = step + 1
    stop()
    setTranscript('')
    setStep(nextStep)
    void speak(getPrompt(nextStep))
  }

  function handleBack() {
    if (step === 0) {
      setStarted(false)
      stop()
      return
    }

    const previousStep = step - 1
    stop()
    setTranscript('')
    setStep(previousStep)
    void speak(getPrompt(previousStep))
  }

  function handleChoice(value: string) {
    const answerKey = getAnswerKey(step)

    if (answerKey === 'elo') {
      if (isEloId(value)) {
        setAnswers((current) => ({ ...current, elo: value }))
      }
      return
    }

    if (answerKey) {
      setAnswers((current) => ({ ...current, [answerKey]: value }))
    }
  }

  function handleListen() {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!Recognition || isListening) {
      return
    }

    stop()
    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let nextTranscript = ''

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        nextTranscript += event.results[index]?.[0]?.transcript ?? ''
      }

      setTranscript(nextTranscript.trim())

      const finalResult = event.results[event.results.length - 1]
      if (finalResult?.isFinal) {
        applyTranscript(nextTranscript.trim())
      }
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    setIsListening(true)
    recognition.start()
  }

  function applyTranscript(value: string) {
    if (!value) {
      return
    }

    if (step === 0) {
      setAnswers((current) => ({ ...current, displayName: value.slice(0, 80) }))
      return
    }

    const question = getChoiceQuestion(step)
    const choice = question ? matchSpokenChoice(value, question.choices) : null

    if (choice) {
      handleChoice(choice.value)
    }
  }

  return (
    <section
      aria-labelledby="onboarding-title"
      className="mx-auto w-[min(100%,78rem)]"
    >
      <Chroma
        className="min-h-[min(43rem,calc(100dvh-11rem))] rounded-[1.8rem] border border-border bg-[color-mix(in_srgb,var(--card)_94%,transparent)] shadow-[var(--shadow-auth)] backdrop-blur-[1.5rem] max-[40rem]:min-h-[calc(100dvh-9rem)] max-[40rem]:rounded-[1.25rem]"
        transitionKey={started ? step : 'welcome'}
      >
        {!started ? (
          <Welcome plan={plan} onStart={handleStart} />
        ) : (
          <div className="grid min-h-[min(43rem,calc(100dvh-11rem))] grid-cols-[minmax(17rem,.82fr)_minmax(25rem,1.18fr)] max-[58rem]:grid-cols-1 max-[40rem]:min-h-[calc(100dvh-9rem)]">
            <aside className="flex min-h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_20%_80%,rgb(255_255_255_/_55%),transparent_32%),linear-gradient(155deg,var(--elo-yellow-100),var(--elo-yellow-400))] p-[clamp(1.25rem,4vw,3rem)] text-center text-[var(--elo-neutral-950)] min-[40.001rem]:max-[58rem]:grid min-[40.001rem]:max-[58rem]:min-h-[17rem] min-[40.001rem]:max-[58rem]:grid-cols-[minmax(10rem,.7fr)_1fr] max-[40rem]:min-h-[18rem] max-[40rem]:p-4">
              <div
                aria-label="Seu Elo"
                className="grid min-h-72 place-items-center min-[40.001rem]:max-[58rem]:row-span-3 min-[40.001rem]:max-[58rem]:mr-4 min-[40.001rem]:max-[58rem]:min-h-56 max-[40rem]:mr-0 max-[40rem]:min-h-44"
                role="img"
              >
                <AgentOrb size="clamp(11rem, 22vw, 17rem)" state={eloState} />
              </div>
              <div
                aria-live="polite"
                className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[rgb(18_18_17_/_9%)] bg-[rgb(255_255_255_/_45%)] px-3 py-[.45rem] text-[.72rem] font-[750] text-[rgb(18_18_17_/_72%)]"
              >
                <span
                  aria-hidden="true"
                  className="size-[.48rem] rounded-full bg-[var(--elo-green-700)]"
                />
                {getVoiceStatus(isListening, playbackState)}
              </div>
              {transcript ? (
                <p
                  aria-live="polite"
                  className="my-4 min-h-12 max-w-96 text-[.82rem] font-[650] leading-[1.5] text-[var(--elo-neutral-950)] max-[58rem]:min-h-0 max-[40rem]:my-[.7rem]"
                >
                  Sua resposta: “{transcript}”
                </p>
              ) : (
                <p className="my-4 min-h-12 max-w-96 text-[.82rem] leading-[1.5] text-[rgb(18_18_17_/_70%)] max-[58rem]:min-h-0 max-[40rem]:my-[.7rem]">
                  Fale naturalmente. Você revisa antes de avançar.
                </p>
              )}
              <div className="flex items-center gap-2">
                <SmoothButton
                  className="bg-[rgb(255_255_255_/_65%)] text-[var(--elo-neutral-950)]"
                  disabled={!isEnabled}
                  prefix={<SpeakerHigh aria-hidden="true" size={17} />}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => speak(prompt)}
                >
                  Ouvir de novo
                </SmoothButton>
                <button
                  aria-label={isEnabled ? 'Desativar voz' : 'Ativar voz'}
                  className="grid size-[2.35rem] cursor-pointer place-items-center rounded-full border border-[rgb(18_18_17_/_12%)] bg-[rgb(255_255_255_/_55%)] p-0 text-[var(--elo-neutral-950)]"
                  type="button"
                  onClick={toggle}
                >
                  {isEnabled ? (
                    <SpeakerHigh aria-hidden="true" size={18} />
                  ) : (
                    <SpeakerSlash aria-hidden="true" size={18} />
                  )}
                </button>
              </div>
            </aside>

            <div className="flex min-w-0 flex-col p-[clamp(1.5rem,5vw,3.6rem)] max-[40rem]:p-4">
              <Progress step={step} />
              <Question
                answers={answers}
                step={step}
                onChoice={handleChoice}
                onNameChange={(displayName) =>
                  setAnswers((current) => ({ ...current, displayName }))
                }
              />

              {step < TOTAL_STEPS - 1 ? (
                <div className="mt-[1.2rem] flex min-h-[3.8rem] items-center gap-[.7rem]">
                  <SmoothButton
                    className="text-foreground"
                    disabled={!microphoneSupported || isListening}
                    prefix={
                      <Microphone aria-hidden="true" size={18} weight="fill" />
                    }
                    shape="pill"
                    type="button"
                    variant="outline"
                    onClick={handleListen}
                  >
                    {isListening ? 'Estou ouvindo…' : 'Responder por voz'}
                  </SmoothButton>
                  {!microphoneSupported ? (
                    <span className="text-[.68rem] text-muted-foreground">
                      O navegador não oferece ditado; use os controles da tela.
                    </span>
                  ) : null}
                </div>
              ) : null}

              {state.error ? (
                <p
                  aria-live="polite"
                  className="mt-4 flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-3 text-[.76rem] text-danger"
                  role="alert"
                >
                  <WarningCircle aria-hidden="true" size={18} weight="fill" />
                  {state.error}
                </p>
              ) : null}

              <div className="mt-auto flex items-center justify-between gap-4 border-t border-border pt-5 max-[40rem]:flex-col-reverse max-[40rem]:items-stretch max-[40rem]:[&>*]:w-full max-[40rem]:[&_form]:w-full max-[40rem]:[&_form_button]:w-full">
                <SmoothButton
                  prefix={<ArrowLeft aria-hidden="true" size={17} />}
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                >
                  Voltar
                </SmoothButton>

                {step < TOTAL_STEPS - 1 ? (
                  <SmoothButton
                    color="accent"
                    disabled={!canContinue}
                    shape="pill"
                    size="lg"
                    suffix={<ArrowRight aria-hidden="true" size={18} />}
                    type="button"
                    variant="solid"
                    onClick={handleNext}
                  >
                    Continuar
                  </SmoothButton>
                ) : (
                  <form action={formAction}>
                    <input
                      name="displayName"
                      type="hidden"
                      value={answers.displayName}
                    />
                    <input name="plan" type="hidden" value={plan} />
                    <input
                      name="selectedElo"
                      type="hidden"
                      value={answers.elo}
                    />
                    <input
                      name="voiceEnabled"
                      type="hidden"
                      value={String(isEnabled)}
                    />
                    <FinishButton />
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </Chroma>
    </section>
  )
}

interface WelcomeProps {
  onStart: () => void
  plan: PlanId
}

function Welcome(props: WelcomeProps) {
  const { onStart, plan } = props
  const planLabel = planOptions.find((option) => option.id === plan)?.label

  return (
    <div className="grid min-h-[min(43rem,calc(100dvh-11rem))] grid-cols-[minmax(18rem,.9fr)_minmax(22rem,1.1fr)] items-center gap-[clamp(1rem,5vw,4rem)] p-[clamp(1.25rem,5vw,4rem)] max-[58rem]:grid-cols-1 max-[40rem]:min-h-[calc(100dvh-9rem)] max-[40rem]:p-3">
      <div
        aria-label="Seu Elo"
        className="grid min-h-96 place-items-center overflow-hidden rounded-[1.35rem] bg-[radial-gradient(circle_at_70%_15%,rgb(255_255_255_/_76%),transparent_34%),linear-gradient(145deg,var(--elo-yellow-100),var(--elo-yellow-400))] max-[58rem]:min-h-[17rem] max-[40rem]:min-h-56"
        role="img"
      >
        <AgentOrb size="clamp(12rem, 30vw, 20rem)" state="idle" />
      </div>
      <div className="max-[40rem]:px-[.6rem] max-[40rem]:pb-6 max-[40rem]:pt-4">
        <p className="mb-[.65rem] text-[.68rem] font-extrabold uppercase tracking-[.16em] text-muted-foreground">
          Plano {planLabel ?? 'Essencial'}
        </p>
        <h1
          className="m-0 text-[clamp(2.5rem,6vw,5rem)] font-[650] leading-[.92] tracking-[-.068em]"
          id="onboarding-title"
        >
          <ShimmerSweep>Vamos começar do seu jeito.</ShimmerSweep>
        </h1>
        <p className="mb-[1.7rem] mt-[1.2rem] max-w-[34rem] text-base leading-[1.65] text-muted-foreground">
          São cinco perguntas curtas, conduzidas por voz. Você pode responder
          por voz ou usar os controles acessíveis da tela — e revisar tudo antes
          de entrar.
        </p>
        <SmoothButton
          className="min-h-[3.2rem]"
          color="accent"
          prefix={<SpeakerHigh aria-hidden="true" size={20} weight="fill" />}
          shape="pill"
          size="lg"
          type="button"
          variant="solid"
          onClick={onStart}
        >
          Começar com voz
        </SmoothButton>
        <div className="mt-[1.35rem] flex items-start gap-2 text-[.72rem] leading-[1.45] text-muted-foreground">
          <LockKey
            aria-hidden="true"
            className="mt-[.05rem] shrink-0 text-success"
            size={15}
            weight="fill"
          />
          Cada conta escolhe seu próprio Elo. Escolher o mesmo Elo não
          compartilha conversas, memória ou permissões.
        </div>
      </div>
    </div>
  )
}

interface ProgressProps {
  step: number
}

function Progress(props: ProgressProps) {
  const { step } = props

  return (
    <div
      aria-label={`Etapa ${step + 1} de ${TOTAL_STEPS}`}
      className="mb-[clamp(1.8rem,4vw,3.5rem)] h-[.28rem] w-full overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-valuemax={TOTAL_STEPS}
      aria-valuemin={1}
      aria-valuenow={step + 1}
    >
      <span
        className={`block h-full rounded-[inherit] bg-primary transition-[width] duration-[380ms] ease-[cubic-bezier(.22,1,.36,1)] ${PROGRESS_WIDTH_CLASSES[step]}`}
      />
    </div>
  )
}

interface QuestionProps {
  answers: OnboardingAnswers
  onChoice: (value: string) => void
  onNameChange: (value: string) => void
  step: number
}

function Question(props: QuestionProps) {
  const { answers, onChoice, onNameChange, step } = props

  if (step === 0) {
    return (
      <div className="flex-1">
        <p className="mb-[.65rem] text-[.68rem] font-extrabold uppercase tracking-[.16em] text-muted-foreground">
          Como chamar você
        </p>
        <h2 className="mb-[1.65rem] max-w-[38rem] text-[clamp(1.8rem,4vw,3rem)] font-[650] leading-[1.04] tracking-[-.052em]">
          {NAME_PROMPT}
        </h2>
        <label className="grid max-w-md gap-[.6rem] text-[.82rem] font-bold text-foreground">
          <span>Nome preferido</span>
          <input
            autoComplete="name"
            className="min-h-[3.4rem] w-full rounded-[.85rem] border border-input bg-background px-4 py-[.85rem] text-foreground outline-none focus:border-ring focus:shadow-[0_0_0_.2rem_color-mix(in_srgb,var(--ring)_22%,transparent)]"
            maxLength={80}
            placeholder="Pode escrever aqui"
            type="text"
            value={answers.displayName}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>
      </div>
    )
  }

  if (step === TOTAL_STEPS - 1) {
    return <Review answers={answers} />
  }

  const question = getChoiceQuestion(step)
  const answerKey = getAnswerKey(step)
  const selectedValue = answerKey ? answers[answerKey] : ''

  if (!question) {
    return null
  }

  return (
    <div className="flex-1">
      <p className="mb-[.65rem] text-[.68rem] font-extrabold uppercase tracking-[.16em] text-muted-foreground">
        {question.eyebrow}
      </p>
      <h2 className="mb-[1.65rem] max-w-[38rem] text-[clamp(1.8rem,4vw,3rem)] font-[650] leading-[1.04] tracking-[-.052em]">
        {question.title}
      </h2>
      <div className="grid grid-cols-2 gap-[.7rem] max-[40rem]:grid-cols-1">
        {question.choices.map((choice) => {
          const selected = selectedValue === choice.value

          return (
            <button
              aria-pressed={selected}
              className={`grid min-h-[5.25rem] cursor-pointer grid-cols-[1.35rem_1fr] gap-3 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--background)_70%,transparent)] p-4 text-left text-foreground transition-[border-color,transform,background] duration-150 hover:-translate-y-[.1rem] hover:border-[color-mix(in_srgb,var(--primary)_60%,var(--border))] max-[40rem]:min-h-[4.6rem] ${selected ? 'border-primary bg-[color-mix(in_srgb,var(--accent)_58%,var(--card))] shadow-[inset_0_0_0_1px_var(--primary)]' : ''}`}
              key={choice.value}
              type="button"
              onClick={() => onChoice(choice.value)}
            >
              <span
                className={`grid size-[1.3rem] place-items-center rounded-full border text-primary-foreground ${selected ? 'border-primary bg-primary' : 'border-border bg-secondary'}`}
              >
                {selected ? (
                  <Check aria-hidden="true" size={16} weight="bold" />
                ) : null}
              </span>
              <span className="grid gap-1">
                <b className="text-[.84rem]">{choice.label}</b>
                <small className="text-[.71rem] leading-[1.4] text-muted-foreground">
                  {choice.description}
                </small>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface ReviewProps {
  answers: OnboardingAnswers
}

function Review(props: ReviewProps) {
  const { answers } = props

  return (
    <div className="flex-1">
      <p className="mb-[.65rem] text-[.68rem] font-extrabold uppercase tracking-[.16em] text-muted-foreground">
        Tudo pronto
      </p>
      <h2 className="mb-[1.65rem] max-w-[38rem] text-[clamp(1.8rem,4vw,3rem)] font-[650] leading-[1.04] tracking-[-.052em]">
        Revise antes de acessar seu espaço.
      </h2>
      <div className="grid gap-[.55rem]">
        <ReviewRow label="Como chamar você" value={answers.displayName} />
        <ReviewRow label="Seu Elo" value={getChoiceLabel(0, answers.elo)} />
        <ReviewRow
          label="Primeira memória"
          value={getChoiceLabel(1, answers.focus)}
        />
        <ReviewRow label="Ritmo" value={getChoiceLabel(2, answers.pace)} />
        <ReviewRow
          label="Rede de apoio"
          value={getChoiceLabel(3, answers.support)}
        />
      </div>
      <p className="mt-4 text-[.72rem] leading-[1.5] text-muted-foreground">
        Essas escolhas personalizam a interface; o conteúdo sensível fica fora
        do perfil de identidade.
      </p>
    </div>
  )
}

interface ReviewRowProps {
  label: string
  value: string
}

function ReviewRow(props: ReviewRowProps) {
  const { label, value } = props

  return (
    <div className="flex items-center justify-between gap-4 rounded-[.8rem] border border-border bg-[color-mix(in_srgb,var(--background)_70%,transparent)] px-4 py-[.85rem]">
      <span className="text-[.72rem] text-muted-foreground">{label}</span>
      <b className="text-right text-[.8rem]">{value}</b>
    </div>
  )
}

function FinishButton() {
  const { pending } = useFormStatus()

  return (
    <SmoothButton
      color="accent"
      loading={pending}
      shape="pill"
      size="lg"
      suffix={<ArrowRight aria-hidden="true" size={18} />}
      type="submit"
      variant="solid"
    >
      {pending ? 'Preparando seu espaço' : 'Acessar meu espaço'}
    </SmoothButton>
  )
}

function getChoiceQuestion(step: number): ChoiceQuestion | undefined {
  return CHOICE_QUESTIONS[step - 1]
}

function getPrompt(step: number): string {
  if (step === 0) {
    return NAME_PROMPT
  }

  if (step === TOTAL_STEPS - 1) {
    return REVIEW_PROMPT
  }

  return getChoiceQuestion(step)?.prompt ?? ''
}

function getAnswerKey(
  step: number
): Exclude<keyof OnboardingAnswers, 'displayName'> | null {
  return getChoiceQuestion(step)?.answerKey ?? null
}

function getCanContinue(step: number, answers: OnboardingAnswers): boolean {
  if (step === 0) {
    return answers.displayName.trim().length > 0
  }

  const answerKey = getAnswerKey(step)
  return answerKey ? Boolean(answers[answerKey]) : true
}

function getEloState(
  isListening: boolean,
  playbackState: 'idle' | 'loading' | 'speaking'
): AgentOrbState {
  if (isListening) {
    return 'listening'
  }
  if (playbackState === 'loading') {
    return 'thinking'
  }
  if (playbackState === 'speaking') {
    return 'speaking'
  }
  return 'idle'
}

function getVoiceStatus(
  isListening: boolean,
  playbackState: 'idle' | 'loading' | 'speaking'
): string {
  if (isListening) {
    return 'Seu Elo está ouvindo você'
  }
  if (playbackState === 'loading') {
    return 'Preparando a voz'
  }
  if (playbackState === 'speaking') {
    return 'Seu Elo está falando'
  }
  return 'Seu Elo está pronto para continuar'
}

function matchSpokenChoice(
  transcript: string,
  choices: readonly Choice[]
): Choice | undefined {
  const normalizedTranscript = normalizeText(transcript)

  return choices.find((choice) =>
    choice.keywords.some((keyword) =>
      normalizedTranscript.includes(normalizeText(keyword))
    )
  )
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getChoiceLabel(questionIndex: number, value: string): string {
  return (
    CHOICE_QUESTIONS[questionIndex]?.choices.find(
      (choice) => choice.value === value
    )?.label ?? 'Não definido'
  )
}
