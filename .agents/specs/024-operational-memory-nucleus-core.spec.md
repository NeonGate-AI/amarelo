---
id: SPEC-016
title: Harden the Memory Nucleus as an operational core service
type: feature
status: in-progress
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
- Patient-attributed text evidence at the trusted ingestion boundary, separate from transient dialogue and content-free timing telemetry, as defined by SPEC-025.
- Deterministic structured/FTS retrieval with zero normal-path LLM calls.

## Implementation Decisions

- Neo4j is the canonical Memory source; full-text/vector indexes and longitudinal projections are derived.
- AI consumers use `@repo/memory-sdk`; browser code cannot connect to Memory internals.
- Chatterbox's composition root may bind the public `@nucleus/memory` API to a scoped SDK adapter; AI consumers still import only `@repo/memory-sdk`. This phase does not create a separate Memory HTTP microservice.
- The trusted Chatterbox composition maps external WorkOS tenant/person identifiers to deterministic tenant-scoped UUIDv8 identities using `amarelo-memory-identity-v1` and SHA-256. Actor and subject use the same person namespace; changing that mapping requires a data migration. Hash-derived identifiers are not an authorization grant or an anonymity claim.
- Reuse SPEC-047 authentication and correlation rather than creating a second session authority. Resolve subject, actor, tenant and purpose server-side and revalidate the specific Memory consent/authorization decision at the protected boundary.
- The initial source adapter persists only eligible text attributable to the authenticated subject's own submitted speech evidence. A generic `person` role alone does not prove patient attribution. Record actor, subject, source kind, stable source-turn identity/version and provenance from the trusted request boundary; client-supplied history is not authoritative evidence.
- Filter the evidence artifact before its atomic evidence/outbox write, not only before extraction. Ana's utterances, pause labels and inactivity never enter the initial personal-memory evidence artifact. Reject mismatched or unresolved attribution before protected persistence. Preserve broader contribution/provenance contracts without enabling support-network ingestion in this slice.
- SPEC-047 development text and synthetic transcript fixtures can exercise this adapter, but must be labeled as such; they do not prove microphone/transcription operation. This slice adds no raw-audio persistence requirement.
- Canonical usage contracts distinguish patient speech duration, assistant speech duration, inactivity, provider audio/text/cached usage, nullable cost and measurement provenance. Include workload/profile and pricing/rate-currency/BRL-conversion versions where applicable. Unavailable audio timings in a text-only run remain unknown, never fabricated.
- Economic profile labels are server-owned attribution, never authorization grants. Internal Memory validation is distinct from the proposed Free profile, whose background-formation exclusion remains in SPEC-025. These seams are operational telemetry, not a billing or quota engine.
- Authorization is checked before repository access, before exposure and again immediately before durable writes.
- Promotion carries or resolves current tenant, subject, actor, purpose, decision and consent state; extraction-time approval alone is insufficient.
- MVP delete means immediate tombstone/suppression, removal from normal retrieval and no resurrection through known replay/reindex/restore paths.
- Physical erasure of immutable versions/evidence is not claimed unless a separately reviewed purge implementation proves it.
- Normal retrieval performs zero LLM and web calls; vector use is independently measurable and gated by retrieval evidence.
- Telemetry records identifiers/hashes, counts, timings and policy outcomes, never raw evidence or memory text.
- `netMemoryCost` keeps the canonical cost-minus-avoided-cost sign.

### Execution units

The maintained GitHub graph replaces the already completed historical PostgreSQL tickets without rewriting that evidence:

