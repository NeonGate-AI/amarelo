import { MoonStars, Sun, X } from '@phosphor-icons/react'
import { AgentOrb, agentOrbPresets } from '@repo/react/ui/agent-orb'
import { SmoothButton } from '@repo/react/ui/smooth-button'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

import {
  advanceSpeakingCaptionAtom,
  captionAtom,
  endConversationAtom,
  experienceStateAtom,
  orbStateAtom,
  resolvedThemeAtom,
  restartConversationAtom,
  statusLabelAtom,
  toggleThemeAtom
} from '../state'
import { Caption } from './caption'
import { VolumeControls } from './volume-controls'

const THEME_BUTTON_ID = 'conversation-theme-button'
const RESTART_BUTTON_ID = 'conversation-restart-button'
const SPEAKING_CAPTION_INTERVAL_MS = 6000

function ThemeButton() {
  const theme = useAtomValue(resolvedThemeAtom)
  const toggleTheme = useSetAtom(toggleThemeAtom)
  const nextThemeLabel = theme === 'light' ? 'escuro' : 'claro'

  return (
    <SmoothButton
      aria-label={`Ativar tema ${nextThemeLabel}`}
      className="size-12 rounded-full border-border bg-[color-mix(in_srgb,var(--card)_76%,transparent)] text-foreground shadow-none backdrop-blur-md"
      color="neutral"
      id={THEME_BUTTON_ID}
      onClick={toggleTheme}
      shape="pill"
      size="icon-lg"
      variant="outline"
    >
      {theme === 'light' ? (
        <Sun aria-hidden="true" size={24} weight="regular" />
      ) : (
        <MoonStars aria-hidden="true" size={23} weight="regular" />
      )}
    </SmoothButton>
  )
}

function EndConversationButton() {
  const endConversation = useSetAtom(endConversationAtom)

  return (
    <SmoothButton
      aria-label="Encerrar conversa"
      className="size-12 rounded-full border-border bg-[color-mix(in_srgb,var(--card)_76%,transparent)] text-foreground shadow-none backdrop-blur-md"
      color="neutral"
      onClick={endConversation}
      shape="pill"
      size="icon-lg"
      variant="outline"
    >
      <X aria-hidden="true" size={25} weight="regular" />
    </SmoothButton>
  )
}

function EndedState() {
  const restartConversation = useSetAtom(restartConversationAtom)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#${RESTART_BUTTON_ID}`)?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  const handleRestart = useCallback(() => {
    restartConversation()
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#${THEME_BUTTON_ID}`)?.focus()
    })
  }, [restartConversation])

  return (
    <main className="mobile-shell grid min-h-[100dvh] w-full grid-rows-[auto_1fr] bg-background text-foreground">
      <header className="flex justify-start">
        <ThemeButton />
      </header>
      <section className="mx-auto flex w-full max-w-sm flex-col items-center justify-center px-4 pb-20 text-center">
        <div aria-atomic="true" aria-live="polite" className="sr-only">
          Conversa encerrada. Esta demonstração terminou.
        </div>
        <div
          aria-hidden="true"
          className="mb-8 grid size-24 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff084,#fad715_48%,#a18200)] shadow-[0_1.5rem_4rem_rgb(43_34_0_/_18%)]"
        >
          <span className="size-3 rounded-full bg-[#1D1C1A]" />
        </div>
        <h1 className="m-0 text-3xl leading-tight font-bold tracking-[-0.025em]">
          Conversa encerrada
        </h1>
        <p className="mt-3 mb-8 max-w-xs text-[0.9375rem] leading-6 text-muted-foreground">
          Esta demonstração terminou. Você pode recomeçar quando quiser.
        </p>
        <SmoothButton
          color="accent"
          id={RESTART_BUTTON_ID}
          onClick={handleRestart}
          shape="pill"
          size="lg"
          variant="candy"
        >
          Reiniciar conversa
        </SmoothButton>
      </section>
    </main>
  )
}

export function ConversationScreen() {
  const advanceSpeakingCaption = useSetAtom(advanceSpeakingCaptionAtom)
  const caption = useAtomValue(captionAtom)
  const experienceState = useAtomValue(experienceStateAtom)
  const orbState = useAtomValue(orbStateAtom)
  const statusLabel = useAtomValue(statusLabelAtom)

  useEffect(() => {
    if (experienceState !== 'speaking') {
      return
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        advanceSpeakingCaption()
      }
    }, SPEAKING_CAPTION_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [advanceSpeakingCaption, experienceState])

  if (experienceState === 'ended' || caption === null || orbState === null) {
    return <EndedState />
  }

  return (
    <main className="mobile-shell grid min-h-[100dvh] w-full grid-rows-[7.875rem_minmax(0,1fr)_auto_minmax(0,1fr)_auto] bg-background text-foreground">
      <header className="relative z-10 col-start-1 row-start-1 flex items-center justify-between self-start">
        <ThemeButton />
        <EndConversationButton />
      </header>

      <section className="col-start-1 row-[1/3] self-center text-center">
        <h1 className="m-0 text-[2rem] leading-tight font-bold tracking-[-0.035em]">
          Ana
        </h1>
        <p
          aria-live="polite"
          className="mt-1.5 mb-0 text-[0.9375rem] leading-6 font-medium text-muted-foreground"
        >
          {statusLabel}
        </p>
      </section>

      <section className="col-start-1 row-start-3 flex min-h-0 flex-col items-center">
        <div aria-hidden="true">
          <div
            className="orb-stage relative grid size-[clamp(12rem,28dvh,13.5rem)] place-items-center rounded-full"
            data-state={experienceState}
          >
            <AgentOrb
              preset={agentOrbPresets.ana}
              reducedMotion="system"
              size="clamp(10.5rem, 25dvh, 12rem)"
              speed={1}
              state={orbState}
            />
          </div>
        </div>

        <div className="mt-4 w-full max-w-[20rem] px-1">
          <Caption caption={caption} />
        </div>
      </section>

      <div className="col-start-1 row-start-5 pb-0.5">
        <VolumeControls />
      </div>
    </main>
  )
}
