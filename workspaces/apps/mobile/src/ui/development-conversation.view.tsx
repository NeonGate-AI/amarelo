import {
  ConversationClient,
  type ConversationTurnRequest
} from '@repo/conversation-sdk'
import { AgentOrb, agentOrbPresets } from '@repo/react/ui/agent-orb'
import { SmoothButton } from '@repo/react/ui/smooth-button'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import {
  type ConversationSessionEvent,
  ConversationSessionService,
  type DevelopmentConversationConfiguration
} from '@/conversation'
import type { CaptionContent } from '@/state'

import { Caption } from './caption'

interface DevelopmentConversationViewProps {
  configuration: Extract<
    DevelopmentConversationConfiguration,
    { readonly enabled: true }
  >
}

type DevelopmentConversationPhase = 'failed' | 'idle' | 'pending' | 'speaking'

interface DevelopmentConversationState {
  readonly caption: CaptionContent
  readonly phase: DevelopmentConversationPhase
  readonly status: string
}

const INITIAL_STATE: DevelopmentConversationState = Object.freeze({
  caption: Object.freeze({
    accessible:
      'Modo de desenvolvimento: envie um turno sintético para conversar com a Ana.',
    lines: Object.freeze([
      'Envie um turno sintético para validar',
      'o caminho real até a Ana.'
    ])
  }),
  phase: 'idle',
  status: 'Driver de texto para desenvolvimento'
})

function captionFor(text: string): CaptionContent {
  return Object.freeze({
    accessible: `Fala da Ana: ${text}`,
    lines: Object.freeze([text])
  })
}

function stateFromEvent(
  event: ConversationSessionEvent
): DevelopmentConversationState {
  switch (event.type) {
    case 'aborted':
      return Object.freeze({
        caption: Object.freeze({
          accessible: 'O turno de desenvolvimento foi cancelado.',
          lines: Object.freeze(['Turno cancelado. Você pode enviar outro.'])
        }),
        phase: 'idle',
        status: 'Turno cancelado'
      })
    case 'failed':
      return Object.freeze({
        caption: Object.freeze({
          accessible: `Falha segura: ${event.failure.message}`,
          lines: Object.freeze([event.failure.message])
        }),
        phase: 'failed',
        status: 'A Ana não conseguiu responder'
      })
    case 'pending':
      return Object.freeze({
        caption: Object.freeze({
          accessible: 'O turno está sendo processado pela Ana.',
          lines: Object.freeze(['A Ana está processando o turno…'])
        }),
        phase: 'pending',
        status: 'Ana está processando'
      })
    case 'succeeded':
      return Object.freeze({
        caption: captionFor(event.result.response),
        phase: 'speaking',
        status: 'Ana respondeu'
      })
  }
}

function createEphemeralIdentifier(prefix: string, sequence: number): string {
  const random = globalThis.crypto.randomUUID()
  return `${prefix}-${sequence}-${random}`
}

export function DevelopmentConversationView({
  configuration
}: DevelopmentConversationViewProps) {
  const [draft, setDraft] = useState('')
  const [state, setState] =
    useState<DevelopmentConversationState>(INITIAL_STATE)
  const conversationId = useRef(
    createEphemeralIdentifier('development-conversation', 1)
  )
  const requestSequence = useRef(0)

  const session = useMemo(
    () =>
      new ConversationSessionService({
        client: new ConversationClient({ baseUrl: configuration.baseUrl }),
        onEvent: (event) => setState(stateFromEvent(event))
      }),
    [configuration.baseUrl]
  )

  useEffect(() => () => session.dispose(), [session])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = draft.trim()
    if (message.length === 0 || state.phase === 'pending') return

    requestSequence.current += 1
    const requestId = createEphemeralIdentifier(
      'development-request',
      requestSequence.current
    )
    const input: ConversationTurnRequest = {
      agentId: 'ana',
      asOf: new Date().toISOString(),
      conversationId: conversationId.current,
      history: [],
      message,
      purpose: 'conversation.support',
      requestId
    }

    setDraft('')
    void session.submit(input)
  }

  const orbState =
    state.phase === 'speaking'
      ? 'speaking'
      : state.phase === 'failed'
        ? 'idle'
        : 'listening'

  return (
    <main className="mobile-shell grid min-h-[100dvh] w-full grid-rows-[auto_1fr_auto] bg-background text-foreground">
      <header className="mx-auto w-full max-w-sm text-center">
        <p className="m-0 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Desenvolvimento · texto sintético
        </p>
        <h1 className="mt-2 mb-0 text-[2rem] leading-tight font-bold tracking-[-0.035em]">
          Ana
        </h1>
        <p
          aria-live="polite"
          className="mt-1.5 mb-0 text-sm font-medium text-muted-foreground"
        >
          {state.status}
        </p>
      </header>

      <section className="mx-auto flex w-full max-w-sm flex-col items-center justify-center py-6 text-center">
        <div aria-hidden="true">
          <div
            className="orb-stage relative grid size-[clamp(10rem,25dvh,12rem)] place-items-center rounded-full"
            data-state={orbState}
          >
            <AgentOrb
              preset={agentOrbPresets.ana}
              reducedMotion="system"
              size="clamp(9rem, 22dvh, 11rem)"
              speed={1}
              state={orbState}
            />
          </div>
        </div>
        <div className="mt-5 w-full px-1">
          <Caption caption={state.caption} />
        </div>
      </section>

      <form
        className="mx-auto grid w-full max-w-sm gap-3"
        onSubmit={handleSubmit}
      >
        <label
          className="text-sm font-semibold"
          htmlFor="development-conversation-message"
        >
          Turno sintético
        </label>
        <textarea
          aria-describedby="development-conversation-help"
          className="min-h-24 w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 text-base text-card-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring"
          disabled={state.phase === 'pending'}
          id="development-conversation-message"
          maxLength={16000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escreva uma mensagem de teste para a Ana"
          value={draft}
        />
        <p
          className="m-0 text-xs leading-5 text-muted-foreground"
          id="development-conversation-help"
        >
          Este campo existe somente quando o driver de desenvolvimento está
          explicitamente habilitado.
        </p>
        <div className="flex gap-3">
          <SmoothButton
            className="min-h-11 flex-1"
            color="accent"
            disabled={draft.trim().length === 0 || state.phase === 'pending'}
            shape="pill"
            size="lg"
            type="submit"
            variant="candy"
          >
            Enviar turno
          </SmoothButton>
          {state.phase === 'pending' ? (
            <SmoothButton
              className="min-h-11"
              color="neutral"
              onClick={() => session.cancel()}
              shape="pill"
              size="lg"
              type="button"
              variant="outline"
            >
              Cancelar
            </SmoothButton>
          ) : null}
        </div>
      </form>
    </main>
  )
}
