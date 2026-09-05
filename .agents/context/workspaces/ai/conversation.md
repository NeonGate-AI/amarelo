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

`@repo/conversation-sdk` is browser-safe and owns strict request/response/safe-error contracts plus abortable HTTP transport. Under SPEC-047 it acquires a server session and sends only agent, conversation/request identifiers, message and bounded history. Chatterbox owns WorkOS/origin authentication, expiring session ownership, limits and the trusted composition context; it supplies purpose/time to Conversation and keeps identity outside the browser contract. Conversation remains independent of HTTP and WorkOS. Raw provider failures and credentials never cross the HTTP boundary.

The SPEC-009 baseline does not configure Memory retrieval. Its canonical Reflex fixture records `memoryStatus: skipped`, one model call, five estimated context tokens, provider-reported usage separately, total latency, and explicit unavailable first-token latency. The sanitized artifact is `workspaces/microservices/chatterbox/src/assurance/baselines/spec-009-pre-memory-v1.baseline.json`; it contains hashes and metrics, not prompt, response, transcript, or raw Memory content.

A future serving phase may configure the existing Memory port only through the approved SDK and authorization boundary. SPEC-016 binds that adapter at Chatterbox's request-aware composition root; SPEC-047 still supplies no concrete MemoryClient. Client history is bounded untrusted context, not authorized canonical evidence.

Memory retrieval failure remains fail-closed for exposure while allowing the current turn without Memory. Diagnostics distinguish `not_configured`, explicitly classified `dependency_unavailable`, `contract_violation` and `unexpected_failure`; a skipped retrieval has no failure. Failed projections never reach the agent. Chatterbox transports these content-free diagnostics through its observation allowlist, not through raw exception serialization. Missing provider usage remains null and unavailable first-token latency stays explicit; domain economics and quality are not owned by the telemetry transport.
