---
id: SPEC-016
title: Harden the Memory Nucleus as an operational core service
type: feature
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/memory-nucleus
  - workspaces/packages/memory-sdk
  - workspaces/apps/conversation-api
  - operational PostgreSQL composition
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/architecture.rule.md
  - .agents/rules/memory-nucleus.rule.md
  - .agents/rules/product-safety-and-privacy.rule.md
  - .agents/rules/spec-driven-development.rule.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.adr.md
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0009-postgresql-jsonb-fts-memory-store.adr.md
  - .agents/adrs/0012-memory-nucleus-layout.adr.md
  - .agents/adrs/0015-memory-nucleus-mvp-clean-architecture.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-016: Harden the Memory Nucleus as an operational core service

## Problem Statement

The repository already contains a strong Memory domain, PostgreSQL schema, candidate/acceptance flow, authorization-first retrieval and evals, but later phases need an operationally composed public boundary. Two safety gaps require explicit proof: authorization and consent freshness at candidate-to-durable promotion, and the distinction between immediate stop-serving deletion and physical erasure.

## Solution

Compose the existing clean-architecture ports behind the server-side memory-sdk boundary with PostgreSQL as source of truth. Prove an authorized explicit-memory round trip and enforce current authorization immediately before every durable mutation. Implement immediate tombstone/suppression, a deletion/suppression ledger and no-resurrection behavior; do not label that mechanism physical erasure unless a separately evidenced purge contract is implemented.

Establish the versioned operational usage-event, pricing metadata and redacted ledger seams consumed by later background, shadow, A/B and economics phases.

## User Stories

1. As an authorized person, I can write, retrieve and suppress an explicit memory through the public boundary.
2. As a privacy reviewer, revoked, expired or out-of-scope authorization cannot promote a candidate into durable memory.
3. As a person requesting deletion, the memory stops serving immediately and cannot reappear through replay, reindex or restore.
4. As an operator, health, latency, usage and policy outcomes are observable without raw content.
5. As a maintainer, domain/application layers remain independent of transport, database driver and provider SDKs.

## Scope

- Concrete PostgreSQL executor/transaction composition and server-side memory-sdk transport.
- Authorized explicit-memory write/read/suppress/read integration path.
- Current authorization/consent validation immediately before candidate-to-durable mutation.
- Tenant/subject isolation and database defense in depth.
- Immediate tombstone/suppression plus deletion ledger and no-resurrection rules.
- Clear documentation of stop-serving versus physical/cryptographic erasure.
- Health/readiness and redacted operational telemetry.
- Canonical usage-event, immutable pricing metadata and economics ledger contracts.
- Deterministic structured/FTS retrieval with zero normal-path LLM calls.

## Implementation Decisions

- PostgreSQL remains source of truth; indexes and projections are derived.
- AI consumers use `@repo/memory-sdk`; browser code cannot connect to Memory internals.
- Authorization is checked before repository access, before exposure and again immediately before durable writes.
- Promotion carries or resolves current tenant, subject, actor, purpose, decision and consent state; extraction-time approval alone is insufficient.
- MVP delete means immediate tombstone/suppression, removal from normal retrieval and no resurrection through known replay/reindex/restore paths.
- Physical erasure of immutable versions/evidence is not claimed unless a separately reviewed purge implementation proves it.
- Normal retrieval performs zero LLM, vector and web calls.
- Telemetry records identifiers/hashes, counts, timings and policy outcomes, never raw evidence or memory text.
- `netMemoryCost` keeps the canonical cost-minus-avoided-cost sign.

## Testing Decisions

### Primary seam

PostgreSQL-backed integration tests drive the public memory-sdk service boundary through write → read → suppress/delete request → read and verify no normal serving or resurrection.

### Secondary seams

Promotion-time revoke/expiry tests, RLS/cross-tenant attempts, replay/reindex/restore fixtures, health/readiness, telemetry redaction, economics sign and transaction behavior.

### Fixtures and privacy

Synthetic tenants, subjects, actors, decisions, evidence and memories only. Tests isolate and destroy their data. Logs and snapshots prove absence of raw content.

### Required validation

PostgreSQL integration suite, existing Memory evals, SDK contract tests, authorization/deletion adversarial tests, zero-LLM retrieval assertion, full CI and dual review.

## Acceptance Criteria

- [ ] Existing Memory use cases execute through a concrete PostgreSQL-backed public boundary.
- [ ] An authorized explicit write is retrievable, then an immediate suppression request makes it unavailable through normal retrieval.
- [ ] Replay, reindex and restore fixtures do not resurrect a suppressed memory.
- [ ] Candidate-to-durable promotion fails under revoked, expired, denied or out-of-scope authorization/consent at mutation time.
- [ ] Cross-tenant and cross-subject access fails at application and database layers.
- [ ] Stop-serving suppression is not misrepresented as physical erasure.
- [ ] Health/readiness distinguish process health from database/migration readiness.
- [ ] Operational telemetry contains no raw memory or evidence content.
- [ ] Canonical usage-event, immutable pricing and ledger seams are versioned and reusable by later phases.
- [ ] Normal retrieval records zero LLM, vector and web calls.
- [ ] Full CI and both reviews pass.
- [ ] Proven boundaries are promoted to context, rules and checks.

## Failure Behavior

Invalid configuration or database readiness prevents protected service readiness. Authorization uncertainty fails closed. Promotion under stale authority is rejected. Deletion-ledger failure blocks a success claim. Telemetry failure follows a bounded documented policy and can never leak content. Missing price or usage remains unknown rather than zero.

## Out of Scope

Durable queues/workers, shadow serving, A/B flags, vector activation, browser-direct Memory access, production SSO, billing, multi-region replication and a claim of complete physical erasure.

## Evidence and Promotion

Evidence will include PostgreSQL/SDK round-trip tests, promotion-time authorization tests, isolation/no-resurrection fixtures, redaction assertions, zero-LLM retrieval, exact-head CI and both reviews. Proven semantics are promoted to the Memory context and rules.

## Further Notes

Blocked by SPEC-009. This phase reuses the current core rather than creating a second Memory implementation, and it blocks SPEC-012 and SPEC-011.
