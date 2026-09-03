from pathlib import Path

files = {
    '.agents/context/workspaces/ai/agents.md': r"""
# Product agents context

`workspaces/ai/agents/` is the structural parent for independently declared runtime/product-agent workspaces. It is not a package and it is not the engineering `.agents/` harness. The parent owns no `package.json`, `tsconfig.json`, or `src/`; each named agent owns those artifacts inside `workspaces/ai/agents/<agent>/`.

Ana is the first executable product agent at `workspaces/ai/agents/ana/`, published internally as `@ai/ana`. She implements the framework-neutral `ConversationAgentPort` owned by `@ai/conversation`.

Ana owns:

- the versioned PT-BR instruction artifact `ANA_SYSTEM_PROMPT`;
- conversion of the validated Conversation invocation into a bounded model request;
- explicit formatting of routing and Memory projections as delimited, untrusted context;
- validation of the injected model result and normalized usage metadata.

Ana does not read credentials or environment configuration, construct a provider, select a deployment model, own HTTP transport, retrieve Memory directly, or expose a tool surface. `AnaChatModelPort` is injected. The Node composition boundary in `conversation-api` currently adapts LangChain/OpenAI to that port.

The deterministic Ana eval uses a recording model double and makes zero external calls. Future named agents follow the same dependency direction: named agent → `@ai/conversation` public port. Conversation never imports a named agent package.

`pnpm-workspace.yaml` includes `workspaces/ai/agents/*`, so each named agent remains an independent pnpm/Turborepo workspace. Product agents may receive approved Memory projections from Conversation; they never import Memory Nucleus internals.
""",
    '.agents/context/workspaces/ai/conversation.md': r"""
# Conversation context

Conversation is the framework- and provider-neutral `@ai/conversation` workspace at `workspaces/ai/conversation/`.

It owns the current interaction: strict turn validation, deterministic Reflex/Contextual/Deliberative routing, bounded recent-history selection, optional authorized Memory SDK projection, agent resolution, final agent-facing context, normalized invocation, and turn diagnostics. Named product agents implement its `ConversationAgentPort`; Conversation does not import LangChain, provider SDKs, HTTP frameworks, or named agent packages.

The first real serving baseline is composed outside Conversation:

```text
Mobile development driver
  → @repo/conversation-sdk
  → conversation-api (Fastify)
  → ConversationRuntime
  → @ai/ana
  → injected AnaChatModelPort
```

`@repo/conversation-sdk` is browser-safe and owns strict request/response/safe-error contracts plus abortable HTTP transport. `conversation-api` owns server-only environment validation, Fastify routes, request-size defense, safe correlated errors, provider construction, and the LangChain/OpenAI adapter. Raw provider failures and credentials never cross the HTTP boundary.

The SPEC-009 baseline does not configure Memory retrieval. Its canonical Reflex fixture records `memoryStatus: skipped`, one model call, five estimated context tokens, provider-reported usage separately, total latency, and explicit unavailable first-token latency. The sanitized artifact is `workspaces/apps/conversation-api/src/assurance/baselines/spec-009-pre-memory-v1.baseline.json`; it contains hashes and metrics, not prompt, response, transcript, or raw Memory content.

A future serving phase may configure the existing Memory port only through the approved SDK and authorization boundary. Memory retrieval failure remains fail-closed for exposure and fail-open for the current turn: no Memory reaches the agent, while the turn may continue with `unavailable` diagnostics.
""",
    '.agents/context/workflows/mobile.md': r"""
# Mobile workflow context

Mobile is the installable React/Vite PWA and the future voice-first integration surface for Conversation and Memory Nucleus economics.

The default product path remains the local voice-first presentation. SPEC-009 adds one bounded development/test text seam only when `VITE_AMARELO_TEXT_DRIVER` is exactly `true`. Without that explicit flag, the text form is not rendered and the existing product surface is unchanged.

When enabled, Mobile constructs the browser-safe `@repo/conversation-sdk` client and sends a synthetic text turn to `conversation-api`. `ConversationSessionService` owns request lifecycle and emits only pending, succeeded, failed, or aborted events. A new submission aborts the previous request; late or superseded responses cannot render. Safe API failures may be displayed, while raw provider/internal errors are replaced with generic PT-BR copy.

Conversation IDs, messages, responses, captions, request state, and failures remain in memory only. The bounded driver does not add them to local storage, session storage, Cache Storage, Workbox runtime caching, or durable history. Theme and volume remain the only approved persisted preferences. The local Vite `/api` proxy exists only for development and does not move credentials into the browser.

Deterministic Mobile evals cover configuration gating, success, safe failure, cancellation, overlapping requests, stale-result rejection, and persistence/cache absence without binding a network port.
""",
    'workspaces/apps/conversation-api/readme.md': r"""
# Conversation API

`conversation-api` is the Node/Fastify composition boundary for the first real Ana text turn. It owns server-only provider configuration, HTTP validation, request-size limits, safe correlated error mapping, latency/usage metrics, and the LangChain/OpenAI adapter. `@ai/conversation`, `@ai/ana`, and `@repo/conversation-sdk` remain provider- and transport-bounded.

The deterministic test path uses Fastify `app.inject()`, an injected fetch adapter, and model doubles; it makes no external inference calls. Provider-backed startup requires `OPENAI_API_KEY` and `AI_CONVERSATION_MODEL` in the server environment.

```sh
pnpm --filter conversation-api typecheck
pnpm --filter conversation-api test
pnpm --filter conversation-api eval
```

The `eval` command reproduces `src/assurance/baselines/spec-009-pre-memory-v1.baseline.json`. The artifact records only versioned hashes, metrics, quality gates, and an immutable synthetic rate snapshot. Its synthetic micro-USD calculation is test evidence, not a current provider price or production ROI claim.
""",
    'workspaces/packages/conversation-sdk/readme.md': r"""
# Conversation SDK

`@repo/conversation-sdk` is the browser-safe transport contract and abortable HTTP client for the bounded Ana conversation seam. It owns strict Zod request, success, metrics, and safe-error schemas. It contains no Node, Fastify, provider, Memory, credential, storage, or service-worker behavior.

The client validates outbound input and inbound payloads, distinguishes timeout, caller abort, network failure, safe server failure, and invalid response, and never exposes an unvalidated server body as application data.
""",
    'workspaces/apps/mobile/readme.md': r"""
# Mobile

Installable React/Vite PWA for Amarelo's voice-first product experience. The default surface remains voice-first and persists only the approved theme and volume preferences.

SPEC-009 provides a bounded synthetic text driver for engineering validation. It is rendered only when `VITE_AMARELO_TEXT_DRIVER=true`; local development may route `VITE_CONVERSATION_API_URL=/api` through the Vite proxy to `conversation-api`. Messages, responses, request state, and errors remain ephemeral and are excluded from service-worker runtime caches.

```sh
pnpm --filter mobile typecheck
pnpm --filter mobile test
pnpm exec turbo run build --filter=mobile
```

Canonical product behavior remains in `.agents/specs/003-mobile-voice-experience.spec.md`; the bounded integration contract is `.agents/specs/023-first-ana-pwa-conversation-baseline.spec.md`.
"""
}

