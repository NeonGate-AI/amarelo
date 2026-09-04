from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dedent(content).lstrip(), encoding='utf-8')


write(
    'workspaces/apps/mobile/src/conversation/conversation-session.controller.ts',
    r'''
    import {
      ConversationClientError,
      type ConversationClientErrorCode,
      type ConversationTurnRequest,
      type ConversationTurnResponseData
    } from '@repo/conversation-sdk'

    export interface ConversationTurnClient {
      turn(
        input: ConversationTurnRequest,
        options?: { readonly signal?: AbortSignal }
      ): Promise<ConversationTurnResponseData>
    }

    export type ConversationSessionState =
      | { readonly status: 'idle' }
      | { readonly requestId: string; readonly status: 'pending' }
      | {
          readonly requestId: string
          readonly response: ConversationTurnResponseData
          readonly status: 'succeeded'
        }
      | {
          readonly code: ConversationClientErrorCode
          readonly requestId: string
          readonly status: 'failed'
        }
      | { readonly requestId: string; readonly status: 'aborted' }

    export interface ConversationSessionControllerOptions {
      readonly client: ConversationTurnClient
      readonly createRequest: (message: string) => ConversationTurnRequest
      readonly onState: (state: ConversationSessionState) => void
    }

    interface ActiveRequest {
      readonly controller: AbortController
      readonly generation: number
      readonly requestId: string
    }

    function errorCode(error: unknown): ConversationClientErrorCode {
      return error instanceof ConversationClientError
        ? error.code
        : 'internal_error'
    }

    export class ConversationSessionController {
      readonly #client: ConversationTurnClient
      readonly #createRequest: (message: string) => ConversationTurnRequest
      readonly #onState: (state: ConversationSessionState) => void
      #active: ActiveRequest | null = null
      #generation = 0

      constructor(options: ConversationSessionControllerOptions) {
        this.#client = options.client
        this.#createRequest = options.createRequest
        this.#onState = options.onState
        this.#onState({ status: 'idle' })
      }

      async submit(message: string): Promise<ConversationTurnResponseData | null> {
        this.#active?.controller.abort()
        const request = this.#createRequest(message)
        const controller = new AbortController()
        const generation = ++this.#generation
        this.#active = {
          controller,
          generation,
          requestId: request.requestId
        }
        this.#onState({ requestId: request.requestId, status: 'pending' })

        try {
          const response = await this.#client.turn(request, {
            signal: controller.signal
          })
          if (generation !== this.#generation) {
            return null
          }

          this.#active = null
          this.#onState({
            requestId: request.requestId,
            response,
            status: 'succeeded'
          })
          return response
        } catch (error) {
          if (generation !== this.#generation) {
            return null
          }

          this.#active = null
          const code = errorCode(error)
          if (code === 'aborted') {
            this.#onState({ requestId: request.requestId, status: 'aborted' })
            return null
          }

          this.#onState({ code, requestId: request.requestId, status: 'failed' })
          return null
        }
      }

      abort(): void {
        const active = this.#active
        if (active === null) {
          return
        }

        this.#generation += 1
        this.#active = null
        active.controller.abort()
        this.#onState({ requestId: active.requestId, status: 'aborted' })
      }

      dispose(): void {
        this.#generation += 1
        this.#active?.controller.abort()
        this.#active = null
      }
    }
    ''',
)

write(
    'workspaces/apps/mobile/src/conversation/mobile-conversation-request.factory.ts',
    r'''
    import type { ConversationTurnRequest } from '@repo/conversation-sdk'

    export interface MobileConversationRequestFactoryOptions {
      readonly conversationId: string
      readonly nextRequestId: () => string
      readonly now: () => Date
    }

    export function createMobileConversationRequestFactory(
      options: MobileConversationRequestFactoryOptions
    ): (message: string) => ConversationTurnRequest {
      return (message) => ({
        agentId: 'ana',
        asOf: options.now().toISOString(),
        conversationId: options.conversationId,
        history: [],
        message,
        purpose: 'conversation.support',
        requestId: options.nextRequestId()
      })
    }
    ''',
)

