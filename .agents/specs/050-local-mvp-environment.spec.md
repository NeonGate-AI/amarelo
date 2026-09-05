---
id: SPEC-050
title: Prepare the local voice MVP environment without WorkOS
type: feature
status: implemented
mode: prospective
created: 2026-09-05
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/mobile
  - workspaces/microservices/chatterbox
  - workspaces/memory-nucleus
  - workspaces/packages/runtime
context:
  - .agents/context/workspaces/memory-nucleus/operational-memory.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0033-neo4j-canonical-memory-graph.adr.md
  - .agents/adrs/0034-memory-outbox-and-redis-isolation.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/grilling/SKILL.md
  - .agents/skills/grill-me/SKILL.md
evidence:
  - workspaces/packages/runtime/mvp.md
  - workspaces/packages/runtime/src/mvp/local-mvp.command.ts
  - workspaces/microservices/chatterbox/src/authentication/local-session.adapter.ts
---

# SPEC-050: Prepare the local voice MVP environment without WorkOS

## Problem Statement

The repository has separate voice and Memory implementations. Filling provider secrets does not yet connect spoken patient input, governed long-term storage and subsequent recall. The owner's immediate goal is to talk to the PWA and begin storing useful memory through the existing runtime.

## Solution

Local PWA and Chatterbox startup, stable server-owned development identity, .env.template files, isolated Redis Queue/Cache, Neo4j connection and Memory worker startup.

## User Stories

1. The owner supplies connection secrets and can use the first private voice MVP.
2. The owner can distinguish a spoken response, queued evidence and accepted memory.

## Scope

Local PWA and Chatterbox startup, stable server-owned development identity, .env.template files, isolated Redis Queue/Cache, Neo4j connection and Memory worker startup.

## Implementation Decisions

- WorkOS is explicitly deferred by the owner. Local mode is opt-in and loopback-only; preserve origin checks, session ownership, expiry and request-scoped Memory authorization.
- Secrets are supplied later by the owner. Never put OpenAI, Neo4j or Redis credentials in VITE variables, source, logs or a committed .env.
- Use the existing Kubernetes Redis topology; Neo4j supports the owner's hosted URI and explicit database. Do not reintroduce PostgreSQL or a second canonical store.
- Provide reproducible startup instructions and a stable development identity so later sessions reach the same subject's memory. Consent remains explicit.
- Default the first usable setup to one owner on localhost. Hosted multi-user rollout and WorkOS account integration remain outside this slice.

## Testing Decisions

### Primary seam

The configured public PWA/Chatterbox/Memory path owned by this slice, using the supplied environment contract.

### Secondary seams

Only configuration failures, session lifecycle, queue fencing and provider events that cannot be localized through the primary seam.

### Fixtures and privacy

Synthetic examples only. No real keys, personal transcript, audio or private Memory enters repository artifacts or logs.

### Required validation

The owner retains the delivery-first instruction and explicitly deferred broad tests/evals/CI/deployment validation to SPEC-049. Perform only integration compilation necessary to produce usable artifacts; never run paid provider calls without the owner's supplied secrets and requested live execution. Future evidence must cover this spec's public seam and failure behavior.

## Acceptance Criteria

- [ ] The supplied templates name every value required for PWA, Chatterbox and the Memory worker.
- [ ] The owner can start a loopback-only session without WorkOS credentials using an explicit local mode.
- [ ] Local mode cannot silently become a production authentication fallback.
- [ ] The same development identity maps to the same Memory subject across restarts.
- [ ] Startup exposes clear missing-configuration failures without printing secrets.

## Failure Behavior

Missing credentials, expired authority and unavailable dependencies produce bounded explicit failures. Memory uncertainty must not become an assertion of successful storage or a fabricated zero-cost observation. Preserve the user's ability to stop the voice session.

## Out of Scope

Commercial prices, billing, WorkOS rollout, external participants, new canonical databases, full assurance closure and claims of measured voice economics.

## Evidence and Promotion

Implementation and pending live verification are recorded separately. Promote the resulting startup and ownership contract to canonical context. SPEC-049 retains unexecuted acceptance evidence.

## Further Notes

The owner approved Realtime speech plus LangGraph Memory orchestration by answering “primeira opcao” on 2026-09-05, and explicitly deferred WorkOS. This is the shared-understanding confirmation requested by the grilling skill. The scope derives from the settled MVP portion of SPEC-025 and extends the background contract whose filename rank is 025 but durable ID is SPEC-012. Delivery order: SPEC-050 → SPEC-051 → SPEC-052.


Implementation delivered on `feat/spec-050-local-mvp-environment`. The assembled local MVP runtime and Chatterbox passed integration compilation; infrastructure startup and live acceptance remain unexecuted under the owner waiver and SPEC-049. Unchecked criteria represent pending execution evidence.
