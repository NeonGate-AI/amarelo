# Chatterbox

Chatterbox is the Node/Fastify authentication, HTTP and provider-composition boundary for Ana's bounded development text driver and the minimal Realtime WebRTC session exchange. `@ai/conversation`, `@ai/ana`, and `@repo/conversation-sdk` retain their own domain and browser-safe contract boundaries.

`GET /health` remains dependency-free liveness. All three POST routes require the existing WorkOS AuthKit sealed HttpOnly session and an exact configured browser Origin; missing configuration, invalid identity and uncertain verification fail closed before provider work.

- `POST /v1/conversation/session` returns `201 { data: { conversationId, expiresAt } }`. The server issues the ID and binds it to the principal and WorkOS login session.
- `POST /v1/conversation/turn` accepts only `agentId`, `conversationId`, `requestId`, `message` and bounded untrusted `history`. The server owns purpose and time; foreign, unknown and expired sessions receive the same safe denial.
- `POST /v1/realtime/session` accepts only `application/sdp`. OpenAI receives multipart `sdp` and `session` string fields, with `gpt-realtime-2` and `marin` output. This is not yet the voice-to-core bridge.

The default process-local limits are 1,000 active sessions, at most 10 per principal, a 15-minute conversation lifetime clamped to the verified JWT expiry, 20 protected requests per principal/minute, and four simultaneous provider operations with at most one per principal. Restart discards sessions. WorkOS token refresh belongs to onboarding; this service does not claim immediate online revocation checks, distributed entitlements or audio-duration quotas.

Every non-health response includes the opaque server-generated `x-chatterbox-trace-id`, also present in structured observations. Inbound trace headers are ignored. The sink includes only allowlisted outcomes, latency, routing/Memory diagnostics and nullable token counts—not bodies, account IDs, headers, cookies, raw errors or client request IDs. Buffered observations are bounded; blocked or failed stdout/stderr transport cannot recursively log private errors.

The deterministic test path uses Fastify `app.inject()`, injected fetch/model doubles, and synthetic SDP; it makes no external inference calls. The Realtime eval asserts the exact multipart field names/types, Authorization boundary, session model, safe failures, and raw SDP response contract.

```sh
pnpm --filter chatterbox typecheck
pnpm --filter chatterbox test
pnpm --filter chatterbox eval
```

For authenticated local setup, follow the [Mobile development instructions](../../apps/mobile/readme.md) and use this workspace's `.env.template`. `dev` and `start` load the local `.env`; injected environment values retain precedence. Onboarding and the PWA must use the same hostname and WorkOS configuration. Provider-backed turns additionally require `OPENAI_API_KEY` and `AI_CONVERSATION_MODEL`; no browser variable contains these credentials.

`createRuntime(context)` is the trusted, request-bound composition seam for the later MemoryClient. This slice does not connect Neo4j, write Memory or persist conversation history. Detailed authority and implementation ownership live in [Microservices context](../../../.agents/context/workspaces/microservices/overview.md).

The `eval` command reproduces `src/assurance/baselines/spec-009-pre-memory-v1.baseline.json`. The artifact records only versioned hashes, metrics, quality gates, and an immutable synthetic rate snapshot. Its synthetic micro-USD calculation is test evidence, not a current provider price or production ROI claim.
