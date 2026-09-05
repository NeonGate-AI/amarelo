---
id: SPEC-012
title: Build durable background memory curation through deterministic activation
type: experiment
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - workspaces/microservices/chatterbox
  - workspaces/memory-nucleus
  - background queue infrastructure
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/ai/conversation.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
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

# SPEC-012: Build durable background memory curation through deterministic activation

## Problem Statement

The current curation use case is a useful bounded job body, but the repository does not yet prove durable enqueue, worker leases, retry/backoff, terminal handling, backlog control, queue age, per-job cost or end-to-end idempotency. Candidate persistence alone is not durable memory, and synchronous extraction would add serving latency.

## Solution

Commit the eligible patient-attributed text evidence defined by SPEC-016 and an outbox event in one Neo4j transaction, publish a reference-only versioned BullMQ job to the dedicated Redis Queue instance, and process it in a long-lived Node worker. The worker rechecks authorization/consent and source eligibility, loads evidence, invokes existing curation logic and submits eligible candidates to deterministic acceptance. Queue payloads contain identifiers and correlation metadata, never transcript or memory text.

Advance to shadow only when a versioned load fixture proves controlled backlog, queue age, throughput, terminal outcomes, known cost per completed job and strong-model escalation below 5%.

## User Stories

1. Conversation completes without waiting for Memory extraction.
2. Committed evidence cannot be lost between database and queue publication.
3. Duplicate delivery creates one governed effect.
4. Revoked authority prevents protected work.
5. Operators can observe queue age, backlog, throughput, attempts, cost and outcomes without raw content.
6. Expensive reasoning remains exceptional and measured.
7. Worker shutdown safely finishes or releases in-flight work.

## Scope

- Transactional evidence/outbox boundary and versioned completion event.
- One durable queue and one long-lived Node worker, started separately from Chatterbox but owned by `workspaces/memory-nucleus`.
- Reference-only payloads and persistent local broker configuration.
- Lease/fencing, bounded retry with backoff/jitter and terminal quarantine/dead-letter behavior.
- Current authorization/consent checks before load, inference and durable activation.
- End-to-end idempotency and deterministic cross-source canonical deduplication.
- Redacted queue and per-job economics through SPEC-016 ledger contracts.
- A versioned 100-job load fixture and go/no-go result.
- No change to a later user-visible response.

## Implementation Decisions

- Neo4j commits evidence and outbox atomically; no unsafe graph/queue dual write.
- Dispatcher and worker implementation live in the existing Memory Nucleus workspace's infrastructure boundary and run as a separately started process. Do not create an undeclared application or nested workspace for the worker. Keep driver/BullMQ imports outside domain/application and update the owning runtime/container contract when this process becomes deployable.
- Delivery is at least once; source claims, fingerprints, fencing and activation idempotency produce exactly-once effects.
- BullMQ uses the physically separate Redis Queue service. Redis Cache is prohibited for job delivery and neither Redis role is a source of truth.
- The dispatcher uses stable `jobId = eventId` and marks the outbox event published only after enqueue succeeds; this is eventual delivery, not a distributed transaction.
- Every worker defines a stable effect key and remains safe under duplicate delivery.
- Critical authorization, consent, request validation and safety guardrails remain synchronous; workers revalidate authority before protected work.
- The model proposes candidates only; deterministic policy decides activation.
- Preserve the existing person-only preparation and at most one extractor invocation per newly claimed bounded batch. Select only finalized, eligible source deltas or explicit Memory requests under deterministic policy; merely ending a turn, generating an Ana response or observing inactivity does not authorize formation.
- Whole patient turns and their stable source versions are the processing units. Partial transcript updates cannot create repeated candidates; duplicate or already-claimed versions stop before model use. Bounded batches may combine fragmented interactions without replaying the complete dialogue or losing unprocessed source state.
- Assistant turns are neither evidence nor extractor context. Preserve abstention when the eligible patient text alone does not support a candidate, including ambiguous acknowledgments; do not reconstruct asserted patient facts from Ana's suggestions or silence.
- Before any extractor/provider call, enforce the server-owned validation profile as well as current authorization. The Free scenario keeps background formation disabled with zero extractor calls. Internal Memory-enabled runs are separately labeled and fully costed; this does not require production billing implementation.
- Cheap/batch extraction is default. Strong-model reasoning requires an explicit bounded escalation policy and remains below 5% of eligible jobs in the maturity fixture.
- Retryable infrastructure/provider failures use bounded exponential backoff; denial, revocation and invalid payload are terminal safe outcomes.
- Queue metrics and cost events contain no transcript or memory content.
- Distinguish unique eligible batches, skipped batches, attempts, accepted effects and empty/abstaining outcomes. Exactly-once durable effects do not imply exactly-once paid model execution; account for retries and crash-after-inference reprocessing using the SPEC-016 ledger.
- Shadow remains blocked until the versioned load gate passes.

