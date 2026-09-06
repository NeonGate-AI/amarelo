---
id: SPEC-052
title: Connect PWA Realtime speech to longitudinal Memory
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
  - workspaces/microservices/chatterbox/src/realtime/openai-realtime-session.service.ts
  - workspaces/apps/mobile/src/realtime/session/realtime-session.client.ts
  - .agents/context/workspaces/memory-nucleus/local-voice-mvp.md
---

# SPEC-052: Connect PWA Realtime speech to longitudinal Memory

## Problem Statement

The repository has separate voice and Memory implementations. Filling provider secrets does not yet connect spoken patient input, governed long-term storage and subsequent recall. The owner's immediate goal is to talk to the PWA and begin storing useful memory through the existing runtime.

## Solution

OpenAI WebRTC with a server sideband, final patient transcription ingestion, explicit consent, bounded Memory recall, interruption and usage accounting for the local MVP.

## User Stories

1. The owner supplies connection secrets and can use the first private voice MVP.
2. The owner can distinguish a spoken response, queued evidence and accepted memory.

## Scope

OpenAI WebRTC with a server sideband, final patient transcription ingestion, explicit consent, bounded Memory recall, interruption and usage accounting for the local MVP.

## Implementation Decisions

- The owner explicitly chose existing Realtime speech with LangGraph for Memory. The provider owns spoken answers; no second answer-generating model is added.
- Bind provider call identity to a server-created conversation and subject. Secrets and Memory tooling remain in Chatterbox; browser events are not authoritative provider transcripts.
- Configure input transcription and consume finalized patient transcript events from the server sideband. Assistant output, pauses and provisional text never become evidence.
- Add truthful realtime-transcript provenance to the existing Memory boundary. Do not label real speech as synthetic or development text.
- Reuse SPEC-012 atomic ingestion/outbox and SPEC-051 worker graph. Expose buffered/queued/accepted states honestly; do not tell the user a memory is saved before an authoritative result.
- Recall uses the public Memory SDK, current consent and the existing hard budget. Realtime tool results are untrusted data and cannot override instructions.
- The PWA provides explicit memory consent and keeps voice interruptible. Stop/expiry closes the provider session/sideband and microphone; late results cannot re-open a stopped session.
- Audio travels directly between PWA and OpenAI over WebRTC; Chatterbox handles only session establishment and the parallel Memory/tool sideband. Never relay each audio turn through Chatterbox.
- Owner clarification: the Orbs component will later accept a voice connection adapter/configuration prop. That adapter may consume an authorized session factory; it must never receive the permanent OpenAI key. The current @neongate-ai/orbz wrapper is visual and this slice retains its existing controller until that component contract evolves. Model selection is public configuration subject to server policy; credentials stay server-only.
- Configure model, voice and transcription model through server env. Preserve actual audio/text/cached provider usage when reported; prices remain unknown until supplied.
- This authorizes the bounded single-owner local voice bridge. SPEC-033/034 retain broader multi-user and lifecycle scope; no public unauthenticated deployment is introduced.

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

- [ ] The owner can start and stop a voice conversation from the PWA with WorkOS unset in the approved local profile.
- [ ] Final patient speech reaches governed Neo4j evidence and the BullMQ/LangGraph curation loop after explicit consent.
- [ ] A later conversation for the same subject can retrieve accepted Memory through the server tool.
- [ ] The user can interrupt Ana; session stop cleans up audio, provider call and server sideband.
- [ ] Revocation prevents further protected ingestion and recall.
- [ ] Missing memory/provider configuration is visible and does not produce a false saved status.
- [ ] Provider responses record available usage without inferring zero cost or measured margins.

## Failure Behavior

Missing credentials, expired authority and unavailable dependencies produce bounded explicit failures. Memory uncertainty must not become an assertion of successful storage or a fabricated zero-cost observation. Preserve the user's ability to stop the voice session.

## Out of Scope

Commercial prices, billing, WorkOS rollout, external participants, new canonical databases, full assurance closure and claims of measured voice economics.

## Evidence and Promotion

Implementation and pending live verification are recorded separately. Promote the resulting startup and ownership contract to canonical context. SPEC-049 retains unexecuted acceptance evidence.

## Further Notes

The owner approved Realtime speech plus LangGraph Memory orchestration by answering “primeira opcao” on 2026-09-05, and explicitly deferred WorkOS. This is the shared-understanding confirmation requested by the grilling skill. The scope derives from the settled MVP portion of SPEC-025 and extends the background contract whose filename rank is 025 but durable ID is SPEC-012. Delivery order: SPEC-050 → SPEC-051 → SPEC-052.


Provider reference: [OpenAI WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc) and [server sideband controls](https://developers.openai.com/api/docs/guides/realtime-server-controls).

Implementation delivered on `feat/spec-052-realtime-pwa-memory-bridge`. Memory exports, Chatterbox, PWA and runtime integration compilation passed. The first PWA bundle needed generated @repo/ds tokens; the launcher now builds them. No tests, provider calls, browser journey, infrastructure start or CI/deployment validation ran. All live criteria remain unchecked execution evidence under SPEC-049. The Orbs connection prop is an explicitly future component evolution; current direct WebRTC lives in the PWA controller.
