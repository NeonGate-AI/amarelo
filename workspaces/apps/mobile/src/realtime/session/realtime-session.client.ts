import { ConversationClient } from '@repo/conversation-sdk'

export type RealtimeMemoryStatus =
  | 'idle'
  | 'buffered'
  | 'queued'
  | 'accepted'
  | 'skipped'
  | 'unconfirmed'

interface RealtimeSessionStatus {
  readonly state: 'active' | 'stopped' | 'unavailable'
  readonly expiresAtMs: number | null
  readonly memory: {
    readonly status: RealtimeMemoryStatus
    readonly acceptedCount: number | null
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid voice response')
  }
  return value as Record<string, unknown>
}

async function post(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/v1/${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'error',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000)
  })
  if (!response.ok) throw new Error('Voice request unavailable')
  return record(record(await response.json()).data)
}

export class RealtimeSessionClient {
  readonly #conversation = new ConversationClient({ baseUrl: '/api' })

  create(signal: AbortSignal) {
    return this.#conversation.session({ signal })
  }

  async consent(
    conversationId: string,
    enabled: boolean,
    signal: AbortSignal
  ): Promise<void> {
    const state = await post(
      'development/memory',
      { conversationId, operation: 'get-consent' },
      signal
    )
    if (
      typeof state.version !== 'number' ||
      !Number.isSafeInteger(state.version) ||
      state.version < 1 ||
      !Array.isArray(state.entries)
    ) {
      throw new Error('Memory consent unavailable')
    }
    const status = enabled ? 'granted' : 'revoked'
    const existing = state.entries
      .map(record)
      .find((entry) => entry.purpose === 'conversation.support')
    if (existing?.status === status || (!enabled && !existing)) return

    const result = await post(
      'development/memory',
      {
        conversationId,
        operation: 'update-consent',
        input: {
          expectedVersion: state.version,
          changes: [
            {
              purpose: 'conversation.support',
              status,
              policyVersion: 'local-voice-memory-consent-v1'
            }
          ]
        }
      },
      signal
    )
    if (
      !Array.isArray(result.entries) ||
      !result.entries.some((entry) => {
        const value = record(entry)
        return (
          value.purpose === 'conversation.support' && value.status === status
        )
      })
    ) {
      throw new Error('Memory consent not confirmed')
    }
  }

  async exchange(
    conversationId: string,
    sdp: string,
    signal: AbortSignal
  ): Promise<string> {
    const response = await fetch('/api/v1/realtime/session', {
      method: 'POST',
      body: sdp,
      headers: {
        'content-type': 'application/sdp',
        'x-conversation-id': conversationId
      },
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)])
    })
    if (
      !response.ok ||
      response.headers.get('x-chatterbox-conversation-id') !== conversationId
    ) {
      throw new Error('Voice session unavailable')
    }
    const answer = await response.text()
    if (!answer.trim()) throw new Error('Voice answer unavailable')
    return answer
  }

  async status(
    conversationId: string,
    signal: AbortSignal
  ): Promise<RealtimeSessionStatus> {
    const result = await post('realtime/status', { conversationId }, signal)
    const memory = record(result.memory)
    const statuses: readonly string[] = [
      'idle',
      'buffered',
      'queued',
      'accepted',
      'skipped',
      'unconfirmed'
    ]
    if (
      !['active', 'stopped', 'unavailable'].includes(String(result.state)) ||
      !(
        result.expiresAtMs === null ||
        (typeof result.expiresAtMs === 'number' &&
          Number.isFinite(result.expiresAtMs))
      ) ||
      (result.state === 'active' && result.expiresAtMs === null) ||
      typeof memory.status !== 'string' ||
      !statuses.includes(memory.status) ||
      !(
        memory.acceptedCount === null ||
        (typeof memory.acceptedCount === 'number' &&
          Number.isSafeInteger(memory.acceptedCount) &&
          memory.acceptedCount >= 0)
      )
    ) {
      throw new Error('Voice status unavailable')
    }
    return {
      state: result.state as RealtimeSessionStatus['state'],
      expiresAtMs: result.expiresAtMs,
      memory: {
        status: memory.status as RealtimeMemoryStatus,
        acceptedCount: memory.acceptedCount as number | null
      }
    }
  }

  async stop(conversationId: string): Promise<void> {
    const response = await fetch('/api/v1/realtime/stop', {
      method: 'POST',
      body: JSON.stringify({ conversationId }),
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'error',
      keepalive: true,
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) throw new Error('Voice stop not confirmed')
  }
}
