'use client'

import {
  Microphone,
  MicrophoneSlash,
  MoonStars,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  X
} from '@phosphor-icons/react'
import Image from 'next/image'
import { type KeyboardEvent, useRef, useState } from 'react'

import { AgentOrb, type AgentOrbState } from '@repo/react/ui/agent-orb'
import { agentOrbPresets } from '@repo/react/ui/agent-orb'

type AppStateId = 'listening' | 'muted' | 'speaking'

interface AppState {
  caption: {
    accessible: string
    lines: readonly [string, string, string]
  }
  id: AppStateId
  label: string
  microphoneMuted: boolean
  note: string
  orbState: AgentOrbState
  status: string
  volume: number
}

const appStates: readonly AppState[] = [
  {
    caption: {
      accessible:
        'Como você está se sentindo neste momento? Quero entender o que tem passado pela sua cabeça.',
      lines: [
        'Como você está se sentindo',
        'neste momento? Quero entender',
        'o que tem passado pela sua cabeça.'
      ]
    },
    id: 'listening',
    label: 'Ouvindo',
    microphoneMuted: false,
    note: 'O Elo mostra quando Ana está ouvindo; a última fala dela continua visível.',
    orbState: 'listening',
    status: 'Ana está ouvindo você',
    volume: 68
  },
  {
    caption: {
      accessible:
        'Eu entendo. Vamos organizar isso juntos, começando pelo que parece mais urgente agora.',
      lines: [
        'Eu entendo. Vamos organizar isso',
        'juntos, começando pelo que parece',
        'mais urgente agora.'
      ]
    },
    id: 'speaking',
    label: 'Falando',
    microphoneMuted: false,
    note: 'Enquanto Ana fala, a legenda acessível e o volume permanecem ao alcance.',
    orbState: 'speaking',
    status: 'Ana está falando',
    volume: 68
  },
  {
    caption: {
      accessible:
        'Mesmo sem o áudio, você pode acompanhar a minha fala inteira pela transcrição desta conversa.',
      lines: [
        'Mesmo sem o áudio, você pode',
        'acompanhar a minha fala inteira',
        'pela transcrição desta conversa.'
      ]
    },
    id: 'muted',
    label: 'Silenciado',
    microphoneMuted: true,
    note: 'Mesmo sem som, a transcrição da fala de Ana permanece visível.',
    orbState: 'idle',
    status: 'Conversa silenciada',
    volume: 0
  }
]

