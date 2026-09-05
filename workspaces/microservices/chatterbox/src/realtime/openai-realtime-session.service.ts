import { createHash, randomUUID } from 'node:crypto'

import type { MemorySearchResult } from '@repo/memory-sdk'
import WebSocket from 'ws'

import { createOpenAiRealtimeSession, hangUpOpenAiRealtimeCall } from '../model'
import type { AuthenticatedConversationContext } from '../session'
import type { RealtimeMemoryDependencies, RealtimeSessionStatus, RealtimeMemoryStatus } from './realtime-memory.contract'
import { mapOpenAiRealtimeUsage } from './openai-realtime-usage.map'

interface Session {
  readonly context: AuthenticatedConversationContext
  readonly handled: Set<string>
  readonly responseTurns: Map<string, number>
  callId?: string
  socket?: WebSocket
  closed: boolean
  ready: boolean
  generation: number
  pending: number
  chain: Promise<void>
  memory: RealtimeMemoryStatus
  acceptedCount: number | null
  lastHeartbeat: number
  timer?: ReturnType<typeof setInterval>
}

interface RealtimeServiceOptions {
  readonly apiKey: string
  readonly model: string
  readonly voice: string
  readonly transcriptionModel: string
  readonly timeoutMs: number
  readonly maxSessions?: number
  readonly memory?: RealtimeMemoryDependencies
  readonly recall?: (context: AuthenticatedConversationContext, query: string) => Promise<MemorySearchResult>
}

/** Owns provider calls and trusted sidebands; no browser message becomes Memory evidence. */
export class OpenAiRealtimeSessionService {
  readonly #options: RealtimeServiceOptions
  readonly #sessions = new Map<string, Session>()
  #closing = false

  constructor(options: RealtimeServiceOptions) {
    this.#options = options
  }

