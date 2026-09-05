---
id: SPEC-020
title: Preserve deterministic Conversation routing and budgets
type: feature
status: implemented
mode: retrospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/ai/conversation
  - Conversation routing contract
context:
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
adrs:
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.adr.md
  - .agents/adrs/0020-conversation-agent-port.adr.md
  - .agents/adrs/0023-direct-ai-conversation-topology.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/ai/conversation/src/routing
  - workspaces/ai/conversation/src/context
  - workspaces/ai/conversation/src/assurance/evals/conversation-runtime
---

# SPEC-020: Preserve deterministic Conversation routing and budgets

## Problem Statement

Conversation requests vary from brief social turns to planning and research. Using a routing model for every request would add cost and nondeterminism, while one undifferentiated context budget would either waste tokens or truncate complex work. The legacy routing contract captured the intended lanes but used the retired spec format.

## Solution

Conversation deterministically selects one of three internal cognitive lanes with zero routing-model calls and explicit provider-neutral budgets:

- **Reflex**: narrowly recognized greetings, acknowledgements and brief social turns; 800 estimated context tokens, 0 Memory tokens, low reasoning, no Knowledge or tools.
- **Contextual**: default lane; 4,000 estimated context tokens, up to 300 Memory tokens, medium reasoning, no Knowledge or tools by default.
- **Deliberative**: explicit planning, comparison, research, architecture or analysis requests, plus unusually large input; 8,000 estimated context tokens, up to 600 Memory tokens, high reasoning, with Knowledge or tools permitted when separately implemented.

## User Stories

1. As a user, I want a brief turn handled without unnecessary orchestration, so that response cost and latency stay bounded.
2. As a user with a complex request, I want sufficient recent history and reasoning budget, so that useful context is not discarded arbitrarily.
3. As an operator, I want routing decisions and budgets to be deterministic and observable, so that cost regressions can be reproduced.

## Scope

- Deterministic Reflex, Contextual and Deliberative lane selection.
- Provider-neutral, versioned context estimation.
- Contiguous newest-suffix history selection inside the chosen lane budget.
- Preservation of the current user message.
- Memory skipped for Reflex and bounded for other lanes.
- Explicit unavailable diagnostics when Memory retrieval fails while the current conversation continues.
- Routing remains internal to `@ai/conversation`; lanes are not packages or independently deployable agents.

## Implementation Decisions

- Routing makes zero model calls.
- Current input is never dropped to preserve prior history.
- History selection is a contiguous recent suffix, not arbitrary message sampling.
- Token estimates are versioned and provider-neutral rather than presented as tokenizer-perfect counts.
- Memory failure fails closed for exposure and fail-open for the current turn through an empty projection plus diagnostics.
- Knowledge and tool access require both the chosen lane and separately implemented capabilities.

## Testing Decisions

### Primary seam

`ConversationRuntime.execute()` is the primary seam: synthetic turns observe lane, history selection, Memory budget and normalized diagnostics.

### Secondary seams

Routing-policy tests cover classification edges; history-budget tests cover newest-suffix selection and oversized input; Memory-provider doubles cover unavailable behavior.

### Fixtures and privacy

Use synthetic Portuguese and English messages with synthetic identifiers. Fixtures contain no private health, family or account data.

### Required validation

Run Conversation evals, package tests/typecheck, architecture/import/spec audits and full repository CI.

## Acceptance Criteria

- [x] Reflex, Contextual and Deliberative lanes are selected through deterministic code with zero routing-model calls.
- [x] Each lane exposes the documented context, Memory, reasoning, Knowledge and tool budgets.
- [x] Current user input is preserved and recent history is selected as a contiguous newest suffix.
- [x] The estimator is provider-neutral and versioned.
- [x] Reflex skips Memory retrieval.
- [x] Memory failure yields an empty projection with explicit diagnostics without failing the current turn.
- [x] Routing remains internal to the Conversation package and lanes are not separate packages.

## Failure Behavior

Malformed or oversized requests fail validation before agent invocation. Ambiguous requests use the Contextual default. Memory retrieval failure cannot expose partial data and does not prevent a non-memory response. Missing agent registration or invocation failure returns a normalized runtime error.

## Out of Scope

Named-agent model adapters, Fastify transport, browser SDK, real provider calls, background memory formation, Knowledge implementation, tool execution and voice streaming are separately owned.

## Evidence and Promotion

The routing policy, history budget, runtime diagnostics and synthetic evals provide the stable evidence. The resulting contract is promoted here and in the Conversation context and routing ADRs.

## Further Notes

This file replaces the legacy `102-routing.md` contract. SPEC-027 moved the unchanged implementation to the direct `workspaces/ai/conversation/` path and ADR-0023 now owns the current physical topology.

## Retrospective Integrity

This spec was written after the deterministic Conversation runtime and its evals already existed. It documents current observable behavior and current source paths, but it does not claim that the original routing implementation was designed or validated through this exact prospective contract.