export function AppStateShowcase() {
  const [activeId, setActiveId] = useState<AppStateId>(appStates[0].id)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const activeIndex = appStates.findIndex((state) => state.id === activeId)
  const activeState = appStates[activeIndex] ?? appStates[0]
  const isMuted = activeState.volume === 0

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = Number(event.currentTarget.dataset.index)
    let nextIndex = currentIndex

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % appStates.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + appStates.length) % appStates.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = appStates.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextState = appStates[nextIndex]
    setActiveId(nextState.id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="rounded-[2rem] border border-border bg-card p-3 shadow-[var(--shadow-card)] min-[40rem]:p-5">
      <div
        aria-label="Estados do aplicativo"
        className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1"
        role="tablist"
      >
        {appStates.map((state, index) => {
          const isActive = state.id === activeState.id

          return (
            <button
              aria-controls="app-state-panel"
              aria-selected={isActive}
              className="min-h-10 cursor-pointer rounded-full border-0 bg-transparent text-xs font-[650] text-muted-foreground [transition:color_160ms_ease,background-color_160ms_ease,box-shadow_160ms_ease] hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-[0_.15rem_.6rem_color-mix(in_srgb,var(--foreground)_10%,transparent)] motion-reduce:transition-none min-[40rem]:text-sm"
              data-index={index}
              id={`app-state-${state.id}`}
              key={state.id}
              onClick={() => setActiveId(state.id)}
              onKeyDown={handleKeyDown}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {state.label}
            </button>
          )
        })}
      </div>

      <div
        aria-labelledby={`app-state-${activeState.id}`}
        className="grid justify-items-center gap-3 px-2 pt-[1.1rem] pb-1"
        id="app-state-panel"
        role="tabpanel"
      >
        <div
          className="relative isolate aspect-[640/1280] w-[min(100%,18rem)] drop-shadow-[0_1.15rem_1.35rem_rgb(0_0_0_/_18%)]"
          data-app-state={activeState.id}
        >
          <div className="absolute z-1 grid overflow-hidden rounded-[2.45rem] px-[1.15rem] pt-[2.55rem] pb-4 text-foreground [inset:2.15%_5.8%_2.2%] [background:radial-gradient(circle_at_50%_34%,color-mix(in_srgb,var(--primary)_9%,transparent),transparent_36%),var(--background)] [grid-template-rows:auto_auto_minmax(11.25rem,1fr)_4.45rem_auto] [transition:color_220ms_ease,background-color_220ms_ease] motion-reduce:transition-none">
            <div
              aria-hidden="true"
              className="flex min-h-[2.4rem] items-center justify-between"
            >
              <span className="inline-grid size-9 place-items-center rounded-full border border-border bg-[color-mix(in_srgb,var(--card)_88%,transparent)] text-foreground">
                <Sun className="dark:hidden" size={18} />
                <MoonStars className="hidden dark:block" size={18} />
              </span>
              <span className="inline-grid size-9 place-items-center rounded-full border border-border bg-[color-mix(in_srgb,var(--card)_88%,transparent)] text-foreground">
                <X size={18} weight="bold" />
              </span>
            </div>

            <div className="grid justify-items-center gap-[.1rem] pt-[.1rem] text-center">
              <strong className="font-heading text-[1.55rem] tracking-[-.04em]">
                Ana
              </strong>
              <span className="text-[.7rem] font-[550] text-muted-foreground">
                {activeState.status}
              </span>
            </div>

            <div className="grid min-h-[11.25rem] place-items-center pt-1">
              <AgentOrb
                preset={agentOrbPresets.ana}
                size="9.25rem"
                speed={activeState.orbState === 'speaking' ? 0.85 : 1}
                state={activeState.orbState}
              />
            </div>

            <div className="grid min-h-[4.45rem] items-start justify-items-center px-1 pt-[.1rem]">
              <p className="m-0 block min-h-15 text-center text-[.69rem] leading-5 text-foreground">
                <span className="sr-only">
                  Transcrição da fala da Ana: {activeState.caption.accessible}
                </span>
                <span aria-hidden="true">
                  {activeState.caption.lines[0]}
                  <br />
                  {activeState.caption.lines[1]}
                  <br />
                  <span className="inline-block min-w-33 [mask-image:linear-gradient(90deg,#000_0_45%,transparent_100%)]">
                    {activeState.caption.lines[2]}
                  </span>
                </span>
              </p>
            </div>

            <div
              aria-hidden="true"
              className="grid min-h-[4.65rem] grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-[.65rem] rounded-[1.45rem] border border-border bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-[.65rem] shadow-[0_.55rem_1.6rem_color-mix(in_srgb,var(--foreground)_8%,transparent)]"
            >
              <span
                className={`inline-grid size-11 place-items-center rounded-full border border-border [transition:color_180ms_ease,background-color_180ms_ease] motion-reduce:transition-none ${activeState.microphoneMuted ? 'bg-[color-mix(in_srgb,var(--danger)_12%,var(--card))] text-danger' : 'bg-foreground text-background'}`}
              >
                {activeState.microphoneMuted ? (
                  <MicrophoneSlash size={20} weight="bold" />
                ) : (
                  <Microphone size={20} weight="bold" />
                )}
              </span>

              <div className="grid min-w-0 gap-[.35rem]">
                <span className="text-[.58rem] font-[650] tracking-[.08em] text-muted-foreground uppercase">
                  Volume
                </span>
                <span className="relative block h-[.28rem] rounded-full bg-muted">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-[inherit] bg-primary-hover [transition:width_220ms_ease] motion-reduce:transition-none ${isMuted ? 'w-0' : 'w-[68%]'}`}
                  />
                  <span
                    className={`absolute top-1/2 size-3 -translate-1/2 rounded-full border-2 border-card bg-primary shadow-[0_.1rem_.3rem_rgb(0_0_0_/_24%)] [transition:left_220ms_ease] motion-reduce:transition-none ${isMuted ? 'left-0' : 'left-[68%]'}`}
                  />
                </span>
              </div>

              <span
                className={`inline-grid size-11 place-items-center rounded-full border border-border [transition:color_180ms_ease,background-color_180ms_ease] motion-reduce:transition-none ${isMuted ? 'bg-[color-mix(in_srgb,var(--danger)_12%,var(--card))] text-danger' : 'bg-foreground text-background'}`}
              >
                {isMuted ? (
                  <SpeakerSlash size={20} weight="bold" />
                ) : (
                  <SpeakerHigh size={20} weight="bold" />
                )}
              </span>
            </div>

            <span className="sr-only" aria-live="polite">
              {activeState.status}. {activeState.note}
            </span>
          </div>

          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute z-2 object-fill select-none"
            draggable={false}
            fill
            sizes="18rem"
            src="/product/iphone-frame.png"
          />
        </div>

        <p className="m-0 max-w-md text-center text-xs leading-5 text-muted-foreground">
          {activeState.note}
        </p>
      </div>
    </div>
  )
}
