---
id: SPEC-009
title: Run the first real Ana conversation from the Mobile PWA
type: experiment
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/mobile
  - workspaces/apps/conversation-api
  - workspaces/ai/conversation
  - workspaces/ai/agents/ana
context:
  - .agents/context/workflows/mobile.md
  - .agents/context/workspaces/ai/agents.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/architecture.md
  - .agents/rules/context-engineering.md
  - .agents/rules/product-safety-and-privacy.md
  - .agents/rules/react-and-next.md
  - .agents/rules/spec-driven-development.md
adrs:
  - .agents/adrs/0004-product-agent-workspace.md
  - .agents/adrs/0006-mobile-react-vite-pwa.md
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.md
  - .agents/adrs/0023-direct-ai-conversation-topology.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/tdd
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/code-review
evidence:
  - pending
---

# SPEC-009: Run the first real Ana conversation from the Mobile PWA

## Problem Statement

The Mobile PWA presents Ana, captions and Orb state transitions, but the experience is a local simulation. `@ai/ana` contains only identity and `@ai/conversation` contains contracts without a model-backed interaction runtime. There is no browser-safe transport boundary between the Vite application and server-only AI dependencies.

Without one real end-to-end conversation, agent, orchestration and UI decisions remain disconnected. Building voice, multiple agents or background memory first would multiply untested boundaries before the basic request-response path is observable.

## Solution

Create the smallest end-to-end conversational experiment:

```text
Mobile PWA text driver
        -> Fastify conversation API
        -> @ai/conversation runtime
        -> @ai/ana LangChain agent
        -> configured chat model
        -> structured response event
        -> Mobile caption and Orb state
```

Ana owns her product identity and instructions. Conversation owns input validation, deterministic lane selection, context assembly, invocation and normalized runtime events. A minimal Fastify Node application is the composition and HTTP boundary. The PWA uses a development experiment text driver to make the interaction testable while preserving voice-first product direction.

## User Stories

1. As a developer evaluating Amarelo, I want to submit a text message from the Mobile PWA, so that I can exercise a real agent without waiting for speech infrastructure.
2. As a user, I want the Orb to show waiting and speaking states around a real response, so that system activity is legible.
3. As a user, I want Ana's response rendered as a caption, so that the experiment is usable without audio.
4. As a product maintainer, I want Ana's persona owned by `@ai/ana`, so that product behavior is not embedded in the HTTP service.
5. As an AI maintainer, I want Conversation to own routing and final invocation, so that named agents do not absorb transport concerns.
6. As an infrastructure maintainer, I want provider credentials confined to Node runtime configuration, so that secrets never enter the browser bundle.
7. As a tester, I want a deterministic fake chat model at the public runtime seam, so that integration tests do not depend on paid or nondeterministic inference.
8. As an operator, I want provider failures returned as safe normalized errors with request IDs, so that raw SDK errors are not exposed to the PWA.
9. As a safety reviewer, I want the experiment to identify itself as non-clinical support and preserve crisis/escalation constraints, so that a technical demo is not presented as treatment.
10. As a cost engineer, I want per-turn model usage captured when the provider reports it, so that later serving comparisons have a baseline.
11. As a maintainer, I want one agent only, so that the first slice proves the seam before multi-agent abstractions are introduced.
12. As a future voice implementer, I want transport events independent of React state, so that STT/TTS can later reuse the conversation boundary.

## Scope

This experiment owns:

- a production-code Ana agent factory using LangChain `createAgent`;
- versioned Ana instructions and explicit model dependency injection;
- a Conversation invocation contract and deterministic first routing policy;
- normalized conversation lifecycle events and model-usage metadata;
- a minimal Fastify Node application with health and conversation endpoints;
- environment validation and server-only provider composition;
- a development-only text interaction in the Mobile PWA;
- PWA state transitions driven by real HTTP lifecycle rather than timed demo captions;
- deterministic contract, runtime, HTTP and UI-state tests;
- harness updates after the experiment succeeds.

## Implementation Decisions

