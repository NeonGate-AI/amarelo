import { useCallback, useEffect, useRef, useState } from 'react'

import {
  RealtimeSessionClient,
  type RealtimeMemoryStatus
} from './realtime-session.client'

export type RealtimeVoiceStatus = 'connected' | 'connecting' | 'error' | 'idle'
export type RealtimeVoicePhase = 'listening' | 'speaking' | 'thinking' | 'idle'

interface ActiveVoiceSession {
  readonly controller: AbortController
  readonly peer: RTCPeerConnection
  readonly audio: HTMLAudioElement
  conversationId: string | null
  microphone: MediaStream | null
  channel: RTCDataChannel | null
  pollTimer: ReturnType<typeof setTimeout> | null
  expiryTimer: ReturnType<typeof setTimeout> | null
  connectionTimer: ReturnType<typeof setTimeout> | null
  playing: boolean
  responseId: string | null
  interruptedResponseId: string | null
}

function eventRecord(data: unknown): Record<string, unknown> | null {
  if (typeof data !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(data)
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function useRealtimeVoice() {
  const clientRef = useRef(new RealtimeSessionClient())
  const activeRef = useRef<ActiveVoiceSession | null>(null)
  const consentBusyRef = useRef(false)
  const memoryEnabledRef = useRef(false)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [consentPending, setConsentPending] = useState(false)
  const [memoryStatus, setMemoryStatus] = useState<RealtimeMemoryStatus>('idle')
  const [acceptedCount, setAcceptedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<RealtimeVoiceStatus>('idle')
  const [phase, setPhase] = useState<RealtimeVoicePhase>('idle')
  const [transcript, setTranscript] = useState('')

  const cleanup = useCallback(() => {
    const active = activeRef.current
    if (active === null) return
    activeRef.current = null
    active.controller.abort()
    if (active.pollTimer !== null) clearTimeout(active.pollTimer)
    if (active.expiryTimer !== null) clearTimeout(active.expiryTimer)
    if (active.connectionTimer !== null) clearTimeout(active.connectionTimer)
    active.channel?.close()
    active.microphone?.getTracks().forEach((track) => {
      track.stop()
    })
    active.peer.close()
    active.audio.pause()
    active.audio.srcObject = null
    if (active.conversationId !== null) {
      // The browser closes immediately; the server has its own expiry fence.
      void clientRef.current.stop(active.conversationId).catch(() => {
        if (activeRef.current === null && !document.hidden) {
          setError(
            'Seu microfone foi desligado. O encerramento no servidor não foi confirmado.'
          )
        }
      })
    }
  }, [])

  const fail = useCallback(
    (message: string) => {
      cleanup()
      setError(message)
      setStatus('error')
      setPhase('idle')
      setTranscript('')
    },
    [cleanup]
  )

  const stop = useCallback(() => {
    cleanup()
    setError(null)
    setStatus('idle')
    setPhase('idle')
    setTranscript('')
    setMemoryStatus('idle')
    setAcceptedCount(null)
  }, [cleanup])

  const changeMemory = useCallback(
    async (enabled: boolean) => {
      if (consentBusyRef.current) return
      const active = activeRef.current
      if (active === null) {
        memoryEnabledRef.current = enabled
        setMemoryEnabled(enabled)
        setMemoryStatus('idle')
        return
      }
      if (active.conversationId === null) return
      consentBusyRef.current = true
      setConsentPending(true)
      // Do not capture more speech while a revocation is being acknowledged.
      if (!enabled)
        active.microphone?.getTracks().forEach((track) => {
          track.enabled = false
        })
      try {
        await clientRef.current.consent(
          active.conversationId,
          enabled,
          active.controller.signal
        )
        if (activeRef.current !== active) return
        memoryEnabledRef.current = enabled
        setMemoryEnabled(enabled)
        setMemoryStatus('idle')
        setAcceptedCount(null)
        active.microphone?.getTracks().forEach((track) => {
          track.enabled = true
        })
      } catch {
        if (activeRef.current !== active) return
        setMemoryStatus('unconfirmed')
        fail(
          'Não foi possível confirmar sua escolha de memória. A conversa foi encerrada.'
        )
      } finally {
        consentBusyRef.current = false
        setConsentPending(false)
      }
    },
    [fail]
  )

  const start = useCallback(async () => {
    if (activeRef.current !== null) return
    setError(null)
    setStatus('connecting')
    setPhase('idle')
    setTranscript('')
    setMemoryStatus('idle')
    setAcceptedCount(null)

    let active: ActiveVoiceSession | null = null
    let failureMessage =
      'Não foi possível iniciar a conversa. Confira a conexão e a configuração de voz.'
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone unavailable')
      }
      const peer = new RTCPeerConnection()
      const audio = document.createElement('audio')
      audio.autoplay = true
      active = {
        controller: new AbortController(),
        peer,
        audio,
        conversationId: null,
        microphone: null,
        channel: null,
        pollTimer: null,
        expiryTimer: null,
        connectionTimer: null,
        playing: false,
        responseId: null,
        interruptedResponseId: null
      }
      const session = active
      activeRef.current = session
      const isCurrent = () => activeRef.current === session
      session.connectionTimer = setTimeout(() => {
        if (isCurrent())
          fail('A conexão demorou demais. Tente iniciar novamente.')
      }, 60_000)

      const conversation = await clientRef.current.create(
        session.controller.signal
      )
      session.conversationId = conversation.conversationId
      if (!isCurrent()) {
        void clientRef.current.stop(conversation.conversationId).catch(() => {})
        return
      }
      session.expiryTimer = setTimeout(
        () => {
          if (isCurrent())
            fail('Esta conversa expirou. Você pode iniciar outra.')
        },
        Math.max(0, Date.parse(conversation.expiresAt) - Date.now())
      )

      failureMessage =
        'Não foi possível confirmar a memória. Confira a configuração do serviço e tente novamente.'
      await clientRef.current.consent(
        conversation.conversationId,
        memoryEnabledRef.current,
        session.controller.signal
      )
      if (!isCurrent()) return

      failureMessage = 'Permita o acesso ao microfone para conversar com a Ana.'
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      if (!isCurrent()) {
        microphone.getTracks().forEach((track) => {
          track.stop()
        })
        return
      }
      session.microphone = microphone
      for (const track of microphone.getAudioTracks())
        peer.addTrack(track, microphone)
      peer.addEventListener('track', (event) => {
        if (!isCurrent()) return
        const stream = event.streams.at(0)
        if (stream) {
          audio.srcObject = stream
          void audio.play().catch(() => {
            if (isCurrent())
              fail(
                'O navegador bloqueou o áudio. Inicie a conversa novamente para ouvir a Ana.'
              )
          })
        }
      })
      peer.addEventListener('connectionstatechange', () => {
        if (
          isCurrent() &&
          ['failed', 'disconnected', 'closed'].includes(peer.connectionState)
        ) {
          fail(
            'A conexão de voz foi interrompida. Você pode iniciar outra conversa.'
          )
        }
      })

      const channel = peer.createDataChannel('oai-events')
      session.channel = channel
      channel.addEventListener('message', (message) => {
        if (!isCurrent()) return
        const event = eventRecord(message.data)
        if (!event) return
        // The channel supplies captions and playback state only. The server owns
        // tools, instructions and authoritative finalized patient evidence.
        switch (event.type) {
          case 'input_audio_buffer.speech_started':
            setPhase('listening')
            setTranscript('')
            session.interruptedResponseId = session.responseId
            if (session.playing && channel.readyState === 'open') {
              channel.send(
                JSON.stringify({ type: 'output_audio_buffer.clear' })
              )
            }
            session.playing = false
            break
          case 'input_audio_buffer.speech_stopped':
            setPhase('thinking')
            setTranscript('')
            break
          case 'response.created': {
            const response = event.response
            session.responseId =
              typeof response === 'object' &&
              response !== null &&
              'id' in response &&
              typeof response.id === 'string'
                ? response.id
                : null
            setPhase('thinking')
            setTranscript('')
            break
          }
          case 'output_audio_buffer.started':
            session.playing = true
            setPhase('speaking')
            break
          case 'output_audio_buffer.stopped':
          case 'output_audio_buffer.cleared':
            session.playing = false
            setPhase('listening')
            break
          case 'response.output_audio_transcript.delta':
            if (event.response_id === session.interruptedResponseId) break
            if (typeof event.delta === 'string')
              setTranscript((current) => current + event.delta)
            break
          case 'response.output_audio_transcript.done':
            if (event.response_id === session.interruptedResponseId) break
            if (typeof event.transcript === 'string')
              setTranscript(event.transcript)
            break
          case 'error':
            fail(
              'A conversa encontrou um problema. Inicie novamente para continuar.'
            )
            break
        }
      })
      channel.addEventListener('close', () => {
        if (isCurrent()) fail('A sessão de voz foi encerrada.')
      })
      channel.addEventListener('open', () => {
        if (!isCurrent()) return
        if (session.connectionTimer !== null)
          clearTimeout(session.connectionTimer)
        setStatus('connected')
        setPhase('listening')
        const poll = async () => {
          if (!isCurrent()) return
          try {
            const result = await clientRef.current.status(
              conversation.conversationId,
              session.controller.signal
            )
            if (!isCurrent()) return
            if (
              result.state !== 'active' ||
              result.expiresAtMs === null ||
              result.expiresAtMs <= Date.now()
            ) {
              fail('Esta conversa foi encerrada. Você pode iniciar outra.')
              return
            }
            setMemoryStatus(result.memory.status)
            setAcceptedCount(result.memory.acceptedCount)
          } catch {
            if (!isCurrent()) return
            // An unavailable status never means memory has been saved.
            setMemoryStatus('unconfirmed')
          }
          if (isCurrent())
            session.pollTimer = setTimeout(() => void poll(), 10_000)
        }
        session.pollTimer = setTimeout(() => void poll(), 10_000)
      })

      failureMessage =
        'Não foi possível conectar a voz. Confira a configuração da OpenAI e tente novamente.'
      const offer = await peer.createOffer()
      if (!isCurrent()) return
      await peer.setLocalDescription(offer)
      if (!isCurrent()) return
      if (!offer.sdp?.trim()) throw new Error('Empty SDP offer')
      const answer = await clientRef.current.exchange(
        conversation.conversationId,
        offer.sdp,
        session.controller.signal
      )
      if (!isCurrent()) return
      await peer.setRemoteDescription({ sdp: answer, type: 'answer' })
    } catch {
      if (active !== null && activeRef.current !== active) return
      fail(failureMessage)
    }
  }, [fail])

  useEffect(() => {
    const onPageHide = () => cleanup()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      cleanup()
    }
  }, [cleanup])

  return {
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
  }
}