1. [Issue #82](https://github.com/NeonGate-AI/amarelo/issues/82): SDK write/read/suppress round trip, Neo4j migrations/atomic outbox, patient-only evidence and Chatterbox composition; unblocked after SPEC-047 and PR #81.
2. [Issue #83](https://github.com/NeonGate-AI/amarelo/issues/83): Mutation-time authority, isolation and replay/reindex/restore suppression assurance; blocked by unit 1.
3. [Issue #84](https://github.com/NeonGate-AI/amarelo/issues/84): Versioned redacted usage/pricing ledger and health/readiness evidence; blocked by unit 1.
4. [Issue #85](https://github.com/NeonGate-AI/amarelo/issues/85): Full validation, canonical promotion and independent final reviews; blocked by units 2 and 3.

The first unit includes a bundled public Memory package (JavaScript and declarations), so Chatterbox resolves no producer-private aliases. The existing domain/application use cases remain the operational policy owners. No internal package subpath API is introduced.

## Testing Decisions

### Execution environment

The owner authorized remote GitHub work and gated integration into `staging` on 2026-09-05. This workspace cannot run containers; the mandatory public SDK integration suite therefore runs in GitHub Actions with disposable Testcontainers Neo4j. Local typechecks and deterministic tests support that same implementation. A missing container runtime is never counted as behavioral red, and the infrastructure gate is mandatory with no skip/fallback. Commits are attributed to the owner account `neonjonatas` (Jonatas Sales).

### Primary seam

Neo4j-backed integration tests drive the public memory-sdk service boundary through write → read → suppress/delete request → read and verify no normal serving or resurrection.

### Secondary seams

Promotion-time revoke/expiry tests, adversarial cross-tenant graph queries, replay/reindex/restore fixtures, health/readiness, telemetry redaction, economics sign and transaction behavior.

Ingestion fixtures include mixed person/Ana turns, assistant-only input, inactivity-only input, forged client roles, actor/subject mismatch and synthetic development-text provenance. Observe persisted evidence as well as extraction input; telemetry must not become an alternative content store.

### Fixtures and privacy

Synthetic tenants, subjects, actors, decisions, evidence and memories only. Tests isolate and destroy their data. Logs and snapshots prove absence of raw content.

### Required validation

Vitest plus Testcontainers integration suite for Neo4j, existing Memory evals, SDK contract tests, authorization/deletion adversarial tests, zero-LLM retrieval assertion, full CI and dual review.

## Acceptance Criteria

- [ ] Existing Memory use cases execute through a concrete Neo4j-backed public boundary.
- [ ] Evidence, Memory lifecycle state and its pending outbox event commit atomically in Neo4j.
- [ ] Persisted MVP evidence contains only eligible patient-attributed text; Ana output, silence and forged or unresolved source attribution cannot enter that artifact.
- [ ] Development text is distinguishable from observed voice evidence; patient/assistant/inactivity durations and costs have explicit units, provenance and unknown states without storing content in telemetry.
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

Initial behavioral red: [CI 33956277041](https://github.com/NeonGate-AI/amarelo/actions/runs/33956277041), head `0baca4e14d91bf0c0f46ef5962b21e3b618d986c`, starts the real Neo4j container and driver, then fails at the missing public SDK operation. Audits, lint, typechecks and existing tests pass before that failure. [PR #86](https://github.com/NeonGate-AI/amarelo/pull/86) owns delivery; no completion or merge is claimed by this red checkpoint.

Evidence will include Neo4j/SDK round-trip tests, atomic outbox tests, promotion-time authorization tests, isolation/no-resurrection fixtures, redaction assertions, zero-LLM retrieval, exact-head CI and both reviews. Proven semantics are promoted to the Memory context and rules.

## Further Notes

SPEC-025 reconciliation (2026-09-05): the owner accepted the consolidated discovery and requested this contract revision using the delivered ZIP. The discovery hold is resolved; execution was subsequently authorized and is now in progress. The initial evidence and telemetry contracts above implement the boundaries in [SPEC-025](007-plans-and-entitlements.spec.md). Remaining commercial decisions do not block this internal technical slice. This revision changes contracts only and does not claim a remote merge.

Blocked by SPEC-047 and the retained SPEC-009 baseline. This phase reuses the current core rather than creating a second Memory implementation, and it blocks SPEC-012 and SPEC-011. SPEC-047 supplies authenticated text transport and observations, not durable Memory consent or the Neo4j adapter; those are proved here.
