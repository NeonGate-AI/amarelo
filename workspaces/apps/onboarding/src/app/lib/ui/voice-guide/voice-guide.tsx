'use client'

import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { SmoothButton } from '@repo/react/vendors/smoothui'
import { useEffect, useRef } from 'react'

import {
  type VoicePlaybackState,
  useVoiceGuide
} from '@component/voice-guide/use-voice-guide'

interface VoiceGuideProps {
  autoSpeak?: boolean
  compact?: boolean
  onStateChange?: (state: VoicePlaybackState) => void
  text: string
}

export function VoiceGuide(props: VoiceGuideProps) {
  const { autoSpeak = false, compact = false, onStateChange, text } = props
  const { isEnabled, playbackState, speak, toggle } = useVoiceGuide({
    onStateChange
  })
  const previousTextRef = useRef('')

  useEffect(() => {
    if (
      autoSpeak &&
      previousTextRef.current &&
      previousTextRef.current !== text
    ) {
      void speak(text)
    }
    previousTextRef.current = text
  }, [autoSpeak, speak, text])

  const statusLabel = getStatusLabel(playbackState)

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 ${compact ? 'justify-start' : 'justify-between'}`}
    >
      <div
        aria-live="polite"
        className="inline-flex items-center gap-2 text-xs font-[650] text-muted-foreground"
      >
        <span
          aria-hidden="true"
          className={`size-[.48rem] rounded-full ${playbackState === 'idle' ? 'bg-muted-foreground' : 'bg-primary shadow-[0_0_0_.25rem_color-mix(in_srgb,var(--primary)_15%,transparent)]'} ${playbackState === 'speaking' ? 'animate-elo-voice-pulse' : ''}`}
        />
        {statusLabel}
      </div>
      <div className="flex items-center gap-[.45rem]">
        <SmoothButton
          className="min-h-[2.4rem] border-border px-[.85rem] text-foreground"
          disabled={!isEnabled || playbackState === 'loading'}
          type="button"
          variant="outline"
          onClick={() => speak(text)}
        >
          <SpeakerHigh aria-hidden="true" size={17} weight="fill" />
          {playbackState === 'speaking' ? 'Repetir' : 'Ouvir novamente'}
        </SmoothButton>
        <button
          aria-label={isEnabled ? 'Desativar voz' : 'Ativar voz'}
          aria-pressed={!isEnabled}
          className="grid size-[2.4rem] cursor-pointer place-items-center rounded-full border border-border bg-secondary p-0 text-muted-foreground hover:border-[color-mix(in_srgb,var(--foreground)_28%,var(--border))] hover:text-foreground"
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
    </div>
  )
}

function getStatusLabel(state: VoicePlaybackState): string {
  if (state === 'loading') {
    return 'Preparando a voz…'
  }

  if (state === 'speaking') {
    return 'Seu Elo está falando'
  }

  return 'Voz disponível'
}
