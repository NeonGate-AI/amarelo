---
id: SPEC-009
title: Run the first real Ana PWA conversation and establish the serving baseline
type: experiment
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/mobile
  - workspaces/apps/conversation-api
  - workspaces/packages/conversation-sdk
  - workspaces/ai/conversation
  - workspaces/ai/agents/ana
context:
  - .agents/context/workflows/mobile.md
  - .agents/context/workspaces/ai/agents.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/009-react-and-next.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0004-product-agent-workspace.adr.md
  - .agents/adrs/0006-mobile-react-vite-pwa.adr.md
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.adr.md
  - .agents/adrs/0020-conversation-agent-port.adr.md
  - .agents/adrs/0023-direct-ai-conversation-topology.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/packages/conversation-sdk/src/assurance/evals/conversation-sdk/conversation-sdk.eval.ts
  - workspaces/ai/agents/ana/src/assurance/evals/ana-agent/ana-agent.eval.ts
  - workspaces/apps/conversation-api/src/assurance/evals/conversation-api/conversation-api.eval.ts
  - workspaces/apps/conversation-api/src/assurance/evals/pre-memory-baseline/pre-memory-baseline.eval.ts
  - workspaces/apps/conversation-api/src/assurance/baselines/spec-009-pre-memory-v1.baseline.json
  - workspaces/apps/mobile/src/assurance/evals/mobile-conversation/mobile-conversation.eval.ts
  - .audit/import-boundaries.audit.sh
---

# SPEC-009: Run the first real Ana PWA conversation and establish the serving baseline

## Problem Statement

The Mobile PWA still presents a local simulation. `@ai/conversation` provides a framework-neutral runtime, but there is no browser-safe SDK, Fastify composition root, model-backed Ana implementation or comparable pre-Memory serving baseline. Without that denominator, later claims about context reduction, latency, quality, avoided cost and Memory ROI are invalid.

## Solution

Create the smallest real synthetic text-turn path:

```text
Mobile → @repo/conversation-sdk → Fastify conversation-api
       → ConversationRuntime → Ana → injected chat model
```

`@repo/conversation-sdk` is browser-safe. `conversation-api` owns server configuration, provider construction and health/turn endpoints. Ana owns versioned instructions and accepts an injected model adapter. ConversationRuntime continues to own validation, deterministic routing, history budgeting, Memory seam and normalized invocation.

Produce a versioned baseline artifact for deterministic fixtures without recording prompt text, response text or raw Memory.

## User Stories

1. As a developer, I can submit a synthetic text turn through the Mobile HTTP lifecycle and observe a complete real runtime path.
2. As a user, Orb and caption state follow the request lifecycle and recover safely on abort or failure.
3. As an operator, I can correlate context size, calls, tokens, latency, cost and quality without collecting sensitive content.
4. As a security reviewer, provider credentials and raw SDK failures remain server-only.
5. As a tester, default CI runs deterministically without paid or external inference.

## Scope

- Create browser-safe `@repo/conversation-sdk` contracts and client.
- Expand `@ai/ana` with versioned PT-BR instructions and an injected model adapter.
- Create `workspaces/apps/conversation-api` with Fastify health and turn endpoints.
- Compose ConversationRuntime, Ana and the configured model.
- Connect Mobile to the HTTP lifecycle through the approved bounded development text seam.
- Produce a sanitized, versioned baseline artifact and deterministic quality evaluation.
- Promote proven transport, metrics and safety boundaries to the harness.

## Implementation Decisions

- Use `fastify` 5.12.1 and `@langchain/openai` 1.5.11 at the Node composition/provider boundary.
- Reuse `@langchain/core` 1.2.9, `zod` 4.4.3 and `tsx` 4.23.12.
- Do not add the `langchain` meta-package.
- Ana does not create credentials or select environment configuration.
- The existing ConversationRuntime route, history budget and public ports remain authoritative.
- The baseline separates estimated tokens from provider-reported input/output/total tokens.
- Each artifact records model calls, comparable context size, total latency, first-token latency when available, immutable rate-snapshot ID, calculated cost, fixture version, evaluator version, quality result and correlation ID.
- Missing provider usage or first-token latency is explicit `unavailable`, never invented or coerced to zero.
- Telemetry does not record prompts, responses, raw transcripts, raw Memory or provider secrets.
- No Memory retrieval, curation, worker, voice provider, Nico or Isa behavior is added.

