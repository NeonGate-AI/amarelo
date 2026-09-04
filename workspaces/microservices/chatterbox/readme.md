# Chatterbox

Chatterbox is the Node/Fastify composition boundary for the first real Ana text turn and the minimal Realtime WebRTC session exchange. It owns server-only provider configuration, HTTP validation, request-size limits, safe correlated error mapping, latency/usage metrics, and provider adapters. `@ai/conversation`, `@ai/ana`, and `@repo/conversation-sdk` remain provider- and transport-bounded.

`GET /health` is a liveness endpoint and succeeds while the Fastify process is running, even when no model provider is configured. Provider-backed conversation and Realtime behavior require both `OPENAI_API_KEY` and `AI_CONVERSATION_MODEL`; without them those operations return safe unavailable responses. `POST /v1/realtime/session` accepts the browser's raw `application/sdp` offer. The provider client posts it to OpenAI `POST /v1/realtime/calls` as multipart `FormData` string fields named exactly `sdp` and `session`; it does not create file uploads and does not manually set the multipart content type. The serialized Realtime session is pinned to `gpt-realtime-2` with `marin` audio output.

The deterministic test path uses Fastify `app.inject()`, injected fetch/model doubles, and synthetic SDP; it makes no external inference calls. The Realtime eval asserts the exact multipart field names/types, Authorization boundary, session model, safe failures, and raw SDP response contract.

```sh
pnpm --filter chatterbox typecheck
pnpm --filter chatterbox test
pnpm --filter chatterbox eval
```

To run provider-backed local development:

```sh
OPENAI_API_KEY='<your-openai-api-key>' \
AI_CONVERSATION_MODEL='<your-existing-chat-model>' \
pnpm --filter chatterbox dev
```

The `eval` command reproduces `src/assurance/baselines/spec-009-pre-memory-v1.baseline.json`. The artifact records only versioned hashes, metrics, quality gates, and an immutable synthetic rate snapshot. Its synthetic micro-USD calculation is test evidence, not a current provider price or production ROI claim.
