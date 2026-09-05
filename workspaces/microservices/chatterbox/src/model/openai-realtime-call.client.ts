const OPENAI_REALTIME_CALL_URL = 'https://api.openai.com/v1/realtime/calls'

const REALTIME_SESSION = JSON.stringify({
  audio: {
    output: {
      voice: 'marin'
    }
  },
  model: 'gpt-realtime-2',
  type: 'realtime'
})

export interface OpenAiRealtimeCallInput {
  readonly apiKey: string
  readonly fetchImplementation?: typeof fetch
  readonly sdp: string
  readonly timeoutMs?: number
}

export async function createOpenAiRealtimeCall(
  input: OpenAiRealtimeCallInput
): Promise<string> {
  const formData = new FormData()
  formData.set('sdp', input.sdp)
  formData.set('session', REALTIME_SESSION)

  const response = await (input.fetchImplementation ?? fetch)(
    OPENAI_REALTIME_CALL_URL,
    {
      body: formData,
      headers: {
        Authorization: `Bearer ${input.apiKey}`
      },
      method: 'POST',
      signal: AbortSignal.timeout(input.timeoutMs ?? 30_000)
    }
  )

  if (!response.ok) {
    throw new Error('OpenAI Realtime call failed.')
  }

  return response.text()
}
