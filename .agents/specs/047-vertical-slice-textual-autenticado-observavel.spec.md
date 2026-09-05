---
id: SPEC-047
title: Vertical slice textual, autenticado e observável
type: feature
status: implemented
mode: prospective
created: 2026-09-05
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - workspaces/microservices/chatterbox
  - workspaces/packages/conversation-sdk
  - workspaces/packages/observability
  - workspaces/ai/conversation
  - workspaces/apps/mobile
context:
  - .agents/context/workspaces/microservices/overview.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/004-import-boundaries.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
  - .agents/adrs/0030-microservices-chatterbox-boundary.adr.md
  - .agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/microservices/chatterbox/src/assurance/tests/authenticated-conversation
  - workspaces/microservices/chatterbox/src/assurance/evals/pre-memory-baseline
  - workspaces/packages/conversation-sdk/src/assurance/evals/conversation-sdk
  - workspaces/apps/mobile/src/assurance/evals/mobile-conversation
  - workspaces/ai/conversation/src/assurance/evals/conversation-runtime
  - workspaces/apps/mobile/readme.md
---

# SPEC-047: Vertical slice textual, autenticado e observável

## Problem Statement

The development text seam reaches Ana but Chatterbox does not authenticate callers or bind conversations to an owner. The browser currently supplies purpose and time. The shared observation boundary is not wired to a redacted sink. Connecting private Memory now would expose an unsafe authorization/composition seam.

## Solution

Deliver a bounded authenticated development text path from the PWA through the browser-safe SDK, Chatterbox, Conversation and Ana, with structured content-free observations. Reuse the existing onboarding WorkOS identity and keep conversation state ephemeral. Establish the trusted server context that SPEC-016 will later bind to a concrete MemoryClient; do not claim persistent Memory in this slice.

## User Stories

1. As a signed-in development user, I can open an owned conversation and send a bounded text turn to Ana.
2. As another user or anonymous caller, I cannot spend provider budget or reuse somebody else's conversation.
3. As an operator, I can distinguish authentication, validation, ownership, throttling, model and telemetry failures without inspecting private content.

## Scope

Server authentication adapter, ephemeral owned sessions, safe HTTP contracts and SDK, development PWA session/error behavior, bounded request/rate/concurrency limits, structured observation transport and adversarial synthetic tests. Guard the existing Realtime paid-provider endpoint using the same authentication/origin boundary; this is not the voice-to-core bridge.

## Implementation Decisions

- Reuse the existing WorkOS AuthKit sealed HttpOnly session via the locked WorkOS Node SDK. Do not invent development identities, shared browser API keys or a parallel login system. Missing server configuration fails closed. Tests may inject a synthetic identity resolver only through the application factory, never through production environment flags.
- The PWA calls same-origin /api routes with credentials; local onboarding and PWA use the same hostname. Require an exact configured Origin allowlist for browser POST requests. No wildcard credentialed CORS or client-trusted proxy/auth headers.
- POST /v1/conversation/session issues a server-generated conversation ID and expiry. A bounded process-local registry binds it to verified principal, purpose conversation.support and a short lifetime. Expiry/restart requires a new session; this is not durable conversation storage.
- Browser turn input contains agentId, conversationId, requestId, message and bounded untrusted history. It cannot supply tenant, subject, authorization, purpose or asOf. Chatterbox derives principal/scope from authenticated identity and time from its clock on each request.
- Current history remains transient client-supplied context, not canonical evidence or a Memory write. The later Memory adapter must accept only server-authenticated authority and separately governed evidence.
- Expose safe authentication/authorization/rate-limit errors through the SDK. No private credentials are stored in localStorage, service-worker caches, logs or fixtures.
- Bound active sessions, turn rate and concurrent provider work. Authenticate before protected provider calls; session ownership is rechecked on every turn. Document process-local limits as development protection, not distributed entitlements or production abuse prevention.
- Use a concrete allowlisted structured observation sink with server correlation, outcome, latency, lane, Memory status and nullable provider token counts. Never serialize request/response bodies, history, raw Memory, SDP, headers, cookies, account IDs, IPs or raw exceptions. Disable automatic sensitive request/error logging. Missing usage stays unknown, not zero.
- Expected Memory availability failures may degrade to no Memory; contract/invariant failures must have distinguishable content-free diagnostics. No Memory reaches the agent on failure. This does not activate Memory retrieval.
- Keep the ordinary voice-first product intact; text remains behind its explicit development flag. No production SSO, clinical readiness or public launch claim follows from synthetic tests.
- Offline local delivery and local ticket evidence follow the explicit owner exception in SPEC-046. Ticket order: authenticated session/denial; owned text/limits; SDK/PWA; observations/failure evidence.