write(
    'workspaces/apps/mobile/src/conversation/index.ts',
    r'''
    export * from './conversation-session.controller'
    export * from './mobile-conversation-request.factory'
    ''',
)

write(
    'workspaces/apps/mobile/src/ui/conversation-text-driver.tsx',
    r'''
    import { ConversationClient } from '@repo/conversation-sdk'
    import { useAtomValue, useSetAtom } from 'jotai'
    import { type FormEvent, useEffect, useMemo, useState } from 'react'

    import {
      ConversationSessionController,
      createMobileConversationRequestFactory
    } from '@/conversation'
    import {
      abortConversationRequestAtom,
      beginConversationRequestAtom,
      completeConversationRequestAtom,
      conversationRequestErrorAtom,
      conversationRequestStatusAtom,
      failConversationRequestAtom
    } from '@/state'

    const TEXT_DRIVER_ENABLED =
      import.meta.env.VITE_ENABLE_CONVERSATION_TEXT_DRIVER === 'true'

    function nextIdentifier(prefix: string): string {
      return `${prefix}-${globalThis.crypto.randomUUID()}`
    }

    export function ConversationTextDriver() {
      const status = useAtomValue(conversationRequestStatusAtom)
      const error = useAtomValue(conversationRequestErrorAtom)
      const begin = useSetAtom(beginConversationRequestAtom)
      const complete = useSetAtom(completeConversationRequestAtom)
      const fail = useSetAtom(failConversationRequestAtom)
      const abort = useSetAtom(abortConversationRequestAtom)
      const [message, setMessage] = useState('')

      const controller = useMemo(() => {
        const client = new ConversationClient({
          baseUrl: import.meta.env.VITE_CONVERSATION_API_URL ?? ''
        })
        const createRequest = createMobileConversationRequestFactory({
          conversationId: nextIdentifier('mobile-conversation'),
          nextRequestId: () => nextIdentifier('mobile-request'),
          now: () => new Date()
        })

        return new ConversationSessionController({
          client,
          createRequest,
          onState: (state) => {
            switch (state.status) {
              case 'idle':
                return
              case 'pending':
                begin()
                return
              case 'succeeded':
                complete(state.response.response)
                return
              case 'failed':
                fail(state.code)
                return
              case 'aborted':
                abort()
            }
          }
        })
      }, [abort, begin, complete, fail])

      useEffect(() => () => controller.dispose(), [controller])

      if (!TEXT_DRIVER_ENABLED) {
        return null
      }

      const pending = status === 'pending'

      async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const normalized = message.trim()
        if (normalized.length === 0 || pending) {
          return
        }

        const response = await controller.submit(normalized)
        if (response !== null) {
          setMessage('')
        }
      }

      return (
        <form
          aria-label="Driver de texto para desenvolvimento"
          className="mt-4 flex w-full max-w-[20rem] gap-2 px-1"
          onSubmit={handleSubmit}
        >
          <label className="sr-only" htmlFor="conversation-development-message">
            Mensagem sintética para Ana
          </label>
          <input
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-sm text-foreground"
            disabled={pending}
            id="conversation-development-message"
            maxLength={16000}
            onChange={(event) => setMessage(event.currentTarget.value)}
            placeholder="Mensagem de desenvolvimento"
            value={message}
          />
          <button
            className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            disabled={pending || message.trim().length === 0}
            type="submit"
          >
            {pending ? 'Enviando' : 'Enviar'}
          </button>
          <span aria-live="polite" className="sr-only">
            {error === null ? '' : 'Não foi possível concluir a solicitação.'}
          </span>
        </form>
      )
    }
    ''',
)