## Testing Decisions

### Primary seam

A Neo4j/BullMQ-backed synthetic system test commits evidence, publishes the outbox, processes the job and observes one active governed memory exactly once through the public Memory boundary.

### Secondary seams

Broker restart, lease/fencing, duplicate delivery, revoke between enqueue/execution, retry classification, terminal handling, graceful shutdown, canonical deduplication and metric redaction.

Include fragmented source deltas, repeated partial/final transcript versions, mixed-speaker evidence, ambiguous patient replies, silence-only events and the disabled Free profile. Verify both zero-call preflight outcomes and no unsupported candidate after extraction; unrelated assistant text must not change the eligible source fingerprint.

### Fixtures and privacy

Synthetic tenant-isolated evidence only. Queue payloads, logs and snapshots exclude transcript and Memory text. Test records are removed after execution.

### Required validation

Vitest plus Testcontainers integration tests with Neo4j and an isolated Redis Queue container, restart/idempotency/revoke/retry tests, Memory curation evals, Conversation regression, 100-job load report, full CI and dual review.

## Acceptance Criteria

- [ ] Evidence and outbox are committed atomically before publication.
- [ ] The publisher uses `eventId` as BullMQ `jobId` and records publication only after acknowledged enqueue.
- [ ] The serving response does not wait for extraction.
- [ ] Exactly one initial durable Memory processing queue and one long-lived Node worker are introduced for this curation/acceptance slice; the shared queue topology does not authorize additional job families or notifications.
- [ ] Ana-only, inactivity-only, ineligible, duplicate and Free-disabled inputs produce no extractor call or personal-memory candidate.
- [ ] Finalized eligible source versions are processed in bounded whole-turn batches, with no full-dialogue replay or assistant input; ambiguous patient evidence yields no unsupported candidate.
- [ ] Every actual model attempt is costed separately from the single governed durable effect, including retries and crash recovery.
- [ ] Queue payloads contain no transcript or Memory content.
- [ ] Authorization and consent are rechecked before protected load, inference and activation.
- [ ] Duplicate delivery produces one active-memory effect and equivalent facts consolidate without lost provenance.
- [ ] Broker restart preserves acknowledged durable jobs.
- [ ] Lease/fencing, retry/backoff, terminal handling and graceful shutdown are verified.
- [ ] Every completed job has known processing cost, attempts, latency and outcome in the redacted ledger.
- [ ] The versioned load fixture reports backlog depth, p95 queue age, throughput and terminal failures.
- [ ] Strong-model reasoning escalation remains below 5% of eligible jobs.
- [ ] No user-visible response is changed in this phase.
- [ ] Full CI and both reviews pass.
- [ ] Proven worker/queue behavior is promoted to the harness.

## Failure Behavior

Evidence failure prevents outbox creation. Publication failure leaves a retryable outbox row. Missing evidence, invalid schema, denial or revocation terminates safely. Exhausted attempts preserve redacted diagnostics and block advancement. Unknown per-job cost, uncontrolled backlog, excessive queue age or escalation at or above 5% produces no-go.

## Out of Scope

Memory serving in Conversation, shadow comparison, A/B flags, additional queue partitions, vector serving activation, production scale, pricing, billing and voice.

## Evidence and Promotion

Evidence will include outbox, payload-privacy, restart, duplicate, revoke, retry, terminal and worker-lifecycle tests; the load/cost report; exact-head CI and both reviews. Stable ownership and metrics are promoted after proof.

## Further Notes

SPEC-025 reconciliation (2026-09-05): the owner accepted the consolidated discovery and requested this contract revision. The discovery hold is resolved; this phase remains ready and unimplemented. [SPEC-025](007-plans-and-entitlements.spec.md) governs the patient-only source, Free capability distinction and cost-first objective. Preserve the one-worker topology and existing bounded engine instead of adding per-turn curation or orchestration. This revision changes contracts only.

Blocked by SPEC-009 and SPEC-016. It blocks SPEC-011 shadow/parity.
