---
id: SPEC-012
title: Build durable background memory curation through deterministic activation
type: experiment
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/conversation-api
  - workspaces/apps/memory-worker
  - workspaces/memory-nucleus
  - background queue infrastructure
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/ai/conversation.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/architecture.rule.md
  - .agents/rules/memory-nucleus.rule.md
  - .agents/rules/product-safety-and-privacy.rule.md
  - .agents/rules/spec-driven-development.rule.md
adrs:
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
  - .agents/adrs/0009-postgresql-jsonb-fts-memory-store.adr.md
  - .agents/adrs/0012-memory-nucleus-layout.adr.md
  - .agents/adrs/0015-memory-nucleus-mvp-clean-architecture.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
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

Commit authorized conversation evidence and an outbox event in PostgreSQL, publish a reference-only versioned job to one durable queue, and process it in a long-lived Node worker. The worker rechecks authorization/consent, loads evidence, invokes existing curation logic and submits eligible candidates to deterministic acceptance. Queue payloads contain identifiers and correlation metadata, never transcript or memory text.

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
- One durable queue and one long-lived Node worker.
- Reference-only payloads and persistent local broker configuration.
- Lease/fencing, bounded retry with backoff/jitter and terminal quarantine/dead-letter behavior.
- Current authorization/consent checks before load, inference and durable activation.
- End-to-end idempotency and deterministic cross-source canonical deduplication.
- Redacted queue and per-job economics through SPEC-016 ledger contracts.
- A versioned 100-job load fixture and go/no-go result.
- No change to a later user-visible response.

## Implementation Decisions

- PostgreSQL commits evidence and outbox atomically; no unsafe database/queue dual write.
- Delivery is at least once; source claims, fingerprints, fencing and activation idempotency produce exactly-once effects.
- Redis/BullMQ or an equivalent is replaceable infrastructure, not the source of truth.
- The model proposes candidates only; deterministic policy decides activation.
- Cheap/batch extraction is default. Strong-model reasoning requires an explicit bounded escalation policy and remains below 5% of eligible jobs in the maturity fixture.
- Retryable infrastructure/provider failures use bounded exponential backoff; denial, revocation and invalid payload are terminal safe outcomes.
- Queue metrics and cost events contain no transcript or memory content.
- Shadow remains blocked until the versioned load gate passes.

## Testing Decisions

### Primary seam

A PostgreSQL/broker-backed synthetic system test commits evidence, publishes the outbox, processes the job and observes one active governed memory exactly once through the public Memory boundary.

### Secondary seams

Broker restart, lease/fencing, duplicate delivery, revoke between enqueue/execution, retry classification, terminal handling, graceful shutdown, canonical deduplication and metric redaction.

### Fixtures and privacy

Synthetic tenant-isolated evidence only. Queue payloads, logs and snapshots exclude transcript and Memory text. Test records are removed after execution.

### Required validation

PostgreSQL and broker integration tests, restart/idempotency/revoke/retry tests, Memory curation evals, Conversation regression, 100-job load report, full CI and dual review.

## Acceptance Criteria

- [ ] Evidence and outbox are committed atomically before publication.
- [ ] The serving response does not wait for extraction.
- [ ] Exactly one durable Memory curation queue and one long-lived Node worker are introduced.
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

Memory serving in Conversation, shadow comparison, A/B flags, multiple independent queues, vector retrieval, production scale, pricing, billing and voice.

## Evidence and Promotion

Evidence will include outbox, payload-privacy, restart, duplicate, revoke, retry, terminal and worker-lifecycle tests; the load/cost report; exact-head CI and both reviews. Stable ownership and metrics are promoted after proof.

## Further Notes

Blocked by SPEC-009 and SPEC-016. It blocks SPEC-011 shadow/parity.