write(
    'workspaces/apps/mobile/src/assurance/evals/mobile-conversation/mobile-conversation.eval.ts',
    r'''
    import assert from 'node:assert/strict'
    import { readFile } from 'node:fs/promises'

    import {
      ConversationClientError,
      type ConversationTurnRequest,
      type ConversationTurnResponseData
    } from '@repo/conversation-sdk'

    import {
      ConversationSessionController,
      type ConversationSessionState,
      type ConversationTurnClient,
      createMobileConversationRequestFactory
    } from '@/conversation'

    const RESPONSE: ConversationTurnResponseData = {
      agentId: 'ana',
      conversationId: 'mobile-conversation-1',
      metrics: {
        context: {
          budgetExceededByCurrentMessage: false,
          budgetTokens: 256,
          estimatedTokens: 12,
          estimatorVersion: 'characters-v1',
          historyMessagesOmitted: 0,
          historyMessagesUsed: 0
        },
        firstTokenLatency: { status: 'unavailable' },
        memoryStatus: 'skipped',
        modelCalls: 1,
        modelUsage: null,
        routingLane: 'reflex',
        totalLatencyMs: 10
      },
      requestId: 'request-1',
      response: 'Resposta sintética da Ana.'
    }

    interface DeferredCall {
      readonly input: ConversationTurnRequest
      readonly reject: (error: unknown) => void
      readonly resolve: (response: ConversationTurnResponseData) => void
      readonly signal: AbortSignal | undefined
    }

    class DeferredClient implements ConversationTurnClient {
      readonly calls: DeferredCall[] = []

      turn(
        input: ConversationTurnRequest,
        options?: { readonly signal?: AbortSignal }
      ): Promise<ConversationTurnResponseData> {
        return new Promise((resolve, reject) => {
          const call = { input, reject, resolve, signal: options?.signal }
          this.calls.push(call)
          options?.signal?.addEventListener(
            'abort',
            () =>
              reject(
                new ConversationClientError({
                  code: 'aborted',
                  message: 'cancelled',
                  requestId: input.requestId
                })
              ),
            { once: true }
          )
        })
      }
    }

    function createHarness(client: ConversationTurnClient) {
      const states: ConversationSessionState[] = []
      let nextId = 0
      const createRequest = createMobileConversationRequestFactory({
        conversationId: 'mobile-conversation-1',
        nextRequestId: () => `request-${++nextId}`,
        now: () => new Date('2026-09-03T12:00:00.000Z')
      })
      const controller = new ConversationSessionController({
        client,
        createRequest,
        onState: (state) => states.push(state)
      })
      return { controller, states }
    }

    async function evaluateSuccess() {
      const client = new DeferredClient()
      const { controller, states } = createHarness(client)
      const pending = controller.submit('Oi, Ana.')
      assert.deepEqual(states.map((state) => state.status), ['idle', 'pending'])
      client.calls[0]?.resolve(RESPONSE)
      assert.equal((await pending)?.response, RESPONSE.response)
      assert.deepEqual(states.map((state) => state.status), [
        'idle',
        'pending',
        'succeeded'
      ])
    }

    async function evaluateFailure() {
      const client = new DeferredClient()
      const { controller, states } = createHarness(client)
      const pending = controller.submit('Falha sintética.')
      client.calls[0]?.reject(
        new ConversationClientError({
          code: 'model_unavailable',
          message: 'safe',
          requestId: 'request-1'
        })
      )
      assert.equal(await pending, null)
      assert.equal(states.at(-1)?.status, 'failed')
      assert.equal(
        states.at(-1)?.status === 'failed' ? states.at(-1)?.code : null,
        'model_unavailable'
      )
    }

    async function evaluateAbort() {
      const client = new DeferredClient()
      const { controller, states } = createHarness(client)
      const pending = controller.submit('Cancelar.')
      controller.abort()
      assert.equal(await pending, null)
      assert.equal(states.at(-1)?.status, 'aborted')
    }

    async function evaluateOverlappingRequests() {
      const client = new DeferredClient()
      const { controller, states } = createHarness(client)
      const first = controller.submit('Primeira.')
      const second = controller.submit('Segunda.')
      assert.equal(client.calls[0]?.signal?.aborted, true)
      client.calls[1]?.resolve({ ...RESPONSE, requestId: 'request-2' })
      assert.equal(await first, null)
      assert.equal((await second)?.requestId, 'request-2')
      const successes = states.filter((state) => state.status === 'succeeded')
      assert.equal(successes.length, 1)
      assert.equal(successes[0]?.requestId, 'request-2')
    }

    async function evaluateEphemeralSource() {
      const sources = await Promise.all([
        readFile(
          new URL('../../../conversation/conversation-session.controller.ts', import.meta.url),
          'utf8'
        ),
        readFile(
          new URL('../../../ui/conversation-text-driver.tsx', import.meta.url),
          'utf8'
        )
      ])
      for (const source of sources) {
        assert.equal(source.includes('localStorage'), false)
        assert.equal(source.includes('caches.'), false)
        assert.equal(source.includes('sessionStorage'), false)
      }
    }

    await evaluateSuccess()
    await evaluateFailure()
    await evaluateAbort()
    await evaluateOverlappingRequests()
    await evaluateEphemeralSource()
    console.log('Mobile conversation lifecycle eval PASS')
    ''',
)

