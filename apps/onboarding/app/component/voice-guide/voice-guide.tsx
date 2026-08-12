'use client'

import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { SmoothButton } from '@repo/react-web/vendors/smoothui'
import { useEffect, useRef } from 'react'

import {
  type VoicePlaybackState,
  useVoiceGuide
} from '@component/voice-guide/use-voice-guide'

import styles from '@component/voice-guide/voice-guide.module.css'

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
    <div className={`${styles.guide} ${compact ? styles.compact : ''}`}>
      <div aria-live="polite" className={styles.status}>
        <span
          aria-hidden="true"
          className={`${styles.statusDot} ${styles[playbackState]}`}
        />
        {statusLabel}
      </div>
      <div className={styles.actions}>
        <SmoothButton
          className={styles.listenButton}
          disabled={!isEnabled || playbackState === 'loading'}
          type="button"
          variant="outline"
          onClick={() => speak(text)}
        >
          <SpeakerHigh aria-hidden="true" size={17} weight="fill" />
          {playbackState === 'speaking' ? 'Repetir' : 'Ouvir pergunta'}
        </SmoothButton>
        <button
          aria-label={isEnabled ? 'Desativar voz' : 'Ativar voz'}
          aria-pressed={!isEnabled}
          className={styles.muteButton}
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
    return 'Amarelo está falando'
  }

  return 'Voz disponível'
}
