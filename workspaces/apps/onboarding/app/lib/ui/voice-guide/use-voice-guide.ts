'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type VoicePlaybackState = 'idle' | 'loading' | 'speaking'

interface UseVoiceGuideOptions {
  onStateChange?: (state: VoicePlaybackState) => void
}

export function useVoiceGuide(options: UseVoiceGuideOptions = {}) {
  const { onStateChange } = options
  const [isEnabled, setIsEnabled] = useState(true)
  const [playbackState, setPlaybackState] = useState<VoicePlaybackState>('idle')
  const abortControllerRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const updatePlaybackState = useCallback(
    (state: VoicePlaybackState) => {
      setPlaybackState(state)
      onStateChange?.(state)
    },
    [onStateChange]
  )

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    audioRef.current?.pause()
    audioRef.current = null
    window.speechSynthesis?.cancel()

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    updatePlaybackState('idle')
  }, [updatePlaybackState])

  const speakWithBrowser = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window)) {
        updatePlaybackState('idle')
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const brazilianVoice = voices.find((voice) =>
        voice.lang.toLowerCase().startsWith('pt-br')
      )

      utterance.lang = 'pt-BR'
      utterance.rate = 0.96
      utterance.pitch = 1
      utterance.voice = brazilianVoice ?? null
      utterance.onend = () => updatePlaybackState('idle')
      utterance.onerror = () => updatePlaybackState('idle')
      updatePlaybackState('speaking')
      window.speechSynthesis.speak(utterance)
    },
    [updatePlaybackState]
  )

  const speak = useCallback(
    async (text: string) => {
      if (!isEnabled || !text.trim()) {
        return
      }

      stop()
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      updatePlaybackState('loading')

      try {
        const response = await fetch('/api/voice', {
          body: JSON.stringify({ text }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
          signal: abortController.signal
        })

        if (
          !response.ok ||
          response.headers.get('x-voice-source') === 'browser-fallback'
        ) {
          speakWithBrowser(text)
          return
        }

        const objectUrl = URL.createObjectURL(await response.blob())
        const audio = new Audio(objectUrl)
        objectUrlRef.current = objectUrl
        audioRef.current = audio
        audio.onended = stop
        audio.onerror = () => speakWithBrowser(text)
        updatePlaybackState('speaking')
        await audio.play()
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          speakWithBrowser(text)
        }
      }
    },
    [isEnabled, speakWithBrowser, stop, updatePlaybackState]
  )

  const toggle = useCallback(() => {
    if (isEnabled) {
      stop()
    }
    setIsEnabled((enabled) => !enabled)
  }, [isEnabled, stop])

  useEffect(() => stop, [stop])

  return {
    isEnabled,
    playbackState,
    speak,
    stop,
    toggle
  }
}