write(
    'workspaces/apps/mobile/src/assurance/evals/mobile-conversation/index.ts',
    r'''
    export * from './mobile-conversation.eval'
    ''',
)

atoms_path = Path('workspaces/apps/mobile/src/state/conversation-atoms.ts')
atoms = atoms_path.read_text(encoding='utf-8')
atoms = atoms.replace(
    "export type ThemePreference = ColorTheme | 'system'\n",
    "export type ThemePreference = ColorTheme | 'system'\n"
    "export type ConversationRequestStatus =\n"
    "  | 'idle'\n  | 'pending'\n  | 'succeeded'\n  | 'failed'\n",
    1,
)
atoms = atoms.replace(
    '  lines: readonly [string, string, string]\n',
    '  lines: readonly string[]\n',
    1,
)
atoms = atoms.replace(
    'export const captionIndexAtom = atom(0)\n',
    "export const captionIndexAtom = atom(0)\n"
    "export const conversationRequestStatusAtom = atom<ConversationRequestStatus>('idle')\n"
    "export const conversationRequestErrorAtom = atom<string | null>(null)\n"
    "export const liveConversationCaptionAtom = atom<CaptionContent | null>(null)\n",
    1,
)
atoms = atoms.replace(
    "export const statusLabelAtom = atom((get) => {\n  const state = get(experienceStateAtom)\n",
    "export const statusLabelAtom = atom((get) => {\n"
    "  const requestStatus = get(conversationRequestStatusAtom)\n"
    "  if (requestStatus === 'pending') {\n    return 'Ana está pensando'\n  }\n"
    "  if (requestStatus === 'failed') {\n    return 'Não foi possível responder'\n  }\n\n"
    "  const state = get(experienceStateAtom)\n",
    1,
)
atoms = atoms.replace(
    "export const captionAtom = atom<CaptionContent | null>((get) => {\n  const state = get(experienceStateAtom)\n",
    "export const captionAtom = atom<CaptionContent | null>((get) => {\n"
    "  const state = get(experienceStateAtom)\n"
    "  const liveCaption = get(liveConversationCaptionAtom)\n"
    "  if (state === 'speaking' && liveCaption !== null) {\n"
    "    return liveCaption\n  }\n",
    1,
)
insert_marker = "export const setSystemThemeAtom = atom(null, (_get, set, theme: ColorTheme) => {\n"
actions = r'''
export const beginConversationRequestAtom = atom(null, (_get, set) => {
  set(conversationRequestStatusAtom, 'pending')
  set(conversationRequestErrorAtom, null)
  set(liveConversationCaptionAtom, null)
  set(conversationPhaseAtom, 'listening')
})

export const completeConversationRequestAtom = atom(
  null,
  (_get, set, response: string) => {
    set(conversationRequestStatusAtom, 'succeeded')
    set(conversationRequestErrorAtom, null)
    set(liveConversationCaptionAtom, {
      accessible: `Fala da Ana: ${response}`,
      lines: [response]
    })
    set(conversationPhaseAtom, 'speaking')
  }
)

export const failConversationRequestAtom = atom(
  null,
  (_get, set, code: string) => {
    set(conversationRequestStatusAtom, 'failed')
    set(conversationRequestErrorAtom, code)
    set(liveConversationCaptionAtom, null)
    set(conversationPhaseAtom, 'listening')
  }
)

export const abortConversationRequestAtom = atom(null, (_get, set) => {
  set(conversationRequestStatusAtom, 'idle')
  set(conversationRequestErrorAtom, null)
  set(liveConversationCaptionAtom, null)
  set(conversationPhaseAtom, 'listening')
})

'''
if insert_marker not in atoms:
    raise RuntimeError('state action insertion marker missing')
