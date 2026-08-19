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
import { AgentOrb, type AgentOrbState } from '@repo/react-web/ui/agent-orb'
import {
  Chroma,
  ShimmerSweep,
  SmoothButton
} from '@repo/react-web/vendors/smoothui'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { completeOnboardingAction } from '@action/complete-onboarding'
import { useVoiceGuide } from '@component/voice-guide/use-voice-guide'
import { planOptions, type PlanId } from '@data/plans'
import { INITIAL_ONBOARDING_STATE } from '@lib/auth/auth-state'

import styles from '@component/onboarding/voice-onboarding.module.css'

interface VoiceOnboardingProps {
  plan: PlanId
}

interface OnboardingAnswers {
  displayName: string
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
  choices: readonly Choice[]
  eyebrow: string
  prompt: string
  title: string
}

const NAME_PROMPT =
  'Antes de tudo: como você prefere que eu chame você? Pode falar seu nome ou escrever no campo.'
const REVIEW_PROMPT =
  'Pronto. Revise suas escolhas. Elas só ajustam a primeira experiência e poderão ser alteradas depois. Quando estiver confortável, acesse seu espaço.'

const CHOICE_QUESTIONS: readonly ChoiceQuestion[] = [
  {
    eyebrow: 'Seu primeiro contexto',
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
        description: 'Contexto para conversas importantes e acordos.',
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
        description: 'Uma pergunta por vez, com contexto quando ajudar.',
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
    eyebrow: 'Rede de apoio',
    title: 'Quer configurar alguém de confiança agora?',
    prompt:
      'Você quer configurar sua rede de apoio agora? Pode deixar para depois, preparar uma pessoa de confiança, ou preparar um profissional. Nada será compartilhado sem sua revisão.',
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
        description: 'Preparar o contexto, sem enviar nada ainda.',
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
  const orbState = getOrbState(isListening, playbackState)

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
    <section aria-labelledby="onboarding-title" className={styles.experience}>
      <Chroma
        className={styles.chroma}
        transitionKey={started ? step : 'welcome'}
      >
        {!started ? (
          <Welcome plan={plan} onStart={handleStart} />
        ) : (
          <div className={styles.conversation}>
            <aside className={styles.agentPanel}>
              <div className={styles.orbStage}>
                <AgentOrb size="clamp(11rem, 22vw, 17rem)" state={orbState} />
              </div>
              <div aria-live="polite" className={styles.voiceStatus}>
                <span aria-hidden="true" />
                {getVoiceStatus(isListening, playbackState)}
              </div>
              {transcript ? (
                <p aria-live="polite" className={styles.transcript}>
                  “{transcript}”
                </p>
              ) : (
                <p className={styles.transcriptHint}>
                  Fale naturalmente. Você revisa antes de avançar.
                </p>
              )}
              <div className={styles.voiceActions}>
                <SmoothButton
                  className={styles.voiceButton}
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
                  className={styles.iconButton}
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

            <div className={styles.questionPanel}>
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
                <div className={styles.inputActions}>
                  <SmoothButton
                    className={styles.micButton}
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
                    <span className={styles.supportNote}>
                      O navegador não oferece ditado; use as opções por texto.
                    </span>
                  ) : null}
                </div>
              ) : null}

              {state.error ? (
                <p aria-live="polite" className={styles.error} role="alert">
                  <WarningCircle aria-hidden="true" size={18} weight="fill" />
                  {state.error}
                </p>
              ) : null}

              <div className={styles.navigation}>
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
    <div className={styles.welcome}>
      <div className={styles.welcomeOrb}>
        <AgentOrb size="clamp(12rem, 30vw, 20rem)" state="idle" />
      </div>
      <div className={styles.welcomeCopy}>
        <p className={styles.eyebrow}>Plano {planLabel ?? 'Essencial'}</p>
        <h1 id="onboarding-title">
          <ShimmerSweep>Vamos começar do seu jeito.</ShimmerSweep>
        </h1>
        <p>
          São quatro perguntas curtas, conduzidas por voz. Você pode falar,
          escrever ou selecionar uma opção — e revisar tudo antes de entrar.
        </p>
        <SmoothButton
          className={styles.startButton}
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
        <div className={styles.privacyLine}>
          <LockKey aria-hidden="true" size={15} weight="fill" />
          As respostas desta conversa não são gravadas no perfil do WorkOS.
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
      className={styles.progress}
      role="progressbar"
      aria-valuemax={TOTAL_STEPS}
      aria-valuemin={1}
      aria-valuenow={step + 1}
    >
      <span style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
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
      <div className={styles.question}>
        <p className={styles.eyebrow}>Como chamar você</p>
        <h2>{NAME_PROMPT}</h2>
        <label className={styles.nameField}>
          <span>Nome preferido</span>
          <input
            autoComplete="name"
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
    <div className={styles.question}>
      <p className={styles.eyebrow}>{question.eyebrow}</p>
      <h2>{question.title}</h2>
      <div className={styles.choices}>
        {question.choices.map((choice) => {
          const selected = selectedValue === choice.value

          return (
            <button
              aria-pressed={selected}
              className={`${styles.choice} ${selected ? styles.selected : ''}`}
              key={choice.value}
              type="button"
              onClick={() => onChoice(choice.value)}
            >
              <span className={styles.choiceMark}>
                {selected ? (
                  <Check aria-hidden="true" size={16} weight="bold" />
                ) : null}
              </span>
              <span>
                <b>{choice.label}</b>
                <small>{choice.description}</small>
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
    <div className={styles.question}>
      <p className={styles.eyebrow}>Tudo pronto</p>
      <h2>Revise antes de acessar seu espaço.</h2>
      <div className={styles.review}>
        <ReviewRow label="Como chamar você" value={answers.displayName} />
        <ReviewRow
          label="Primeiro contexto"
          value={getChoiceLabel(0, answers.focus)}
        />
        <ReviewRow label="Ritmo" value={getChoiceLabel(1, answers.pace)} />
        <ReviewRow
          label="Rede de apoio"
          value={getChoiceLabel(2, answers.support)}
        />
      </div>
      <p className={styles.reviewNote}>
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
    <div>
      <span>{label}</span>
      <b>{value}</b>
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

function getAnswerKey(step: number): 'focus' | 'pace' | 'support' | null {
  if (step === 1) {
    return 'focus'
  }
  if (step === 2) {
    return 'pace'
  }
  if (step === 3) {
    return 'support'
  }
  return null
}

function getCanContinue(step: number, answers: OnboardingAnswers): boolean {
  if (step === 0) {
    return answers.displayName.trim().length > 0
  }

  const answerKey = getAnswerKey(step)
  return answerKey ? Boolean(answers[answerKey]) : true
}

function getOrbState(
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
    return 'Estou ouvindo você'
  }
  if (playbackState === 'loading') {
    return 'Preparando a voz'
  }
  if (playbackState === 'speaking') {
    return 'Amarelo está falando'
  }
  return 'Pronta para continuar'
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
