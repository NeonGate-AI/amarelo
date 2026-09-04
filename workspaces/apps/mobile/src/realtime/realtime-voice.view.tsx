import { AgentOrb, agentOrbPresets } from '@repo/react/ui/agent-orb'
import { SmoothButton } from '@repo/react/ui/smooth-button'

import { useRealtimeVoice } from './session'

const STATUS_LABELS = {
  connected: 'Conectado · fale normalmente',
  connecting: 'Conectando ao Realtime…',
  error: 'Falha na sessão de voz',
  idle: 'Pronto para iniciar'
} as const

export function RealtimeVoiceView() {
  const { audioRef, error, start, status, stop, transcript } =
    useRealtimeVoice()
  const active = status === 'connected' || status === 'connecting'
  const orbState = status === 'connected' ? 'listening' : 'idle'

  return (
    <main className="mobile-shell grid min-h-[100dvh] w-full grid-rows-[auto_1fr_auto] bg-background text-foreground">
      <header className="mx-auto w-full max-w-sm text-center">
        <p className="m-0 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Desenvolvimento · OpenAI Realtime WebRTC
        </p>
        <h1 className="mt-2 mb-0 text-[2rem] leading-tight font-bold tracking-[-0.035em]">
          Ana
        </h1>
        <p
          aria-live="polite"
          className="mt-1.5 mb-0 text-sm font-medium text-muted-foreground"
        >
          {STATUS_LABELS[status]}
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

        <div className="mt-6 max-w-xs text-sm leading-6 text-muted-foreground">
          <p className="m-0">
            Fale com o modelo <code>gpt-realtime-2</code> usando seu microfone.
          </p>
          <p className="mt-2 mb-0">
            Exemplo: “O dia 4 de setembro de 2026 às 10:00 está disponível?”
          </p>
        </div>

        <p
          aria-live="polite"
          className="mt-5 mb-0 min-h-12 w-full max-w-sm text-base leading-6 text-foreground"
        >
          {transcript.length > 0
            ? transcript
            : 'A fala da Ana aparecerá aqui como legenda.'}
        </p>

        {error === null ? null : (
          <p
            aria-live="assertive"
            className="mt-4 mb-0 rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground"
          >
            {error}
          </p>
        )}
      </section>

      <div className="mx-auto flex w-full max-w-sm gap-3">
        <SmoothButton
          className="min-h-11 flex-1"
          color="accent"
          disabled={active}
          onClick={() => void start()}
          shape="pill"
          size="lg"
          type="button"
          variant="candy"
        >
          Iniciar voz
        </SmoothButton>
        <SmoothButton
          className="min-h-11 flex-1"
          color="neutral"
          disabled={!active}
          onClick={stop}
          shape="pill"
          size="lg"
          type="button"
          variant="outline"
        >
          Encerrar
        </SmoothButton>
      </div>

      <audio aria-hidden="true" autoPlay className="hidden" ref={audioRef} />
    </main>
  )
}