## Testing Decisions

### Primary seam

Fastify app.inject drives authenticated session creation and a full owned turn through real Conversation/Ana with a synthetic external model and authentication resolver. Denials must occur before paid model work.

### Secondary seams

Production WorkOS adapter mapping/failure contract; browser-safe SDK HTTP/abort behavior; PWA in-memory session lifecycle; allowlisted observation redaction; Conversation Memory error classification. No real identity/provider calls in deterministic tests.

### Fixtures and privacy

Synthetic principals, clocks, sessions, messages, provider outputs and sentinel credentials. Capture logs to prove sentinels never appear. No real user, WorkOS secret, microphone or paid model request.

### Required validation

Focused red-to-green tests/evals, affected typechecks, lint, builds and Elo audits. Full local test graph where executable. Disclose missing container/browser/live identity credentials; automated seam verification does not assert a live WorkOS login or deployed PWA journey. Remote CI and remote repository actions remain forbidden for this delivery.

## Acceptance Criteria

- [x] Production composition authenticates existing WorkOS sessions and fails closed for missing configuration, missing/invalid/expired authentication and resolver failure.
- [x] Server-issued conversations are principal-bound, bounded and expiring; another principal cannot reuse one.
- [x] Server derives purpose and asOf; injected tenant/subject/purpose/time fields are rejected at the HTTP boundary.
- [x] Missing/invalid origin, oversize input, exhausted limits and concurrent work reject safely before provider invocation; health remains dependency-free.
- [x] SDK and development PWA acquire a server session, send same-origin credentials, handle safe auth/session failures and preserve cancellation without persistence.
- [x] Success and failure emit allowlisted content-free observations with server correlation and honest nullable usage; sink failure is bounded and never leaks raw content.
- [x] Memory availability and contract failures are distinguishable without enabling durable Memory or exposing failed projections.
- [x] Existing Realtime provider access has no unauthenticated bypass.
- [x] Scoped tests, local validation and independent review evidence are recorded with unexecuted live gates explicit.
- [x] Trusted-context ownership, local setup, runtime limitations and the next SPEC-016 bridge are promoted to durable context.

## Failure Behavior

Unauthenticated or uncertain authority fails closed before paid work. Invalid or foreign/expired conversation IDs are rejected without revealing ownership. Rate limits return retry-safe errors. Provider failures return a generic correlated error, never raw exceptions. Observation sink failure emits only a fixed content-free diagnostic and does not recursively log or change authorization. Restart loses ephemeral sessions by design. Cache/storage/broker availability does not gate this text slice.

## Out of Scope

Neo4j driver/schema/outbox, persistent MemoryClient, BullMQ worker, durable chat history, new login UX, production SSO/entitlements, full clinical guardrails, voice core delegation, distributed rate limits and deployment/remote PRs.

## Evidence and Promotion

Promote trusted request context and observation ownership to Chatterbox/Conversation context, configuration examples to server/browser templates, and regression invariants to tests and audits. Record exact local commands and honest unavailable gates before closing.

### Local execution evidence — 2026-09-05

- `corepack pnpm --filter chatterbox test`: authenticated/owned Fastify tests plus existing text, Realtime and sanitized pre-Memory baseline evals. Adversarial fixtures cover origin, forged authority, principal/session ownership, expiry, capacity, concurrency, resolver failure and redacted observations. The real locked WorkOS SDK rejects an invalid seal without a live identity call.
- `corepack pnpm --filter @repo/conversation-sdk test`, `corepack pnpm --filter mobile test` and `corepack pnpm --filter @ai/conversation test`: PASS. SDK regressions include cancellation and timeout after response headers; Mobile tests prove ephemeral session/history reset and cancellation before paid work; Memory diagnostics distinguish dependency, contract and unexpected failures.
- The complete local test and typecheck graphs, sequential workspace builds, Biome and dependency-free Elo checks passed. Mobile emits a non-blocking bundle-size warning; no performance budget claim is made.
- Independent review identified and repaired cancellation classification, dev-command environment filtering, authenticated setup instructions and production telemetry backpressure. Final fixed-head review results are recorded in the delivery handoff.
- Trusted context, WorkOS renewal limitations, process-local limits, setup and telemetry ownership are promoted to the linked contexts and Mobile README. No real WorkOS login, paid provider, full-browser journey, cluster deployment or remote CI was performed. SPEC-016 remains the unimplemented concrete Memory bridge.

## Further Notes

Depends on SPEC-046. SPEC-016 follows this slice and owns the concrete request-bound Neo4j Memory bridge. SPEC-033 remains required before external user exposure and SPEC-034 before expanded voice/lifecycle behavior.
