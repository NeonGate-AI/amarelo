---
id: SPEC-002
title: Establish the Memory Nucleus MVP foundation
type: feature
status: implemented
mode: retrospective
created: 2026-09-02
updated: 2026-09-02
owners:
  - Jonatas Sales
targets:
  - workspaces/memory-nucleus
  - workspaces/packages/memory-sdk
  - memory assurance
context:
  - .agents/context/workspaces/memory-nucleus/
  - .agents/context/workspaces/packages/
rules:
  - .agents/rules/memory-nucleus.rule.md
  - .agents/rules/architecture.rule.md
  - .agents/rules/product-safety-and-privacy.rule.md
adrs:
  - .agents/adrs/
skills:
  - .agents/skills/
evidence:
  - https://github.com/NeonGate-AI/amarelo-v2/pull/1
  - .agents/specs/001-memory-nucleus-product-contract.spec.md
  - workspaces/memory-nucleus/src/
  - workspaces/packages/memory-sdk/src/
  - commit 68dec2000f4eb23756eae8222cb078cb1e4e9a90
---

# SPEC-002: Establish the Memory Nucleus MVP foundation

## Problem Statement

Amarelo needs longitudinal personal memory without making conversation context grow proportionally with history. Treating raw transcripts or a vector database as canonical memory would create cost, privacy, provenance and correction problems.

The platform needed an owned memory domain that separates evidence, candidates, policy judgment, canonical memory, retrieval and bounded context projection. AI consumers also needed a narrow public contract that prevents them from importing persistence or governance internals.

## Solution

Create Memory Nucleus as one `@nucleus/memory` workspace with semantic Clean Architecture direction and expose consumer-safe capabilities through `@repo/memory-sdk`.

The implemented foundation models evidence, candidates, judgments, consent and canonical memory; performs bounded candidate extraction; applies deterministic eligibility and authorization; persists through PostgreSQL adapters; retrieves structured memory through policy filters and token budgets; and measures retrieval and economic behavior through assurance evals.

The serving path returns untrusted structured context projections. It does not return a final prompt and does not require model, vector or web calls for the current MVP retrieval contract.

## User Stories

1. As a patient, I want relevant history available across conversations, so that I do not need to repeat stable information.
2. As a patient, I want memory access authorized before retrieval, so that personal information is private by default.
3. As an AI runtime, I want a bounded context projection, so that longitudinal history does not produce unbounded prompt growth.
4. As a memory operator, I want model output stored as candidates rather than accepted truth, so that deterministic policy remains authoritative.
5. As a user correcting or forgetting information, I want versioned and governed operations, so that stale memory is not silently reused.
6. As a product owner, I want memory processing and serving savings measurable, so that economic claims can later be tested.
7. As an application developer, I want one public SDK boundary, so that consumers do not couple to Memory Nucleus internals.
8. As a reviewer, I want assurance evals for relevance, budgets, authorization and economics, so that silent behavioral regressions are visible.

## Scope

The reconstructed foundation includes:

- memory domain entities and value objects;
- evidence-to-candidate curation flow;
- bounded structured extraction through a LangChain adapter;
- candidate acceptance and resolution use cases;
- consent and authorization ports;
- PostgreSQL repositories and schema validation;
- retrieval eligibility, ranking and projection contracts;
- correction and forgetting contracts;
- token-budget estimation;
- observability and economics computation;
- in-memory adapters and eval suites;
- the public `@repo/memory-sdk` boundary.

## Implementation Decisions

- Memory Nucleus is a single workspace rather than a second agent or nested mini-monorepo.
- Domain and application logic depend on ports; concrete storage and inference live in infrastructure.
- A model may propose candidates but cannot directly activate canonical personal memory.
- Curation performs deterministic preparation, budget, authorization, source-claim and idempotency checks around at most one bounded extraction call.
- Retrieval rechecks policy and authorization before exposure.
- The SDK caps projected serving memory at 600 estimated tokens for the current MVP contract.
- Current search diagnostics require zero model calls, zero vector calls and zero web calls.
- Structured and lexical retrieval are sufficient for the current foundation; pgvector is not assumed to be mandatory.
- Memory records and projections preserve provenance and treat retrieved content as untrusted data.
- Economics compare baseline context, projected context, background processing cost and serving cost avoided without claiming a production ROI.

## Testing Decisions

### Primary seam

The primary observed seam is the public Memory Nucleus and `@repo/memory-sdk` behavior exercised by curation, retrieval and economics evals.

### Secondary seams

- PostgreSQL adapter/schema evaluation.
- In-memory repository behavior.
- Authorization and consent gates.
- Token estimator and budget invariants.
- Repository architecture and memory-invariant checks.

### Fixtures and privacy

Assurance uses synthetic memory subjects and conversations. Production patient data is outside the authorization of this retrospective spec.

### Required validation

The workspace exposes typecheck, curation eval, retrieval eval, economics eval and PostgreSQL validation scripts. Pull request #1 reports these checks green in the merged state.

## Acceptance Criteria

- [x] Memory Nucleus exists as the `@nucleus/memory` workspace.
- [x] AI consumers have an independent `@repo/memory-sdk` contract.
- [x] Evidence, candidates, canonical memory and retrieval projection are separate concepts.
- [x] Candidate extraction is schema-constrained and bounded.
- [x] Canonical activation remains policy-governed rather than model-authoritative.
- [x] Personal retrieval requires authorization before exposure.
- [x] Retrieval returns structured untrusted memory within a hard token budget.
- [x] Current MVP retrieval performs no mandatory LLM, vector or web call.
- [x] Correction, forgetting, provenance and consent contracts exist.
- [x] PostgreSQL and in-memory adapters exist for the implemented seams.
- [x] Curation, retrieval and economics evals exist.
- [x] The foundation is identified as prototype/MVP infrastructure rather than a production service.

## Failure Behavior

- Invalid or oversized curation input is skipped or deferred before unnecessary model use.
- Missing, expired or denied authorization prevents curation or retrieval.
- Replayed source evidence is controlled through fingerprints, source claims and idempotency.
- Extraction timeout or invalid structured output produces a deferred/failed result rather than canonical memory.
- Retrieved items that fail lifecycle, purpose, subject or policy checks are omitted.
- Token budget exhaustion truncates projection rather than expanding serving context.
- Forgetting prevents normal retrieval while purge completion remains a separate lifecycle concern.

## Out of Scope

- A deployed HTTP Memory API.
- A durable queue consumer and background worker process.
- PWA integration.
- A production conversation agent.
- Mandatory semantic vector retrieval.
- Production-scale latency, privacy or cost claims.
- Proven Memory ROI.
- Clinical validation.

## Evidence and Promotion

Primary evidence is the current Memory Nucleus and SDK source, the living Memory Nucleus behavior spec, assurance scripts, the PostgreSQL adapters and pull request #1.

Durable constraints were promoted into Memory Nucleus rules, context, behavior specs, package boundaries and executable architecture/memory checks.

## Further Notes

The existing `MemoryContextProvider` in Conversation consumes the SDK but no real PWA conversation currently closes the longitudinal loop. Queue processing and product integration require a later prospective spec.

## Retrospective Integrity

This spec was reconstructed from current code, package contracts, existing behavior specs, commit history and the merged pull-request report. It describes implemented MVP foundations, not a production deployment.

It does not assert that all original design intentions are recoverable, that the implementation followed this later workflow or that projected economic savings have been measured in production.
