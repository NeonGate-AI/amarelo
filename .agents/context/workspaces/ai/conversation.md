# Conversation context

Conversation is the framework- and provider-neutral `@ai/conversation` workspace at `workspaces/ai/conversation/`.

It owns the current interaction: strict turn validation, deterministic Reflex/Contextual/Deliberative routing, bounded recent-history selection, optional authorized Memory SDK projection, agent resolution, final agent-facing context, normalized invocation, and turn diagnostics. Named product agents implement its `ConversationAgentPort`; Conversation does not import LangChain, provider SDKs, HTTP frameworks, or named agent packages.

The first real serving baseline is composed outside Conversation:

```text
Mobile development driver
  → @repo/conversation-sdk
  → chatterbox (Fastify)
  → ConversationRuntime
  → @ai/ana
  → injected AnaChatModelPort
```

`@repo/conversation-sdk` is browser-safe and owns strict request/response/safe-error contracts plus abortable HTTP transport. Chatterbox owns server-only environment validation, Fastify routes, request-size defense, safe correlated errors, provider construction, and the LangChain/OpenAI adapter. Raw provider failures and credentials never cross the HTTP boundary.

The SPEC-009 baseline does not configure Memory retrieval. Its canonical Reflex fixture records `memoryStatus: skipped`, one model call, five estimated context tokens, provider-reported usage separately, total latency, and explicit unavailable first-token latency. The sanitized artifact is `workspaces/microservices/chatterbox/src/assurance/baselines/spec-009-pre-memory-v1.baseline.json`; it contains hashes and metrics, not prompt, response, transcript, or raw Memory content.

A future serving phase may configure the existing Memory port only through the approved SDK and authorization boundary. Memory retrieval failure remains fail-closed for exposure and fail-open for the current turn: no Memory reaches the agent, while the turn may continue with `unavailable` diagnostics.
