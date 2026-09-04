import { useCallback, useEffect, useRef, useState } from 'react'

import { checkCalendarAvailability } from '../calendar'

export type RealtimeVoiceStatus =
  | 'connected'
  | 'connecting'
  | 'error'
  | 'idle'

const SESSION_ENDPOINT = '/api/v1/realtime/session'

const SESSION_UPDATE_EVENT = Object.freeze({
  session: {
    instructions:
      'Você é uma assistente de voz concisa. Use check_calendar quando a pessoa perguntar se uma data e horário estão disponíveis.',
    tool_choice: 'auto',
    tools: [
      {
        description:
          'Checks whether a requested date and time are available in the synthetic demo calendar.',
        name: 'check_calendar',
        parameters: {
          additionalProperties: false,
          properties: {
            date: {
              description: 'ISO date in YYYY-MM-DD format.',
              type: 'string'
            },
            time: {
              description: '24-hour time in HH:mm format.',
              type: 'string'
            }
          },
          required: ['date', 'time'],
          type: 'object'
        },
        type: 'function'
      }
    ],
    type: 'realtime'
  },
  type: 'session.update'
})

interface RealtimeFunctionCall {
  readonly arguments: string
  readonly callId: string
}

interface RealtimeTranscriptCallbacks {
  readonly append: (delta: string) => void
  readonly replace: (transcript: string) => void
  readonly reset: () => void
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function readCalendarFunctionCall(value: unknown): RealtimeFunctionCall | null {
  const item = asRecord(value)
  if (
    item?.type !== 'function_call' ||
    item.name !== 'check_calendar' ||
    typeof item.call_id !== 'string' ||
    typeof item.arguments !== 'string'
  ) {
    return null
  }

  return {
    arguments: item.arguments,
    callId: item.call_id
  }
}

function executeCalendarFunctionCall(
  channel: RTCDataChannel,
  call: RealtimeFunctionCall
): void {
  let date = ''
  let time = ''

  try {
    const parsed = asRecord(JSON.parse(call.arguments))
    date = typeof parsed?.date === 'string' ? parsed.date : ''
    time = typeof parsed?.time === 'string' ? parsed.time : ''
  } catch {
    // Malformed tool arguments fail closed to unavailable synthetic output.
  }

  const result = checkCalendarAvailability(date, time)
  channel.send(
    JSON.stringify({
      item: {
        call_id: call.callId,
        output: JSON.stringify(result),
        type: 'function_call_output'
      },
      type: 'conversation.item.create'
    })
  )
}

function handleRealtimeEvent(
  channel: RTCDataChannel,
  data: unknown,
  transcript: RealtimeTranscriptCallbacks
): void {
  if (typeof data !== 'string') return

  let event: Record<string, unknown> | null = null
  try {
    event = asRecord(JSON.parse(data))
  } catch {
    return
  }

  if (event?.type === 'response.created') {
    transcript.reset()
    return
  }

  if (
    event?.type === 'response.output_audio_transcript.delta' &&
    typeof event.delta === 'string'
  ) {
    transcript.append(event.delta)
    return
  }

  if (
    event?.type === 'response.output_audio_transcript.done' &&
    typeof event.transcript === 'string'
  ) {
    transcript.replace(event.transcript)
    return
  }

  if (event?.type !== 'response.done') return

  const response = asRecord(event.response)
  const output = Array.isArray(response?.output) ? response.output : []
  let handledFunctionCall = false

  for (const item of output) {
    const call = readCalendarFunctionCall(item)
    if (call === null) continue
    executeCalendarFunctionCall(channel, call)
    handledFunctionCall = true
  }

  if (handledFunctionCall) {
    channel.send(JSON.stringify({ type: 'response.create' }))
  }
}

export function useRealtimeVoice() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const channelRef = useRef<RTCDataChannel | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<RealtimeVoiceStatus>('idle')
  const [transcript, setTranscript] = useState('')

  const cleanup = useCallback(() => {
    channelRef.current?.close()
    channelRef.current = null

    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop())
    microphoneStreamRef.current = null

    peerConnectionRef.current?.close()
    peerConnectionRef.current = null

    if (audioRef.current !== null) {
      audioRef.current.srcObject = null
    }
  }, [])

  const fail = useCallback(
    (message: string) => {
      cleanup()
      setError(message)
      setStatus('error')
    },
    [cleanup]
  )

  const start = useCallback(async () => {
    if (peerConnectionRef.current !== null) return

    cleanup()
    setError(null)
    setStatus('connecting')
    setTranscript('')

    try {
      if (navigator.mediaDevices?.getUserMedia === undefined) {
        throw new Error('Microphone capture is unavailable.')
      }

      const peerConnection = new RTCPeerConnection()
      peerConnectionRef.current = peerConnection

      peerConnection.addEventListener('track', (event) => {
        const remoteStream = event.streams.at(0)
        if (audioRef.current !== null && remoteStream !== undefined) {
          audioRef.current.srcObject = remoteStream
        }
      })

      peerConnection.addEventListener('connectionstatechange', () => {
        if (peerConnection.connectionState === 'failed') {
          fail('A conexão de voz foi interrompida.')
        }
      })

      const microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })
      microphoneStreamRef.current = microphoneStream
      for (const track of microphoneStream.getAudioTracks()) {
        peerConnection.addTrack(track, microphoneStream)
      }

      const channel = peerConnection.createDataChannel('oai-events')
      channelRef.current = channel
      channel.addEventListener('message', (event) =>
        handleRealtimeEvent(channel, event.data, {
          append: (delta) => setTranscript((current) => current + delta),
          replace: setTranscript,
          reset: () => setTranscript('')
        })
      )
      channel.addEventListener('open', () => {
        try {
          channel.send(JSON.stringify(SESSION_UPDATE_EVENT))
          setStatus('connected')
        } catch {
          fail('Não foi possível configurar a sessão de voz.')
        }
      })

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      if (offer.sdp === undefined || offer.sdp.trim().length === 0) {
        throw new Error('WebRTC did not create an SDP offer.')
      }

      const sessionResponse = await fetch(SESSION_ENDPOINT, {
        body: offer.sdp,
        headers: {
          'Content-Type': 'application/sdp'
        },
        method: 'POST'
      })
      if (!sessionResponse.ok) {
        throw new Error('Realtime session exchange failed.')
      }

      const answerSdp = await sessionResponse.text()
      if (answerSdp.trim().length === 0) {
        throw new Error('Realtime session returned an empty SDP answer.')
      }

      await peerConnection.setRemoteDescription({
        sdp: answerSdp,
        type: 'answer'
      })
    } catch {
      fail('Não foi possível iniciar a conversa por voz.')
    }
  }, [cleanup, fail])

  const stop = useCallback(() => {
    cleanup()
    setError(null)
    setStatus('idle')
    setTranscript('')
  }, [cleanup])

  useEffect(() => cleanup, [cleanup])

  return {
    audioRef,
    error,
    start,
    status,
    stop,
    transcript
  }
}
