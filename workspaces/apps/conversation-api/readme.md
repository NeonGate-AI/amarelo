# Conversation API

`conversation-api` is the Node/Fastify composition boundary for the first real Ana text turn. It owns server-only provider configuration, HTTP validation, request-size limits, safe correlated error mapping, latency/usage metrics, and the LangChain/OpenAI adapter. `@ai/conversation`, `@ai/ana`, and `@repo/conversation-sdk` remain provider- and transport-bounded.

The deterministic test path uses Fastify `app.inject()`, an injected fetch adapter, and model doubles; it makes no external inference calls. Provider-backed startup requires `OPENAI_API_KEY` and `AI_CONVERSATION_MODEL` in the server environment.

```sh
pnpm --filter conversation-api typecheck
pnpm --filter conversation-api test
pnpm --filter conversation-api eval
```

The `eval` command reproduces `src/assurance/baselines/spec-009-pre-memory-v1.baseline.json`. The artifact records only versioned hashes, metrics, quality gates, and an immutable synthetic rate snapshot. Its synthetic micro-USD calculation is test evidence, not a current provider price or production ROI claim.
