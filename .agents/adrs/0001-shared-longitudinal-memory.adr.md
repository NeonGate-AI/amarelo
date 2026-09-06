---
id: ADR-0001
title: Use one shared longitudinal memory per person
status: accepted
date: 2026-08-25
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0001: Use one shared longitudinal memory per person

## Context

Longitudinal memory is Amarelo's central engineering system. Ana, Nico, and Isa need different conversational context, but independent canonical stores would fragment identity, create contradictions, complicate revocation, and make provenance difficult to preserve.

## Decision

Amarelo will maintain one person-centric longitudinal memory and expose policy-governed views to product agents and recipients.

Conversation history, LangGraph checkpoints, model context, embeddings, and agent working state are supporting artifacts, not separate canonical memories.

Separate private accounts may submit provenance-bearing candidates about the same person. A contribution never merges accounts or exposes the contributor's private conversation. Permission to contribute and permission to read are evaluated separately, and a relationship alone grants neither.

## Alternatives considered

- **One memory per agent or Elo identity:** rejected because it fragments the person's history and multiplies lifecycle and consent logic.
- **Conversation transcripts as memory:** rejected because raw interaction is too private, noisy, and semantically different from accepted durable memory.
- **Vector index as source of truth:** rejected because retrieval infrastructure cannot own authority, provenance, correction, or deletion semantics.

## Consequences

Shared policy, provenance, authorization, audit, correction, supersession, and deletion logic become foundational infrastructure. Conversation agents require scoped reads and writes rather than their own canonical stores.

## Compliance and verification

Implementations must identify a shared memory contract and show that agent-specific views are filtered from it. No agent module may silently create an independent person profile as authoritative state.

## Links

- Product context: `.agents/context/product/overview.md`
- Memory contract: `.agents/rules/006-memory-nucleus.rule.md`
- Runtime design: `.agents/context/workspaces/memory-nucleus/overview.md`
- Ownership boundary: `.agents/adrs/0012-memory-nucleus-layout.adr.md`