  async start(context: AuthenticatedConversationContext, sdp: string): Promise<string> {
    if (this.#closing || context.expiresAtMs <= Date.now() || this.#sessions.size >= (this.#options.maxSessions ?? 2))
      throw new Error('Realtime session unavailable')
    if ([...this.#sessions.values()].some((session) => session.context.subjectId === context.subjectId && session.context.tenantId === context.tenantId))
      throw new Error('A realtime session is already active')
    const session: Session = { context, handled: new Set(), responseTurns: new Map(), closed: false,
      ready: false, generation: 0, pending: 0, chain: Promise.resolve(), memory: 'idle', acceptedCount: null, lastHeartbeat: Date.now() }
    this.#sessions.set(context.conversationId, session)
    session.timer = setInterval(() => {
      if (Date.now() >= context.expiresAtMs || Date.now() - session.lastHeartbeat > 35_000)
        void this.#stop(session)
    }, 5_000)
    session.timer.unref()
    try {
      const call = await createOpenAiRealtimeSession({ apiKey: this.#options.apiKey, sdp,
        model: this.#options.model, voice: this.#options.voice,
        transcriptionModel: this.#options.transcriptionModel, memoryEnabled: this.#options.memory !== undefined,
        timeoutMs: this.#options.timeoutMs })
      session.callId = call.callId
      if (session.closed) {
        await hangUpOpenAiRealtimeCall({ apiKey: this.#options.apiKey, callId: call.callId })
        throw new Error('Realtime session stopped')
      }
      await this.#connect(session)
      if (session.closed || Date.now() >= context.expiresAtMs) throw new Error('Realtime session expired')
      session.ready = true
      return call.answerSdp
    } catch {
      await this.#stop(session)
      throw new Error('Realtime session unavailable')
    }
  }

  status(context: AuthenticatedConversationContext): RealtimeSessionStatus {
    const session = this.#owned(context)
    if (session === undefined) return { state: 'stopped', memory: { status: 'idle', acceptedCount: null }, expiresAtMs: context.expiresAtMs }
    session.lastHeartbeat = Date.now()
    return { state: session.ready ? 'active' : 'unavailable', memory: { status: session.memory, acceptedCount: session.acceptedCount }, expiresAtMs: session.context.expiresAtMs }
  }

  async stop(context: AuthenticatedConversationContext): Promise<void> {
    const session = this.#owned(context)
    if (session !== undefined) await this.#stop(session)
  }

  async close(): Promise<void> {
    this.#closing = true
    await Promise.allSettled([...this.#sessions.values()].map((session) => this.#stop(session)))
  }

  #owned(context: AuthenticatedConversationContext): Session | undefined {
    const session = this.#sessions.get(context.conversationId)
    return session !== undefined && session.context.tenantId === context.tenantId && session.context.subjectId === context.subjectId && session.context.actorId === context.actorId && session.context.authenticationSessionId === context.authenticationSessionId ? session : undefined
  }

  async #connect(session: Session): Promise<void> {
    const socket = new WebSocket(`wss://api.openai.com/v1/realtime?call_id=${encodeURIComponent(session.callId!)}`, {
      headers: { Authorization: `Bearer ${this.#options.apiKey}` }, handshakeTimeout: Math.min(this.#options.timeoutMs, 10_000), maxPayload: 256 * 1024
    })
    session.socket = socket
    socket.on('message', (raw) => {
      let event: Record<string, unknown>
      try { event = JSON.parse(raw.toString()) as Record<string, unknown> } catch { return }
      if (event === null || typeof event !== 'object' || session.closed) return
      if (event.type === 'input_audio_buffer.speech_started') session.generation += 1
      if (event.type === 'response.created') {
        const id = object(event.response).id
        if (typeof id === 'string') {
          session.responseTurns.set(id, session.generation)
          if (session.responseTurns.size > 128) session.responseTurns.delete(session.responseTurns.keys().next().value!)
        }
      }
      if (!['conversation.item.input_audio_transcription.completed', 'response.function_call_arguments.done', 'response.done', 'error'].includes(String(event.type))) return
      if (event.type === 'error' || session.pending >= 32) { void this.#stop(session); return }
      const generation = session.generation
      session.pending += 1
      session.chain = session.chain.then(() => this.#event(session, event, generation)).catch(() => {
        session.memory = 'unconfirmed'
      }).finally(() => { session.pending -= 1 })
    })
    socket.on('close', () => { void this.#stop(session) })
    socket.on('error', () => { void this.#stop(session) })
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Realtime sideband unavailable')), Math.min(this.#options.timeoutMs, 10_000))
      timer.unref()
      socket.once('open', () => { clearTimeout(timer); resolve() })
      socket.once('error', () => { clearTimeout(timer); reject(new Error('Realtime sideband unavailable')) })
      socket.once('close', () => { clearTimeout(timer); reject(new Error('Realtime sideband unavailable')) })
    })
  }

  async #event(session: Session, event: Record<string, unknown>, generation: number): Promise<void> {
    if (Date.now() >= session.context.expiresAtMs) return
    const context = Object.freeze({ ...session.context, asOf: new Date().toISOString(), requestId: randomUUID() })
    const memory = this.#options.memory
    if (event.type === 'response.done') {
      const response = object(event.response)
      if (typeof response.id !== 'string' || !safeId(response.id) || this.#seen(session, `usage:${response.id}`) || memory === undefined) return
      const ledger = memory.usageLedgerForRequest(context)
      if (ledger !== null) await ledger.append(mapOpenAiRealtimeUsage({ scope: memory.createScope(context), responseId: response.id, model: this.#options.model, usage: response.usage, occurredAt: context.asOf }))
      return
    }
    if (session.closed) return
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      if (memory === undefined || typeof event.item_id !== 'string' || !safeId(event.item_id) || typeof event.transcript !== 'string' || event.transcript.length > 4_000 || event.transcript.trim().length === 0) return
      const id = `realtime:${createHash('sha256').update(JSON.stringify([session.callId, event.item_id, typeof event.content_index === 'number' ? event.content_index : 0])).digest('hex')}`
      if (this.#seen(session, `transcript:${id}`)) return
      const result = await memory.ingest({ context, message: event.transcript, sourceTurnId: id })
      if (!session.closed) session.memory = result === 'committed' ? 'queued' : result === 'duplicate' ? session.memory : result
      return
    }
    if (event.type !== 'response.function_call_arguments.done' || event.name !== 'memory_search' || typeof event.call_id !== 'string' || !safeId(event.call_id) || this.#seen(session, `tool:${event.call_id}`)) return
    const responseGeneration = typeof event.response_id === 'string' ? session.responseTurns.get(event.response_id) ?? generation : generation
    if (responseGeneration !== session.generation) return
    let result: Record<string, unknown> = { status: 'unavailable', trust: 'untrusted-memory-data', items: [] }
    try {
      const argumentsValue = typeof event.arguments === 'string' && event.arguments.length <= 8_192 ? object(JSON.parse(event.arguments)) : {}
      if (memory !== undefined && typeof argumentsValue.query === 'string' && argumentsValue.query.trim().length > 0 && argumentsValue.query.length <= 4_000) {
        const client = memory.createMemoryClient(context)
        const search = this.#options.recall === undefined
          ? await client.search({ query: argumentsValue.query, asOf: context.asOf, purpose: 'conversation.support', tokenBudget: 600 })
          : await this.#options.recall(context, argumentsValue.query)
        const consent = await client.getConsent()
        const allowed = consent.entries.some((entry) => entry.purpose === 'conversation.support' && entry.status === 'granted') && search.governance.consentVersion === consent.version
        if (allowed) {
          result = { status: 'available', trust: 'untrusted-memory-data', items: search.items.map((item) => item.context), tokenBudget: search.tokenBudget }
          session.acceptedCount = search.items.length
          if (search.items.length > 0) session.memory = 'accepted'
        } else result.status = 'consent-required'
      }
    } catch { result.status = 'unavailable' }
    if (session.closed || session.generation !== responseGeneration || Date.now() >= context.expiresAtMs) return
    this.#send(session, { type: 'conversation.item.create', item: { type: 'function_call_output', call_id: event.call_id, output: JSON.stringify(result) } })
    this.#send(session, { type: 'response.create' })
  }

  #send(session: Session, event: Record<string, unknown>): void {
    if (!session.closed && session.socket?.readyState === WebSocket.OPEN) session.socket.send(JSON.stringify(event))
  }

  #seen(session: Session, key: string): boolean {
    if (session.handled.has(key)) return true
    session.handled.add(key)
    if (session.handled.size > 512) session.handled.delete(session.handled.values().next().value!)
    return false
  }

  async #stop(session: Session): Promise<void> {
    if (session.closed) return
    session.closed = true
    session.ready = false
    session.generation += 1
    if (session.timer !== undefined) clearInterval(session.timer)
    session.socket?.terminate()
    if (this.#sessions.get(session.context.conversationId) === session) this.#sessions.delete(session.context.conversationId)
    if (session.callId !== undefined) {
      try { await hangUpOpenAiRealtimeCall({ apiKey: this.#options.apiKey, callId: session.callId }) } catch {
        // The browser independently closes its peer; the local call is fenced immediately.
      }
    }
  }
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function safeId(value: string): boolean { return /^[A-Za-z0-9_-]{1,160}$/.test(value) }
