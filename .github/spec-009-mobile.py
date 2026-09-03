from pathlib import Path
import json

files = {
    'workspaces/apps/mobile/src/conversation/conversation-session.event.ts': r"""
import type {
  ConversationClientErrorCode,
  ConversationTurnResponseData
} from '@repo/conversation-sdk'

export interface ConversationSessionFailure {
  readonly code: ConversationClientErrorCode
  readonly message: string
  readonly requestId: string
}

export type ConversationSessionEvent =
  | {
      readonly requestId: string
      readonly type: 'aborted'
    }
  | {
      readonly failure: ConversationSessionFailure
      readonly requestId: string
      readonly type: 'failed'
    }
  | {
      readonly requestId: string
      readonly type: 'pending'
    }
  | {
      readonly requestId: string
      readonly result: ConversationTurnResponseData
      readonly type: 'succeeded'
    }
""",
    'workspaces/apps/mobile/src/conversation/conversation-session.service.ts': r"""
import {
  ConversationClientError,
  type ConversationTurnRequest
} from '@repo/conversation-sdk'

import type { ConversationSessionEvent } from './conversation-session.event'

interface ConversationTurnClient {
  turn(
    input: ConversationTurnRequest,
    options?: { readonly signal?: AbortSignal }
  ): Promise<import('@repo/conversation-sdk').ConversationTurnResponseData>
}

interface ConversationSessionServiceOptions {
  readonly client: ConversationTurnClient
  readonly onEvent: (event: ConversationSessionEvent) => void
}

interface ActiveConversationRequest {
  readonly controller: AbortController
  readonly generation: number
  readonly requestId: string
}

const UNKNOWN_FAILURE_MESSAGE =
  'Não foi possível concluir este turno de desenvolvimento.'

export class ConversationSessionService {
  readonly #client: ConversationTurnClient
  readonly #onEvent: (event: ConversationSessionEvent) => void
  #active: ActiveConversationRequest | null = null
  #generation = 0

  constructor(options: ConversationSessionServiceOptions) {
    this.#client = options.client
    this.#onEvent = options.onEvent
  }

  async submit(input: ConversationTurnRequest): Promise<void> {
    this.cancel()

    const active = Object.freeze({
      controller: new AbortController(),
      generation: ++this.#generation,
      requestId: input.requestId
    })
    this.#active = active
    this.#onEvent({ requestId: active.requestId, type: 'pending' })

    try {
      const result = await this.#client.turn(input, {
        signal: active.controller.signal
      })
      if (!this.#isCurrent(active)) return

      this.#active = null
      this.#onEvent({
        requestId: active.requestId,
        result,
        type: 'succeeded'
      })
    } catch (error) {
      if (!this.#isCurrent(active)) return

      this.#active = null
      if (
        active.controller.signal.aborted ||
        (error instanceof ConversationClientError && error.code === 'aborted')
      ) {
        this.#onEvent({ requestId: active.requestId, type: 'aborted' })
        return
      }

      if (error instanceof ConversationClientError) {
        this.#onEvent({
          failure: {
            code: error.code,
            message: error.message,
            requestId: error.requestId ?? active.requestId
          },
          requestId: active.requestId,
          type: 'failed'
        })
        return
      }

      this.#onEvent({
        failure: {
          code: 'network_error',
          message: UNKNOWN_FAILURE_MESSAGE,
          requestId: active.requestId
        },
        requestId: active.requestId,
        type: 'failed'
      })
    }
  }

  cancel(options: { readonly notify?: boolean } = {}): void {
    const active = this.#active
    if (active === null) return

    this.#active = null
    this.#generation += 1
    active.controller.abort()
    if (options.notify ?? true) {
      this.#onEvent({ requestId: active.requestId, type: 'aborted' })
    }
  }

  dispose(): void {
    this.cancel({ notify: false })
  }

  #isCurrent(active: ActiveConversationRequest): boolean {
    return (
      this.#active?.generation === active.generation &&
      this.#active.requestId === active.requestId
    )
  }
}
""",
    'workspaces/apps/mobile/src/conversation/development-conversation.validate.ts': r"""
export type DevelopmentConversationConfiguration =
  | {
      readonly enabled: false
    }
  | {
      readonly baseUrl: string
      readonly enabled: true
    }

const DEFAULT_DEVELOPMENT_API_BASE_URL = '/api'

function validateBaseUrl(value: unknown): string {
  const candidate =
    typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : DEFAULT_DEVELOPMENT_API_BASE_URL

  if (candidate.startsWith('/') && !candidate.startsWith('//')) {
    return candidate
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    throw new TypeError('The development conversation API URL is invalid')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError(
      'The development conversation API URL must use HTTP or HTTPS'
    )
  }

  return parsed.toString().replace(/\/$/, '')
}

export function validateDevelopmentConversationConfiguration(
  environment: Readonly<Record<string, unknown>>
): DevelopmentConversationConfiguration {
  if (environment.VITE_AMARELO_TEXT_DRIVER !== 'true') {
    return Object.freeze({ enabled: false })
  }

  return Object.freeze({
    baseUrl: validateBaseUrl(environment.VITE_CONVERSATION_API_URL),
    enabled: true
  })
}
""",
    'workspaces/apps/mobile/src/conversation/index.ts': r"""
export * from './conversation-session.event'
export * from './conversation-session.service'
export * from './development-conversation.validate'
""",
    'workspaces/apps/mobile/src/ui/development-conversation.view.tsx': r"""
import {
  ConversationClient,
  type ConversationTurnRequest
} from '@repo/conversation-sdk'
import { AgentOrb, agentOrbPresets } from '@repo/react/ui/agent-orb'
import { SmoothButton } from '@repo/react/ui/smooth-button'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import {
  type ConversationSessionEvent,
  ConversationSessionService,
  type DevelopmentConversationConfiguration
} from '@/conversation'
import type { CaptionContent } from '@/state'

import { Caption } from './caption'

interface DevelopmentConversationViewProps {
  configuration: Extract<
    DevelopmentConversationConfiguration,
    { readonly enabled: true }
  >
}

type DevelopmentConversationPhase =
  | 'failed'
  | 'idle'
  | 'pending'
  | 'speaking'

interface DevelopmentConversationState {
  readonly caption: CaptionContent
  readonly phase: DevelopmentConversationPhase
  readonly status: string
}

const INITIAL_STATE: DevelopmentConversationState = Object.freeze({
  caption: Object.freeze({
    accessible:
      'Modo de desenvolvimento: envie um turno sintético para conversar com a Ana.',
    lines: Object.freeze([
      'Envie um turno sintético para validar',
      'o caminho real até a Ana.'
    ])
  }),
  phase: 'idle',
  status: 'Driver de texto para desenvolvimento'
})

function captionFor(text: string): CaptionContent {
  return Object.freeze({
    accessible: `Fala da Ana: ${text}`,
    lines: Object.freeze([text])
  })
}

function stateFromEvent(
  event: ConversationSessionEvent
): DevelopmentConversationState {
  switch (event.type) {
    case 'aborted':
      return Object.freeze({
        caption: Object.freeze({
          accessible: 'O turno de desenvolvimento foi cancelado.',
          lines: Object.freeze(['Turno cancelado. Você pode enviar outro.'])
        }),
        phase: 'idle',
        status: 'Turno cancelado'
      })
    case 'failed':
      return Object.freeze({
        caption: Object.freeze({
          accessible: `Falha segura: ${event.failure.message}`,
          lines: Object.freeze([event.failure.message])
        }),
        phase: 'failed',
        status: 'A Ana não conseguiu responder'
      })
    case 'pending':
      return Object.freeze({
        caption: Object.freeze({
          accessible: 'O turno está sendo processado pela Ana.',
          lines: Object.freeze(['A Ana está processando o turno…'])
        }),
        phase: 'pending',
        status: 'Ana está processando'
      })
    case 'succeeded':
      return Object.freeze({
        caption: captionFor(event.result.response),
        phase: 'speaking',
        status: 'Ana respondeu'
      })
  }
}

function createEphemeralIdentifier(prefix: string, sequence: number): string {
  const random = globalThis.crypto.randomUUID()
  return `${prefix}-${sequence}-${random}`
}

export function DevelopmentConversationView({
  configuration
}: DevelopmentConversationViewProps) {
  const [draft, setDraft] = useState('')
  const [state, setState] =
    useState<DevelopmentConversationState>(INITIAL_STATE)
  const conversationId = useRef(
    createEphemeralIdentifier('development-conversation', 1)
  )
  const requestSequence = useRef(0)

  const session = useMemo(
    () =>
      new ConversationSessionService({
        client: new ConversationClient({ baseUrl: configuration.baseUrl }),
        onEvent: (event) => setState(stateFromEvent(event))
      }),
    [configuration.baseUrl]
  )

  useEffect(() => () => session.dispose(), [session])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const message = draft.trim()
    if (message.length === 0 || state.phase === 'pending') return

    requestSequence.current += 1
    const requestId = createEphemeralIdentifier(
      'development-request',
      requestSequence.current
    )
    const input: ConversationTurnRequest = {
      agentId: 'ana',
      asOf: new Date().toISOString(),
      conversationId: conversationId.current,
      history: [],
      message,
      purpose: 'conversation.support',
      requestId
    }

    setDraft('')
    void session.submit(input)
  }

  const orbState =
    state.phase === 'speaking'
      ? 'speaking'
      : state.phase === 'failed'
        ? 'idle'
        : 'listening'

  return (
    <main className="mobile-shell grid min-h-[100dvh] w-full grid-rows-[auto_1fr_auto] bg-background text-foreground">
      <header className="mx-auto w-full max-w-sm text-center">
        <p className="m-0 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Desenvolvimento · texto sintético
        </p>
        <h1 className="mt-2 mb-0 text-[2rem] leading-tight font-bold tracking-[-0.035em]">
          Ana
        </h1>
        <p aria-live="polite" className="mt-1.5 mb-0 text-sm font-medium text-muted-foreground">
          {state.status}
        </p>
      </header>

      <section className="mx-auto flex w-full max-w-sm flex-col items-center justify-center py-6 text-center">
        <div aria-hidden="true">
          <div
            className="orb-stage relative grid size-[clamp(10rem,25dvh,12rem)] place-items-center rounded-full"
            data-state={orbState}
          >
            <AgentOrb
              preset={agentOrbPresets.ana}
              reducedMotion="system"
              size="clamp(9rem, 22dvh, 11rem)"
              speed={1}
              state={orbState}
            />
          </div>
        </div>
        <div className="mt-5 w-full px-1">
          <Caption caption={state.caption} />
        </div>
      </section>

      <form className="mx-auto grid w-full max-w-sm gap-3" onSubmit={handleSubmit}>
        <label className="text-sm font-semibold" htmlFor="development-conversation-message">
          Turno sintético
        </label>
        <textarea
          aria-describedby="development-conversation-help"
          className="min-h-24 w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 text-base text-card-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring"
          disabled={state.phase === 'pending'}
          id="development-conversation-message"
          maxLength={16000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escreva uma mensagem de teste para a Ana"
          value={draft}
        />
        <p className="m-0 text-xs leading-5 text-muted-foreground" id="development-conversation-help">
          Este campo existe somente quando o driver de desenvolvimento está explicitamente habilitado.
        </p>
        <div className="flex gap-3">
          <SmoothButton
            className="min-h-11 flex-1"
            color="accent"
            disabled={draft.trim().length === 0 || state.phase === 'pending'}
            shape="pill"
            size="lg"
            type="submit"
            variant="candy"
          >
            Enviar turno
          </SmoothButton>
          {state.phase === 'pending' ? (
            <SmoothButton
              className="min-h-11"
              color="neutral"
              onClick={() => session.cancel()}
              shape="pill"
              size="lg"
              type="button"
              variant="outline"
            >
              Cancelar
            </SmoothButton>
          ) : null}
        </div>
      </form>
    </main>
  )
}
""",
    'workspaces/apps/mobile/src/assurance/evals/mobile-conversation/mobile-conversation.fixtures.ts': r"""
import {
  ConversationClientError,
  type ConversationTurnRequest,
  type ConversationTurnResponseData
} from '@repo/conversation-sdk'

interface PendingTurn {
  readonly input: ConversationTurnRequest
  readonly reject: (reason: unknown) => void
  readonly resolve: (value: ConversationTurnResponseData) => void
  readonly signal: AbortSignal | undefined
}

export const SYNTHETIC_TURN_RESPONSE: ConversationTurnResponseData =
  Object.freeze({
    agentId: 'ana',
    conversationId: 'mobile-conversation-1',
    metrics: Object.freeze({
      context: Object.freeze({
        budgetExceededByCurrentMessage: false,
        budgetTokens: 800,
        estimatedTokens: 12,
        estimatorVersion: 'characters-v1',
        historyMessagesOmitted: 0,
        historyMessagesUsed: 0
      }),
      firstTokenLatency: Object.freeze({ status: 'unavailable' }),
      memoryStatus: 'skipped',
      modelCalls: 1,
      modelUsage: Object.freeze({
        inputTokens: 24,
        modelId: 'synthetic-model',
        outputTokens: 8,
        providerId: 'synthetic-provider',
        totalTokens: 32
      }),
      routingLane: 'reflex',
      totalLatencyMs: 12
    }),
    requestId: 'mobile-request-1',
    response: 'Resposta sintética completa da Ana.'
  })

export function createMobileTurnRequest(
  requestId = 'mobile-request-1'
): ConversationTurnRequest {
  return {
    agentId: 'ana',
    asOf: '2026-09-03T12:00:00.000Z',
    conversationId: 'mobile-conversation-1',
    history: [],
    message: 'Oi!',
    purpose: 'conversation.support',
    requestId
  }
}

export class DeferredConversationClient {
  readonly turns: PendingTurn[] = []

  turn(
    input: ConversationTurnRequest,
    options?: { readonly signal?: AbortSignal }
  ): Promise<ConversationTurnResponseData> {
    return new Promise((resolve, reject) => {
      const pending = { input, reject, resolve, signal: options?.signal }
      this.turns.push(pending)

      if (options?.signal?.aborted === true) {
        reject(
          new ConversationClientError({
            code: 'aborted',
            message: 'A solicitação da conversa foi cancelada.',
            requestId: input.requestId
          })
        )
        return
      }

      options?.signal?.addEventListener(
        'abort',
        () =>
          reject(
            new ConversationClientError({
              code: 'aborted',
              message: 'A solicitação da conversa foi cancelada.',
              requestId: input.requestId
            })
          ),
        { once: true }
      )
    })
  }

  resolve(index: number, response: ConversationTurnResponseData): void {
    this.turns[index]?.resolve(response)
  }

  reject(index: number, error: unknown): void {
    this.turns[index]?.reject(error)
  }
}
""",
    'workspaces/apps/mobile/src/assurance/evals/mobile-conversation/mobile-conversation.eval.ts': r"""
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  type ConversationSessionEvent,
  ConversationSessionService,
  validateDevelopmentConversationConfiguration
} from '@/conversation'

import {
  createMobileTurnRequest,
  DeferredConversationClient,
  SYNTHETIC_TURN_RESPONSE
} from './mobile-conversation.fixtures'

async function evaluateConfigurationGate() {
  assert.deepEqual(validateDevelopmentConversationConfiguration({}), {
    enabled: false
  })
  assert.deepEqual(
    validateDevelopmentConversationConfiguration({
      VITE_AMARELO_TEXT_DRIVER: 'false',
      VITE_CONVERSATION_API_URL: 'javascript:private'
    }),
    { enabled: false }
  )
  assert.deepEqual(
    validateDevelopmentConversationConfiguration({
      VITE_AMARELO_TEXT_DRIVER: 'true'
    }),
    { baseUrl: '/api', enabled: true }
  )
  assert.deepEqual(
    validateDevelopmentConversationConfiguration({
      VITE_AMARELO_TEXT_DRIVER: 'true',
      VITE_CONVERSATION_API_URL: 'https://conversation.example/'
    }),
    { baseUrl: 'https://conversation.example', enabled: true }
  )
  assert.throws(() =>
    validateDevelopmentConversationConfiguration({
      VITE_AMARELO_TEXT_DRIVER: 'true',
      VITE_CONVERSATION_API_URL: 'javascript:private'
    })
  )
}

async function evaluateSuccessfulTurn() {
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })

  const execution = session.submit(createMobileTurnRequest())
  assert.deepEqual(events.map((event) => event.type), ['pending'])
  client.resolve(0, SYNTHETIC_TURN_RESPONSE)
  await execution

  assert.deepEqual(events.map((event) => event.type), [
    'pending',
    'succeeded'
  ])
  const succeeded = events.at(-1)
  assert.equal(
    succeeded?.type === 'succeeded' ? succeeded.result.response : null,
    SYNTHETIC_TURN_RESPONSE.response
  )
}

async function evaluateSafeFailure() {
  const secret = 'raw-provider-secret-must-not-render'
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })

  const execution = session.submit(createMobileTurnRequest())
  client.reject(0, new Error(secret))
  await execution

  const failed = events.at(-1)
  assert.equal(failed?.type, 'failed')
  assert.equal(JSON.stringify(failed).includes(secret), false)
}

async function evaluateCancellation() {
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })

  const execution = session.submit(createMobileTurnRequest())
  session.cancel()
  await execution

  assert.deepEqual(events.map((event) => event.type), ['pending', 'aborted'])
  assert.equal(client.turns.at(0)?.signal?.aborted, true)
}

async function evaluateOverlappingTurns() {
  const client = new DeferredConversationClient()
  const events: ConversationSessionEvent[] = []
  const session = new ConversationSessionService({
    client,
    onEvent: (event) => events.push(event)
  })

  const first = session.submit(createMobileTurnRequest('mobile-request-1'))
  const second = session.submit(createMobileTurnRequest('mobile-request-2'))
  client.resolve(0, {
    ...SYNTHETIC_TURN_RESPONSE,
    requestId: 'mobile-request-1',
    response: 'Resposta obsoleta.'
  })
  client.resolve(1, {
    ...SYNTHETIC_TURN_RESPONSE,
    requestId: 'mobile-request-2',
    response: 'Resposta atual.'
  })
  await Promise.all([first, second])

  assert.deepEqual(events.map((event) => event.type), [
    'pending',
    'aborted',
    'pending',
    'succeeded'
  ])
  const succeeded = events.filter((event) => event.type === 'succeeded')
  assert.equal(succeeded.length, 1)
  assert.equal(succeeded.at(0)?.requestId, 'mobile-request-2')
}

async function evaluateEphemeralSourceBoundary() {
  const root = process.cwd()
  const sourcePaths = [
    'src/conversation/conversation-session.event.ts',
    'src/conversation/conversation-session.service.ts',
    'src/conversation/development-conversation.validate.ts',
    'src/ui/development-conversation.view.tsx'
  ]

  for (const sourcePath of sourcePaths) {
    const source = await readFile(path.join(root, sourcePath), 'utf8')
    assert.equal(/localStorage|sessionStorage|CacheStorage|caches\./u.test(source), false)
  }

  const app = await readFile(path.join(root, 'src/app.tsx'), 'utf8')
  assert.equal(app.includes('configuration.enabled'), true)
  const vite = await readFile(path.join(root, 'vite.config.ts'), 'utf8')
  assert.equal(vite.includes('runtimeCaching: []'), true)
}

await evaluateConfigurationGate()
await evaluateSuccessfulTurn()
await evaluateSafeFailure()
await evaluateCancellation()
await evaluateOverlappingTurns()
await evaluateEphemeralSourceBoundary()
console.log('Mobile conversation lifecycle eval PASS')
""",
    'workspaces/apps/mobile/src/assurance/evals/mobile-conversation/index.ts': r"""
export * from './mobile-conversation.eval'
export * from './mobile-conversation.fixtures'
"""
}