## Testing Decisions

### Primary seam

Fastify `app.inject()` drives the public turn endpoint through a deterministic model double and observes validation, lifecycle events, response contract, usage and safe errors without binding a network port.

### Secondary seams

Ana adapter tests, conversation-sdk browser-safety checks, ConversationRuntime regressions, Mobile state transitions and baseline serialization/cost calculation.

### Fixtures and privacy

Use synthetic Portuguese turns and synthetic IDs. Default snapshots contain metrics and hashes only. Optional provider smoke output remains redacted and outside default CI.

### Required validation

Red-first tests at each public seam, package typechecks/tests, Fastify injection tests, Mobile build/PWA generation, baseline eval, full Elo audits, lint, repository typecheck/tests/evals/build and two independent reviews.

## Acceptance Criteria

- [x] A synthetic Mobile text turn reaches the browser-safe SDK, Fastify, ConversationRuntime and Ana and returns the configured-model response.
- [x] Mobile state is driven by request lifecycle and resets safely on abort or failure.
- [x] Ana owns versioned instructions and an injected model adapter.
- [x] Provider secrets and raw internal failures never reach the browser.
- [x] Malformed and oversized requests are rejected before model invocation.
- [x] Deterministic tests make zero external model calls.
- [x] Baseline artifacts separate estimated and provider-reported usage and record calls, context size, total/first-token latency, immutable rate snapshot, cost, fixture/evaluator versions, quality and correlation.
- [x] Prompt, response, transcript and raw Memory content are absent from logs and artifacts.
- [x] No Memory serving or background behavior is introduced.
- [x] Full CI and both reviews pass.
- [x] Proven runtime and metric definitions are promoted to the harness.

## Failure Behavior

Invalid input fails before invocation. Missing provider configuration prevents provider-backed startup without breaking deterministic tests. Timeouts and refusals return a safe correlated error. Aborted requests cannot render stale responses. Missing price or usage data blocks cost comparison rather than using guessed values.

## Out of Scope

Microphone, STT, TTS, interruption, durable history, Memory serving/formation, Redis/workers, Nico/Isa, production authentication, billing, deployment scale, clinical claims and production ROI.

## Evidence and Promotion

The browser-safe SDK eval proves strict outbound/inbound contracts, abort, timeout, safe-error, invalid-response, and browser-source boundaries. The Ana eval proves injected model ownership, versioned instructions, untrusted context delimiting, normalized usage, and rejection of invalid model output without credentials or external calls. Its adversarial fixture also proves that literal closing delimiters inside an untrusted Memory statement are escaped before model input. Fastify injection proves the complete SDK → API → ConversationRuntime → Ana path, request-size/schema rejection before model invocation, server-only provider configuration, safe correlated failures, and the LangChain adapter.

The Mobile eval proves exact development-flag gating, request-driven state, success, safe failure, cancellation, overlapping-request abort, stale-result rejection, and absence of new storage/cache paths. `spec-009-pre-memory-v1.baseline.json` is regenerated by the package eval and records five estimated context tokens separately from 40/8/48 provider-reported tokens, one model call, 25 ms deterministic latency, explicit unavailable first-token latency, an immutable synthetic rate snapshot, 16 micro-USD synthetic cost, versioned quality checks, hashes, and correlation IDs. It contains no raw prompt, response, transcript, Memory, credential, or provider failure.

Conversation production source now resolves its own internal directory barrels without exporting private TypeScript aliases into consumers. Ana and `conversation-api` consume only the declared `@ai/conversation` package boundary, while `.audit/import-boundaries.audit.sh` rejects consumer remapping into Conversation's private source tree. The agents, Conversation, and Mobile context documents record only these proven boundaries. Exact-head CI and the two independent PR review axes remain the merge record.

## Further Notes

This is the canonical pre-Memory baseline and blocks SPEC-016. The bounded text driver is a development and test seam, not a public reversal of Amarelo's voice-first direction.
