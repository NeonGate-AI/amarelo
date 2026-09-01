---
id: ADR-0002
title: Model Ana, Nico, and Isa as contextual agents
status: accepted
date: 2026-08-25
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0002: Model Ana, Nico, and Isa as contextual agents

## Context

The owner intends each public Elo identity to support a different conversation theme. Contextual behavior may require different prompts, tools, taxonomies, and retrieval views, while Amarelo must avoid converting theme names into diagnoses or separate person identities.

## Decision

Ana, Nico, and Isa will be implemented as product agents coordinated inside the conversation domain and supported by policy-governed longitudinal memory.

In public language, they are Elos. Every participant in the support network chooses their own Elo inside their own account. Elo selection is participant-local and never creates shared conversation state, memory access, permission, or authorization. `IA` remains the term for the underlying model behavior; Elo is not a euphemism for AI.

- Ana focuses on neurodivergence-related context.
- Nico focuses on depression, anxiety, and social-phobia-related context.
- Isa focuses on relationships, self-esteem, and self-care context.

Selection starts a conversation theme; it does not diagnose, clinically classify, or define the person. Ana, Nico, and Isa are agents inside one conversation domain, not separate domains or owners of separate canonical memories.

## Alternatives considered

- **One undifferentiated prompt:** simpler, but rejected as the target because it cannot encode the intended contextual behavior cleanly.
- **Completely independent agents and memories:** rejected because contextual differences must not fragment memory or consent.
- **UI-only personas:** rejected because the owner has explicitly assigned future runtime behavior, although implementation remains pending.

## Consequences

Each agent owns its local conversational instructions and tools inside the
conversation domain. Memory Nucleus, under `elos/memory-nucleus`, owns
durable-memory policy and Personal Memory retrieval; conversation consumes it
only through `@repo/memory-sdk`. Identity, authorization, provenance, audit,
and cost controls remain deterministic boundaries. There is no empty shared AI
kernel; ADR-0012 preserves the admission rule for a future kernel only when two
real AI-domain consumers use identical stable semantics. The initial graph
should remain small and add delegation only when evidence supports it.

## Compliance and verification

Agent code must live under `elos/ai/domains/conversation/src/agents/`, with one feature directory for Ana, Nico, and Isa as needed. Agent prompts use separate `*.prompt.ts` modules and agent implementation files use the `*.agent.ts` suffix. Public language must call the identities Elos, describe themes rather than diagnoses, and reserve IA for the underlying artificial-intelligence behavior. No agent may create a separate canonical memory or grant itself authorization.

## Links

- Product context: `.agents/PRODUCT.md`
- Architecture: `.agents/ARCHITECTURE.md`
- Current workspace decision: `.agents/decisions/0012-memory-nucleus-layout.md`
- Historical workspace decision: `.agents/decisions/0010-elos-and-ai-domain-workspaces.md`
- AI architecture: `elos/ai/ARCHITECTURE.md`