for relative, content in files.items():
    path = Path(relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.lstrip(), encoding='utf-8')

package_path = Path('workspaces/apps/mobile/package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
package['scripts']['test'] = (
    'node --import tsx '
    'src/assurance/evals/mobile-conversation/mobile-conversation.eval.ts'
)
package['dependencies']['@repo/conversation-sdk'] = 'workspace:*'
package['devDependencies']['tsx'] = '4.23.12'
package_path.write_text(json.dumps(package, indent=2) + '\n', encoding='utf-8')

caption_state_path = Path('workspaces/apps/mobile/src/state/conversation-atoms.ts')
caption_state = caption_state_path.read_text(encoding='utf-8')
old_lines = '  lines: readonly [string, string, string]\n'
if old_lines not in caption_state:
    raise RuntimeError('CaptionContent tuple contract is missing')
caption_state_path.write_text(
    caption_state.replace(old_lines, '  lines: readonly string[]\n', 1),
    encoding='utf-8',
)

app_path = Path('workspaces/apps/mobile/src/app.tsx')
app = app_path.read_text(encoding='utf-8')
old_imports = "import { ConversationScreen } from './ui'\nimport { PwaLifecycle } from './ui'\n"
new_imports = (
    "import { validateDevelopmentConversationConfiguration } from '@/conversation'\n"
    "import {\n"
    "  ConversationScreen,\n"
    "  DevelopmentConversationView,\n"
    "  PwaLifecycle\n"
    "} from '@/ui'\n"
)
if old_imports not in app:
    raise RuntimeError('Mobile app UI imports are missing')
app = app.replace(old_imports, new_imports, 1)
old_return = "export function App() {\n  useThemeBridge()\n\n  return (\n    <>\n      <ConversationScreen />\n      <PwaLifecycle />\n    </>\n  )\n}\n"
new_return = """export function App() {
  useThemeBridge()
  const configuration = validateDevelopmentConversationConfiguration(
    import.meta.env
  )

  return (
    <>
      {configuration.enabled ? (
        <DevelopmentConversationView configuration={configuration} />
      ) : (
        <ConversationScreen />
      )}
      <PwaLifecycle />
    </>
  )
}
"""
if old_return not in app:
    raise RuntimeError('Mobile App component body is missing')
app_path.write_text(app.replace(old_return, new_return, 1), encoding='utf-8')

ui_index_path = Path('workspaces/apps/mobile/src/ui/index.ts')
ui_index = ui_index_path.read_text(encoding='utf-8')
if "export * from './development-conversation.view'\n" not in ui_index:
    ui_index += "export * from './development-conversation.view'\n"
ui_index_path.write_text(ui_index, encoding='utf-8')

vite_path = Path('workspaces/apps/mobile/vite.config.ts')
vite = vite_path.read_text(encoding='utf-8')
old_server = '  server: developmentServer,\n  preview: developmentServer\n'
new_server = """  server: {
    ...developmentServer,
    proxy: {
      '/api': {
        changeOrigin: false,
        rewrite: (requestPath) => requestPath.replace(/^\/api/u, ''),
        target: 'http://127.0.0.1:3004'
      }
    }
  },
  preview: developmentServer
"""
if old_server not in vite:
    raise RuntimeError('Vite server configuration is missing')
vite_path.write_text(vite.replace(old_server, new_server, 1), encoding='utf-8')

root_turbo_path = Path('turbo.json')
root_turbo = json.loads(root_turbo_path.read_text(encoding='utf-8'))
for variable in ['VITE_AMARELO_TEXT_DRIVER', 'VITE_CONVERSATION_API_URL']:
    if variable not in root_turbo['globalPassThroughEnv']:
        root_turbo['globalPassThroughEnv'].append(variable)
root_turbo_path.write_text(
    json.dumps(root_turbo, indent=2) + '\n',
    encoding='utf-8',
)