for relative, content in files.items():
    path = Path(relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.lstrip(), encoding='utf-8')

spec_path = Path('.agents/specs/023-first-ana-pwa-conversation-baseline.spec.md')
spec = spec_path.read_text(encoding='utf-8')
if 'status: in-progress' not in spec:
    raise RuntimeError('SPEC-009 is not in progress')
spec = spec.replace('status: in-progress', 'status: implemented', 1)
old_evidence = 'evidence:\n  - pending\n'
new_evidence = '''evidence:
  - workspaces/packages/conversation-sdk/src/assurance/evals/conversation-sdk/conversation-sdk.eval.ts
  - workspaces/ai/agents/ana/src/assurance/evals/ana-agent/ana-agent.eval.ts
  - workspaces/apps/conversation-api/src/assurance/evals/conversation-api/conversation-api.eval.ts
  - workspaces/apps/conversation-api/src/assurance/evals/pre-memory-baseline/pre-memory-baseline.eval.ts
  - workspaces/apps/conversation-api/src/assurance/baselines/spec-009-pre-memory-v1.baseline.json
  - workspaces/apps/mobile/src/assurance/evals/mobile-conversation/mobile-conversation.eval.ts
'''
if old_evidence not in spec:
    raise RuntimeError('SPEC-009 pending evidence marker is missing')
spec = spec.replace(old_evidence, new_evidence, 1)
spec = spec.replace('- [ ]', '- [x]')
old_promotion = '''Evidence will include SDK, Ana, runtime, Fastify and Mobile tests; the versioned sanitized baseline; optional redacted provider smoke evidence; exact-head CI and both reviews. Stable transport and observability definitions are promoted only after proof.
'''
new_promotion = '''The browser-safe SDK eval proves strict outbound/inbound contracts, abort, timeout, safe-error, invalid-response, and browser-source boundaries. The Ana eval proves injected model ownership, versioned instructions, untrusted context delimiting, normalized usage, and rejection of invalid model output without credentials or external calls. Fastify injection proves the complete SDK → API → ConversationRuntime → Ana path, request-size/schema rejection before model invocation, server-only provider configuration, safe correlated failures, and the LangChain adapter.

The Mobile eval proves exact development-flag gating, request-driven state, success, safe failure, cancellation, overlapping-request abort, stale-result rejection, and absence of new storage/cache paths. `spec-009-pre-memory-v1.baseline.json` is regenerated by the package eval and records five estimated context tokens separately from 40/8/48 provider-reported tokens, one model call, 25 ms deterministic latency, explicit unavailable first-token latency, an immutable synthetic rate snapshot, 16 micro-USD synthetic cost, versioned quality checks, hashes, and correlation IDs. It contains no raw prompt, response, transcript, Memory, credential, or provider failure.

The agents, Conversation, and Mobile context documents now record only these proven boundaries. Exact-head CI and the two independent PR review axes remain the merge record.
'''
if old_promotion not in spec:
    raise RuntimeError('SPEC-009 promotion paragraph is missing')
spec_path.write_text(spec.replace(old_promotion, new_promotion, 1), encoding='utf-8')

index_path = Path('.agents/specs/readme.md')
index = index_path.read_text(encoding='utf-8')
old_row = '| 023 | SPEC-009 | ready | [First Ana/PWA conversation and serving baseline](023-first-ana-pwa-conversation-baseline.spec.md) |'
new_row = '| 023 | SPEC-009 | implemented | [First Ana/PWA conversation and serving baseline](023-first-ana-pwa-conversation-baseline.spec.md) |'
if old_row not in index:
    raise RuntimeError('SPEC-009 catalog row is missing')
index_path.write_text(index.replace(old_row, new_row, 1), encoding='utf-8')