atoms = atoms.replace(insert_marker, actions + insert_marker, 1)
atoms = atoms.replace(
    "export const endConversationAtom = atom(null, (_get, set) => {\n  set(conversationPhaseAtom, 'ended')\n})",
    "export const endConversationAtom = atom(null, (_get, set) => {\n"
    "  set(conversationRequestStatusAtom, 'idle')\n"
    "  set(conversationRequestErrorAtom, null)\n"
    "  set(liveConversationCaptionAtom, null)\n"
    "  set(conversationPhaseAtom, 'ended')\n})",
    1,
)
atoms = atoms.replace(
    "export const restartConversationAtom = atom(null, (get, set) => {\n  const restoredVolume",
    "export const restartConversationAtom = atom(null, (get, set) => {\n"
    "  set(conversationRequestStatusAtom, 'idle')\n"
    "  set(conversationRequestErrorAtom, null)\n"
    "  set(liveConversationCaptionAtom, null)\n"
    "  const restoredVolume",
    1,
)
atoms_path.write_text(atoms, encoding='utf-8')

screen_path = Path('workspaces/apps/mobile/src/ui/conversation-screen.tsx')
screen = screen_path.read_text(encoding='utf-8')
screen = screen.replace(
    "import { Caption } from './caption'\n",
    "import { Caption } from './caption'\nimport { ConversationTextDriver } from './conversation-text-driver'\n",
    1,
)
screen = screen.replace(
    "        <div className=\"mt-4 w-full max-w-[20rem] px-1\">\n          <Caption caption={caption} />\n        </div>\n",
    "        <div className=\"mt-4 w-full max-w-[20rem] px-1\">\n"
    "          <Caption caption={caption} />\n"
    "        </div>\n\n"
    "        <ConversationTextDriver />\n",
    1,
)
screen_path.write_text(screen, encoding='utf-8')

ui_index = Path('workspaces/apps/mobile/src/ui/index.ts')
ui_content = ui_index.read_text(encoding='utf-8')
export_line = "export * from './conversation-text-driver'\n"
if export_line not in ui_content:
    ui_index.write_text(ui_content + export_line, encoding='utf-8')

package_path = Path('workspaces/apps/mobile/package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
package['scripts']['test'] = (
    'node --import tsx '
    'src/assurance/evals/mobile-conversation/mobile-conversation.eval.ts'
)
package['dependencies']['@repo/conversation-sdk'] = 'workspace:*'
package['devDependencies']['tsx'] = '4.23.12'
package_path.write_text(json.dumps(package, indent=2) + '\n', encoding='utf-8')

turbo_path = Path('turbo.json')
turbo = json.loads(turbo_path.read_text(encoding='utf-8'))
for name in ['VITE_CONVERSATION_API_URL', 'VITE_ENABLE_CONVERSATION_TEXT_DRIVER']:
    if name not in turbo['globalPassThroughEnv']:
        turbo['globalPassThroughEnv'].append(name)
turbo_path.write_text(json.dumps(turbo, indent=2) + '\n', encoding='utf-8')
