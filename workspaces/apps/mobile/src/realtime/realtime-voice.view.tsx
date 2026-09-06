import { AgentOrb, agentOrbPresets } from '@repo/react/ui/agent-orb'
import { SmoothButton } from '@repo/react/ui/smooth-button'

import { useRealtimeVoice } from './session'

const MEMORY_LABELS = {
  idle: 'Memória ativada para esta conversa.',
  buffered: 'Suas palavras estão aguardando organização.',
  queued: 'Estamos organizando o que pode ser lembrado.',
  accepted: 'Memórias disponíveis para esta conversa.',
  skipped: 'Nenhuma nova memória foi confirmada.',
  unconfirmed: 'Ainda não foi possível confirmar o estado da memória.'
} as const

export function RealtimeVoiceView() {
  const {
    error,
    start,
    status,
    stop,
    transcript,
    phase,
    memoryEnabled,
    changeMemory,
    consentPending,
    memoryStatus,
    acceptedCount
  } = useRealtimeVoice()
  const active = status === 'connected' || status === 'connecting'
  const orbState = phase === 'thinking' ? 'listening' : phase
  const statusLabel =
    status === 'connecting'
      ? 'Conectando a conversa…'
      : status === 'error'
        ? 'Conversa interrompida'
        : status !== 'connected'
          ? 'Pronto para conversar'
          : phase === 'speaking'
            ? 'Ana está falando · você pode interromper'
            : phase === 'thinking'
              ? 'Ana está preparando uma resposta'
              : 'Estou ouvindo · fale normalmente'

  return (
    <main className="mobile-shell grid min-h-[100dvh] w-full grid-rows-[auto_1fr_auto] bg-background text-foreground">
      <header className="mx-auto w-full max-w-sm text-center">
        <p className="m-0 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Amarelo · conversa por voz
        </p>
        <h1 className="mt-2 mb-0 text-[2rem] leading-tight font-bold tracking-[-0.035em]">
          Ana
        </h1>
        <p
          aria-live="polite"
          className="mt-1.5 mb-0 text-sm font-medium text-muted-foreground"
        >
          {statusLabel}
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
        <p className="mt-6 mb-0 max-w-xs text-sm leading-6 text-muted-foreground">
          Fale no seu ritmo. Quando quiser interromper a Ana, é só começar a
          falar.
        </p>
        <p
          aria-live="polite"
          className="mt-5 mb-0 min-h-12 w-full max-w-sm text-base leading-6 text-foreground"
        >
          {transcript.length > 0
            ? transcript
            : 'A fala da Ana aparecerá aqui como legenda.'}
        </p>

        <div className="mt-6 w-full rounded-2xl border border-border bg-card p-4 text-left text-card-foreground">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={memoryEnabled}
              disabled={status === 'connecting' || consentPending}
              onChange={(event) => void changeMemory(event.target.checked)}
              aria-describedby="voice-memory-description voice-memory-status"
              className="size-5 shrink-0 accent-current"
            />
            Permitir que a Ana guarde e use memórias
          </label>
          <p
            id="voice-memory-description"
            className="mt-2 mb-0 text-sm leading-5 text-muted-foreground"
          >
            Com sua permissão, informações úteis do que você disser podem ser
            lembradas em outras conversas. Desativar interrompe novos registros
            e consultas; não apaga memórias anteriores.
          </p>
          <p
            id="voice-memory-status"
            aria-live="polite"
            className="mt-3 mb-0 text-sm leading-5"
          >
            {consentPending
              ? 'Confirmando sua escolha…'
              : !active
                ? memoryEnabled
                  ? 'Sua permissão será confirmada ao iniciar.'
                  : 'A conversa começará com memória desativada.'
                : !memoryEnabled
                  ? 'Memória desativada nesta conversa.'
                  : MEMORY_LABELS[memoryStatus]}
            {active &&
            memoryEnabled &&
            memoryStatus === 'accepted' &&
            acceptedCount !== null
              ? ` ${acceptedCount} ${acceptedCount === 1 ? 'memória encontrada' : 'memórias encontradas'}.`
              : ''}
          </p>
        </div>

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
          disabled={active || consentPending}
          onClick={() => void start()}
          shape="pill"
          size="lg"
          type="button"
          variant="candy"
        >
          Conversar com a Ana
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
    </main>
  )
}
