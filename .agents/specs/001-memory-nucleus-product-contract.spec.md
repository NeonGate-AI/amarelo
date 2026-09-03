---
id: SPEC-019
title: Preserve the canonical Memory Nucleus MVP contract
type: feature
status: implemented
mode: retrospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/memory-nucleus
  - workspaces/packages/memory-sdk
  - Memory Nucleus product contract
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/memory-nucleus.rule.md
  - .agents/rules/product-safety-and-privacy.rule.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.adr.md
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0007-memory-taxonomy-and-longitudinal-projections.adr.md
  - .agents/adrs/0009-postgresql-jsonb-fts-memory-store.adr.md
  - .agents/adrs/0015-memory-nucleus-mvp-clean-architecture.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/agent-memory-systems/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/memory-nucleus/src domain, application, infrastructure and assurance seams
  - workspaces/packages/memory-sdk/src public contracts and validators
  - workspaces/memory-nucleus/src/assurance/evals retrieval, curation and economics suites
---

# SPEC-019: Preserve the canonical Memory Nucleus MVP contract

## Problem Statement

Amarelo needs a stable product contract for longitudinal memory that does not collapse model inference, canonical truth, retrieval and prompt assembly into one opaque agent concern. The legacy Memory Nucleus document described the right flow, but it used the retired specification format and sat outside the executable priority catalog.

## Solution

Preserve the Memory Nucleus MVP as an independent, governed capability with this required flow:

```text
Evidence → Candidate → Judgment + Policy → Canonical Memory → Retrieval → Projection → Token Budget
```

Models may propose candidate memory. Deterministic infrastructure owns canonical activation, authorization, lifecycle, projection and exposure. The AI runtime consumes memory through the public SDK and does not own the memory domain.

## User Stories

1. As a person using Amarelo, I want remembered information to remain attributable, correctable and purpose-bound, so that continuity does not require exposing an ungoverned transcript history.
2. As an AI maintainer, I want a bounded structured projection, so that the serving model receives only authorized information inside an explicit token budget.
3. As a privacy reviewer, I want authorization before repository access and exposure, so that cross-subject or unconsented memory cannot enter an agent context.
4. As a cost owner, I want memory processing cost and avoided serving cost measured separately, so that Memory ROI can be evaluated rather than asserted.

## Scope

- Evidence, candidate and durable-memory separation.
- Semantic and episodic canonical memory with provenance and temporal state.
- Deterministic acceptance and lifecycle policy.
- Authorization before personal-memory retrieval and before exposure.
- Structured or PostgreSQL FTS retrieval without mandatory vector, web or model calls.
- Token-bounded structured projections rather than final prompt ownership.
- Correction, forget/tombstone behavior, subject isolation and basic consent lineage.
- Economics primitives comparing baseline context, projected context, memory processing cost and avoided serving cost.
- Retrieval, authorization, lifecycle, projection and economics eval coverage.

## Implementation Decisions

- `MemoryCandidate` is not durable truth.
- Candidate formation may use bounded semantic inference; canonical activation remains deterministic-policy governed.
- PostgreSQL is the source of truth and search indexes are derived.
- Personal retrieval is authorized before repository access and rechecked before exposure.
- Serving retrieval uses structured and FTS paths without mandatory vector or LLM calls.
- Projection has a hard token budget and returns typed memory data, not an agent-authored prompt.
- Memory-specific economics remain owned by the Nucleus while generic telemetry and evaluation primitives remain shared packages.
- Operational rollout phases remain separately owned by the baseline, core, background, shadow, A/B and scale specs.

## Testing Decisions

### Primary seam

The public Memory use cases and `@repo/memory-sdk` contracts are the primary observable seam for candidate formation, canonical lifecycle, authorized retrieval and bounded projection.

### Secondary seams

PostgreSQL adapters, adversarial authorization fixtures, temporal/lifecycle tests, prompt-injection handling and economics calculations localize failures below the public boundary.

### Fixtures and privacy

Only synthetic tenant, subject, actor, consent and memory fixtures are used. Evals and telemetry must not contain production conversations, raw private transcripts or unredacted durable memory content.

### Required validation

Run repository lint, typecheck, tests, PostgreSQL validation, Memory evals, architecture/import/spec audits and the complete CI workflow.

## Acceptance Criteria

- [x] Candidate formation and canonical memory are represented by separate entities and use cases.
- [x] Deterministic policy governs candidate acceptance into canonical memory.
- [x] Authorization precedes personal-memory repository access and exposure.
- [x] Normal retrieval supports structured and PostgreSQL FTS paths without mandatory LLM or vector calls.
- [x] Projection is typed, marked as untrusted memory data and constrained by a hard token budget.
- [x] Correction, forget/tombstone, provenance and subject isolation have executable seams and eval coverage.
- [x] Economics primitives distinguish memory processing cost from avoided serving cost.
- [x] Retrieval relevance, budgets, authorization, lifecycle, projection safety and economics have dedicated evals.

## Failure Behavior

Authorization uncertainty fails closed for memory exposure. Invalid candidates remain non-canonical. Over-budget projections are reduced or rejected. Retrieval infrastructure failure yields an explicit unavailable result rather than leaking stale or cross-scope data. Economics with missing usage or pricing remain unknown rather than silently becoming zero.

## Out of Scope

This retrospective contract does not prove a real Ana serving baseline, durable queue/worker operation, shadow parity, A/B activation, production erasure semantics, Memory ROI targets or production scale. Those capabilities require their own prospective specs and evidence.

## Evidence and Promotion

The legacy Memory Nucleus requirements were reconciled with the current `@nucleus/memory` implementation, public SDK, PostgreSQL schema and assurance suites. Stable boundaries are already promoted to Memory context, rules, ADRs and mechanical checks.

## Further Notes

This contract replaces the legacy file `101-memory-nucleus.md` as the priority-one canonical product statement. It preserves the original MVP flow while making operational limitations explicit.

## Retrospective Integrity

This spec was reconstructed after the underlying Memory Nucleus foundation had already been implemented. Its evidence comes from the current source tree, PostgreSQL schema, public SDK and executable evals; it does not claim that the original implementation followed the present spec-driven workflow or that later product-serving gates have already passed.