- The backend framework is Fastify.
- The HTTP application is a deployable app workspace and not part of the browser bundle.
- `@ai/ana` exposes an agent factory that accepts a LangChain-compatible chat model; it does not select credentials or a deployment provider.
- `@ai/conversation` owns the runtime use case, routing decision, message conversion and normalized result.
- LangChain `createAgent` is the first agent-loop abstraction; a custom LangGraph is deferred until required behavior cannot be represented cleanly.
- The first routing policy is deterministic and testable. It does not call an LLM to choose a lane.
- The first experiment uses one text turn and bounded short in-request history. Durable cross-request history is deferred.
- The PWA text driver is explicitly an experiment/development seam, not a reversal of the voice-first product decision.
- The server sends a versioned JSON response for the first slice. Token streaming is deferred unless required to keep the interaction usable.
- Provider credentials, model IDs and deployment settings are validated at the Node composition root and never exposed to Vite.
- Model usage is observational metadata, not a billing source of truth.
- Only Ana is implemented.

## Testing Decisions

### Primary seam

The primary seam is the Fastify application exercised through `app.inject()` with a deterministic fake Conversation runtime. It verifies request validation, response contract, safe failure mapping and correlation IDs without binding a network port.

A second end-to-end experiment test may start the server on an ephemeral port and drive the Mobile conversation client through HTTP when browser state cannot be sufficiently verified at the Fastify seam.

### Secondary seams

- Ana agent factory invoked with a deterministic fake chat model.
- Conversation runtime invoked through its public package API.
- Mobile conversation client and Jotai state transition behavior.
- environment/configuration validation at the application composition root.

### Fixtures and privacy

Tests use synthetic Portuguese messages and synthetic identifiers. No real patient, support-network, clinical or longitudinal data is permitted. Provider-backed smoke testing is opt-in and excluded from default CI.

### Required validation

- failing behavior tests before implementation at each agreed seam;
- package-specific typecheck and tests throughout execution;
- Fastify injection tests;
- Mobile production build and PWA generation;
- repository audits, full typecheck, tests, AI evals and build;
- manual local experiment with an explicitly configured provider;
- Standards and Spec review.

## Acceptance Criteria

- [ ] A user can submit a synthetic text message from the Mobile PWA and receive a real Ana model response through the Fastify API.
- [ ] Mobile Orb/caption state is driven by request lifecycle and response events.
- [ ] `@ai/ana` owns versioned instructions and a LangChain agent factory.
- [ ] `@ai/conversation` owns deterministic routing and normalized invocation behavior.
- [ ] Provider configuration and secrets remain server-only.
- [ ] Fastify rejects malformed or oversized input before invoking the model.
- [ ] Provider/runtime failures produce a safe retryable or terminal error contract with a request ID.
- [ ] Deterministic tests execute without external model calls.
- [ ] Model usage metadata is captured when available and absent safely when unavailable.
- [ ] The experiment visibly preserves non-clinical product positioning.
- [ ] No Memory Nucleus retrieval, queue, worker, voice provider, Nico or Isa behavior is introduced.
- [ ] Full repository CI passes.
- [ ] Both review axes pass and durable behavior is promoted to the harness.

## Failure Behavior

- Invalid input returns a bounded client error without agent invocation.
- Missing server configuration prevents the provider-backed server from starting; deterministic tests remain provider-independent.
- Provider timeout, refusal or unavailable service returns a normalized safe error and resets the PWA from thinking state.
- Aborted browser requests cancel or disregard the active turn without rendering a stale response.
- The PWA never receives provider credentials, stack traces or raw internal messages.
- The experiment does not silently fall back to fabricated agent text when real runtime invocation fails.

## Out of Scope

- Microphone capture, speech-to-text, text-to-speech and interruption.
- Multi-turn durable checkpointing.
- Memory Nucleus serving retrieval.
- Background memory formation.
- Queues, Redis or workers.
- Nico, Isa and dynamic agent selection.
- Authentication, SSO, entitlements and billing.
- Production deployment topology or autoscaling.
- Clinical diagnosis, monitoring or autonomous crisis intervention.

## Evidence and Promotion

Planned evidence:

- deterministic Ana, Conversation and Fastify tests;
- Mobile state/client tests and production build;
- an opt-in local provider smoke trace with redacted identifiers and usage;
- full CI and two-axis review.

After success, promote current runtime behavior to the AI Conversation, agent and Mobile behavior/context documents. Promote only hard-to-reverse provider or transport tradeoffs to ADRs.

## Further Notes

`SPEC-007` and `SPEC-008` are implemented. SPEC-027 moved Conversation to its direct AI path without changing this experiment's runtime contract. This spec remains contract-only until execution begins and does not yet prove longitudinal memory or Memory ROI.
