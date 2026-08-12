import { useCallback, useRef, useState } from 'react'
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioStreamBuffer,
  useAudioStream
} from 'expo-audio'

import { computeNormalizedAmplitude } from '@/features/voice/audio-level.compute'
import type { VoiceSessionState } from '@/features/voice/voice-session.type'

const LEVEL_UPDATE_INTERVAL_MS = 50
type VoiceRecoveryAction = 'retry' | 'settings'

export function useVoiceSession() {
  const [amplitude, setAmplitude] = useState(0)
  const [state, setState] = useState<VoiceSessionState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recoveryAction, setRecoveryAction] =
    useState<VoiceRecoveryAction>('retry')
  const lastLevelUpdate = useRef(0)

  const handleBuffer = useCallback((buffer: AudioStreamBuffer) => {
    const now = Date.now()

    if (now - lastLevelUpdate.current < LEVEL_UPDATE_INTERVAL_MS) {
      return
    }

    lastLevelUpdate.current = now
    setAmplitude(computeNormalizedAmplitude(buffer.data))
  }, [])

  const { stream } = useAudioStream({
    channels: 1,
    encoding: 'float32',
    onBuffer: handleBuffer,
    sampleRate: 16_000
  })

  const start = useCallback(async () => {
    if (stream.isStreaming) {
      return
    }

    setError(null)
    setRecoveryAction('retry')
    setState('idle')

    try {
      const permission = await requestRecordingPermissionsAsync()

      if (!permission.granted) {
        setState('error')
        setRecoveryAction(permission.canAskAgain ? 'retry' : 'settings')
        setError(
          'Precisamos do microfone para que o Orb responda à sua voz. Você pode liberar o acesso nos ajustes do aparelho.'
        )
        return
      }

      await setAudioModeAsync({
        allowsRecording: true,
        interruptionMode: 'doNotMix',
        playsInSilentMode: true
      })
      await stream.start()
      setState('listening')
    } catch {
      setState('error')
      setRecoveryAction('retry')
      setError(
        'Não foi possível iniciar o microfone. Verifique a permissão e tente novamente.'
      )
    }
  }, [stream])

  const stop = useCallback(() => {
    if (stream.isStreaming) {
      stream.stop()
    }

    setAmplitude(0)
    setState('idle')
    void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined)
  }, [stream])

  return {
    amplitude,
    error,
    recoveryAction,
    start,
    state,
    stop
  }
}
