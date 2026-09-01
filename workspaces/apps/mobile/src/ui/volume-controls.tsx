import {
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash
} from '@phosphor-icons/react'
import { SmoothButton } from '@repo/react/ui/smooth-button'
import { useAtomValue, useSetAtom } from 'jotai'
import type { CSSProperties, ReactNode } from 'react'

import {
  microphoneMutedAtom,
  setVolumeAtom,
  speakerMutedAtom,
  toggleConversationAudioAtom,
  volumeAtom
} from '../state/conversation-atoms'

interface ControlButtonProps {
  children: ReactNode
  label: string
  muted: boolean
  onClick: () => void
}

interface VolumeStyle extends CSSProperties {
  '--volume-progress': string
}

function ControlButton(props: ControlButtonProps) {
  const { children, label, muted, onClick } = props

  return (
    <SmoothButton
      aria-label={label}
      aria-pressed={muted}
      className="size-13 shrink-0 rounded-full shadow-none"
      color={muted ? 'destructive' : 'neutral'}
      onClick={onClick}
      shape="pill"
      size="icon-lg"
      variant={muted ? 'soft' : 'solid'}
    >
      {children}
    </SmoothButton>
  )
}

export function VolumeControls() {
  const microphoneMuted = useAtomValue(microphoneMutedAtom)
  const speakerMuted = useAtomValue(speakerMutedAtom)
  const volume = useAtomValue(volumeAtom)
  const setVolume = useSetAtom(setVolumeAtom)
  const toggleConversationAudio = useSetAtom(toggleConversationAudioAtom)
  const volumeStyle: VolumeStyle = { '--volume-progress': `${volume}%` }

  return (
    <section
      aria-label="Controles da conversa"
      className="grid min-h-23 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[2rem] border border-border bg-[color-mix(in_srgb,var(--card)_88%,transparent)] px-3.5 py-3 shadow-[0_1rem_3rem_rgb(43_34_0_/_8%)] backdrop-blur-md dark:shadow-[0_1rem_3rem_rgb(0_0_0_/_28%)]"
    >
      <ControlButton
        label="Silenciar microfone"
        muted={microphoneMuted}
        onClick={toggleConversationAudio}
      >
        {microphoneMuted ? (
          <MicrophoneSlash aria-hidden="true" size={24} weight="regular" />
        ) : (
          <Microphone aria-hidden="true" size={24} weight="regular" />
        )}
      </ControlButton>

      <div className="min-w-0">
        <label
          className="mb-2 block text-[0.6875rem] leading-none font-bold tracking-[0.12em] text-muted-foreground"
          htmlFor="ana-volume"
        >
          VOLUME
        </label>
        <input
          aria-valuetext={`${volume} por cento`}
          className="volume-slider block h-6 w-full cursor-pointer disabled:cursor-not-allowed"
          id="ana-volume"
          max={100}
          min={0}
          onChange={(event) => setVolume(event.currentTarget.valueAsNumber)}
          step={1}
          style={volumeStyle}
          type="range"
          value={volume}
        />
      </div>

      <ControlButton
        label="Silenciar som"
        muted={speakerMuted}
        onClick={toggleConversationAudio}
      >
        {speakerMuted ? (
          <SpeakerSlash aria-hidden="true" size={25} weight="regular" />
        ) : (
          <SpeakerHigh aria-hidden="true" size={25} weight="regular" />
        )}
      </ControlButton>
    </section>
  )
}
