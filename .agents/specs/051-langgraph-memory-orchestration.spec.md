---
id: SPEC-051
title: Execute Memory orchestration with LangGraph and the existing BullMQ worker
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
  - workspaces/memory-nucleus/src/infrastructure/orchestration/langgraph-memory-background.adapter.ts
  - workspaces/memory-nucleus/src/application/background/memory-background-orchestration.port.ts
---

# SPEC-051: Execute Memory orchestration with LangGraph and the existing BullMQ worker

## Problem Statement

The repository has separate voice and Memory implementations. Filling provider secrets does not yet connect spoken patient input, governed long-term storage and subsequent recall. The owner's immediate goal is to talk to the PWA and begin storing useful memory through the existing runtime.

## Solution

A real compiled LangGraph for claimed background Memory jobs, reusing current curation, authority, attempt accounting and deterministic activation.

## User Stories

1. The owner supplies connection secrets and can use the first private voice MVP.
2. The owner can distinguish a spoken response, queued evidence and accepted memory.

## Scope

A real compiled LangGraph for claimed background Memory jobs, reusing current curation, authority, attempt accounting and deterministic activation.

## Implementation Decisions

- The owner selected OpenAI Realtime for spoken answers. LangGraph governs Memory orchestration; do not introduce an STT/text-answer/TTS replacement pipeline.
- Use real @langchain/langgraph nodes and conditional edges for claim/admission, curation, completion and terminal outcomes. A renamed imperative class is insufficient.
- Keep framework-specific composition in infrastructure and policy in application/domain. The same reference-only BullMQ job invokes this graph through a public application port.
- Neo4j claims/outbox/fences own durable delivery and effects. Do not add a second authoritative checkpoint store, transcript history store or LangSmith service requirement.
- Retries remain bounded and every actual provider attempt is accounted. Free/denied/duplicate/no-evidence jobs must terminate without an extraction call.
- No additional LLM classifies or routes graph edges; reuse deterministic decisions and the existing configured extractor.

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

- [ ] The separately started BullMQ worker invokes a compiled LangGraph for eligible jobs.
- [ ] Graph branches reuse current source claims, consent checks and deterministic activation.
- [ ] Duplicate, denied and skipped work does not call a model.
- [ ] Errors release or quarantine the existing fenced claim without inventing success.
- [ ] Graph output and logs contain bounded outcomes and accounting, not transcript dumps.

## Failure Behavior

Missing credentials, expired authority and unavailable dependencies produce bounded explicit failures. Memory uncertainty must not become an assertion of successful storage or a fabricated zero-cost observation. Preserve the user's ability to stop the voice session.

## Out of Scope

Commercial prices, billing, WorkOS rollout, external participants, new canonical databases, full assurance closure and claims of measured voice economics.

## Evidence and Promotion

Implementation and pending live verification are recorded separately. Promote the resulting startup and ownership contract to canonical context. SPEC-049 retains unexecuted acceptance evidence.

## Further Notes

The owner approved Realtime speech plus LangGraph Memory orchestration by answering “primeira opcao” on 2026-09-05, and explicitly deferred WorkOS. This is the shared-understanding confirmation requested by the grilling skill. The scope derives from the settled MVP portion of SPEC-025 and extends the background contract whose filename rank is 025 but durable ID is SPEC-012. Delivery order: SPEC-050 → SPEC-051 → SPEC-052.


Implementation delivered on `feat/spec-051-langgraph-memory-orchestration`. Memory public exports and the worker artifact compiled with pinned @langchain/langgraph 1.4.14. No broker/database/provider scenario or tests were executed. Pending runtime acceptance remains in SPEC-049.

Reference: [LangGraph graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api).
