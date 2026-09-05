---
id: SPEC-016
title: Harden the Memory Nucleus as an operational core service
type: feature
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - workspaces/memory-nucleus
  - workspaces/packages/memory-sdk
  - workspaces/microservices/chatterbox
  - operational Neo4j composition
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.adr.md
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0033-neo4j-canonical-memory-graph.adr.md
  - .agents/adrs/0034-memory-outbox-and-redis-isolation.adr.md
  - .agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md
  - .agents/adrs/0012-memory-nucleus-layout.adr.md
  - .agents/adrs/0015-memory-nucleus-mvp-clean-architecture.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-016: Harden the Memory Nucleus as an operational core service

## Problem Statement

The repository already contains a strong Memory domain, a PostgreSQL reference adapter, candidate/acceptance flow, authorization-first retrieval and evals, but later phases need an operationally composed Neo4j boundary. Two safety gaps require explicit proof: authorization and consent freshness at candidate-to-durable promotion, and the distinction between immediate stop-serving deletion and physical erasure.

## Solution

Compose the existing clean-architecture ports through a request-bound Memory SDK adapter at Chatterbox's server composition root, with Neo4j as the canonical Memory graph. The adapter consumes the trusted actor/session/conversation context established by SPEC-047; browser-supplied identifiers or purpose are not authorization. Prove an authorized explicit-memory round trip and enforce current authorization immediately before every durable mutation. Commit evidence, Memory lifecycle state and a pending outbox event in one graph transaction. Implement immediate tombstone/suppression, a deletion/suppression ledger and no-resurrection behavior; do not label that mechanism physical erasure unless a separately evidenced purge contract is implemented.

Establish the versioned operational usage-event, pricing metadata and redacted ledger seams consumed by later background, shadow, A/B and economics phases.

## User Stories

1. As an authorized person, I can write, retrieve and suppress an explicit memory through the public boundary.
2. As a privacy reviewer, revoked, expired or out-of-scope authorization cannot promote a candidate into durable memory.
3. As a person requesting deletion, the memory stops serving immediately and cannot reappear through replay, reindex or restore.
4. As an operator, health, latency, usage and policy outcomes are observable without raw content.
5. As a maintainer, domain/application layers remain independent of transport, database driver and provider SDKs.

## Scope

- Concrete Neo4j executor/transaction composition and request-bound Memory SDK adapter in the existing Chatterbox process.
- Atomic evidence, Memory lifecycle and pending-outbox graph writes.
- Authorized explicit-memory write/read/suppress/read integration path.
- Current authorization/consent validation immediately before candidate-to-durable mutation.
- Tenant/subject isolation and database defense in depth.
- Immediate tombstone/suppression plus deletion ledger and no-resurrection rules.
- Clear documentation of stop-serving versus physical/cryptographic erasure.
- Health/readiness and redacted operational telemetry.
- Canonical usage-event, immutable pricing metadata and economics ledger contracts.
- Deterministic structured/FTS retrieval with zero normal-path LLM calls.

## Implementation Decisions

- Neo4j is the canonical Memory source; full-text/vector indexes and longitudinal projections are derived.
- AI consumers use `@repo/memory-sdk`; browser code cannot connect to Memory internals.
- Chatterbox's composition root may bind the public `@nucleus/memory` API to a scoped SDK adapter; AI consumers still import only `@repo/memory-sdk`. This phase does not create a separate Memory HTTP microservice.
- Reuse SPEC-047 authentication and correlation rather than creating a second session authority. Resolve subject, actor, tenant and purpose server-side and revalidate the specific Memory consent/authorization decision at the protected boundary.
- Authorization is checked before repository access, before exposure and again immediately before durable writes.
- Promotion carries or resolves current tenant, subject, actor, purpose, decision and consent state; extraction-time approval alone is insufficient.
- MVP delete means immediate tombstone/suppression, removal from normal retrieval and no resurrection through known replay/reindex/restore paths.
- Physical erasure of immutable versions/evidence is not claimed unless a separately reviewed purge implementation proves it.
- Normal retrieval performs zero LLM and web calls; vector use is independently measurable and gated by retrieval evidence.
- Telemetry records identifiers/hashes, counts, timings and policy outcomes, never raw evidence or memory text.
- `netMemoryCost` keeps the canonical cost-minus-avoided-cost sign.

## Testing Decisions

### Primary seam

Neo4j-backed integration tests drive the public memory-sdk service boundary through write → read → suppress/delete request → read and verify no normal serving or resurrection.

### Secondary seams

Promotion-time revoke/expiry tests, adversarial cross-tenant graph queries, replay/reindex/restore fixtures, health/readiness, telemetry redaction, economics sign and transaction behavior.

### Fixtures and privacy

Synthetic tenants, subjects, actors, decisions, evidence and memories only. Tests isolate and destroy their data. Logs and snapshots prove absence of raw content.

### Required validation

Vitest plus Testcontainers integration suite for Neo4j, existing Memory evals, SDK contract tests, authorization/deletion adversarial tests, zero-LLM retrieval assertion, full CI and dual review.

## Acceptance Criteria

- [ ] Existing Memory use cases execute through a concrete Neo4j-backed public boundary.
- [ ] Evidence, Memory lifecycle state and its pending outbox event commit atomically in Neo4j.
- [ ] An authorized explicit write is retrievable, then an immediate suppression request makes it unavailable through normal retrieval.
- [ ] Replay, reindex and restore fixtures do not resurrect a suppressed memory.
- [ ] Candidate-to-durable promotion fails under revoked, expired, denied or out-of-scope authorization/consent at mutation time.
- [ ] Cross-tenant and cross-subject access fails at application and database layers.
- [ ] Stop-serving suppression is not misrepresented as physical erasure.
- [ ] Health/readiness distinguish process health from database/migration readiness.
- [ ] Operational telemetry contains no raw memory or evidence content.
- [ ] Canonical usage-event, immutable pricing and ledger seams are versioned and reusable by later phases.
- [ ] Normal retrieval records zero LLM and web calls and reports whether full-text or vector retrieval ran.
- [ ] Full CI and both reviews pass.
- [ ] Proven boundaries are promoted to context, rules and checks.

## Failure Behavior

Invalid configuration or graph readiness prevents protected service readiness. Authorization uncertainty fails closed. Promotion under stale authority is rejected. Outbox or deletion-ledger failure rolls back the protected mutation. Telemetry failure follows a bounded documented policy and can never leak content. Missing price or usage remains unknown rather than zero.

## Out of Scope

BullMQ dispatch/workers, shadow serving, A/B flags, vector quality activation, browser-direct Memory access, production SSO, billing, multi-region replication and a claim of complete physical erasure.

## Evidence and Promotion

Evidence will include Neo4j/SDK round-trip tests, atomic outbox tests, promotion-time authorization tests, isolation/no-resurrection fixtures, redaction assertions, zero-LLM retrieval, exact-head CI and both reviews. Proven semantics are promoted to the Memory context and rules.

## Further Notes

Blocked by SPEC-047 and the retained SPEC-009 baseline. This phase reuses the current core rather than creating a second Memory implementation, and it blocks SPEC-012 and SPEC-011. SPEC-047 supplies authenticated text transport and observations, not durable Memory consent or the Neo4j adapter; those are proved here.
