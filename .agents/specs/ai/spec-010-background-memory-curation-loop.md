---
id: SPEC-010
title: Close the longitudinal loop with one durable memory-curation queue
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
  - background runtime infrastructure
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/ai/conversation.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/architecture.md
  - .agents/rules/context-engineering.md
  - .agents/rules/memory-nucleus.md
  - .agents/rules/product-safety-and-privacy.md
  - .agents/rules/spec-driven-development.md
adrs:
  - .agents/adrs/0003-authorization-before-retrieval.md
  - .agents/adrs/0008-cost-first-background-memory-curation.md
  - .agents/adrs/0009-postgresql-jsonb-fts-memory-store.md
  - .agents/adrs/0011-memory-platform-and-sdk.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/tdd
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/code-review
evidence:
  - pending
---

# SPEC-010: Close the longitudinal loop with one durable memory-curation queue

## Problem Statement

Authorized Memory Nucleus retrieval can make a conversation use existing longitudinal context, but the product loop remains incomplete until a completed conversation becomes governed memory asynchronously and is available to a later conversation.

Running curation inside the HTTP request would add inference latency, couple memory maintenance to user-facing availability and make retries unsafe. Running a long-lived consumer in an Edge function would mismatch the workload. Passing transcript text directly through Redis would duplicate sensitive payloads and weaken lifecycle control.

## Solution

Persist completed synthetic conversation evidence in PostgreSQL, then publish a small reference-only job to one durable `memory-curation` queue. A long-lived Node worker resolves the evidence by identifier, rechecks current authorization/consent, invokes the existing `MemoryCurationHandler`, records usage and status, and relies on the Nucleus source-claim/idempotency boundary for exactly-once effects under at-least-once delivery.

The experiment succeeds when a fact stated in one PWA conversation is processed after completion and can be retrieved as authorized context in a later conversation without replaying the first transcript.

## User Stories

1. As a returning user, I want an eligible fact from a completed conversation available in a later conversation, so that continuity improves over time.
2. As a user ending a conversation, I want the response to complete without waiting for memory extraction, so that background enrichment does not increase serving latency.
3. As a privacy reviewer, I want Redis jobs to contain references rather than transcript text, so that sensitive payload duplication is minimized.
4. As a governance reviewer, I want consent and authorization rechecked at worker execution time, so that queued work cannot bypass a later revocation.
5. As an operator, I want failed jobs retried with bounded exponential backoff, so that transient provider or database errors recover without tight loops.
6. As an operator, I want terminal failures isolated and observable, so that poison jobs do not block the queue.
7. As a memory maintainer, I want duplicate delivery to produce one curation effect, so that at-least-once queue semantics do not duplicate canonical memory.
8. As a cost engineer, I want curation model calls, tokens, duration and outcome recorded, so that background cost can be compared with serving cost avoided.
9. As a platform maintainer, I want the consumer deployed as a long-lived Node process, so that it is not constrained by Edge execution semantics.
10. As a developer, I want one queue and one worker first, so that queue topology reflects measured workload rather than speculation.
11. As a user who revokes memory permission, I want queued work skipped safely, so that old jobs do not override current consent.
12. As a tester, I want the complete two-conversation loop reproducible with synthetic data, so that longitudinal behavior is proven without production data.
13. As a maintainer, I want graceful worker shutdown and lease-safe processing, so that deploys do not corrupt in-flight work.
14. As a product owner, I want economic output labeled experimental, so that background cost measurements are not presented as production ROI prematurely.

## Scope

This experiment owns:

- durable conversation-evidence persistence before enqueue;
- a versioned `conversation.completed` event and reference-only job payload;
- one BullMQ `memory-curation` queue backed by Redis;
- one long-lived Node `memory-worker` application;
- worker composition of current consent/authorization, evidence loading, Memory Curation Handler and observability;
- bounded retry, backoff, timeout, terminal-failure and graceful-shutdown behavior;
- idempotent duplicate-delivery verification;
- local development infrastructure for PostgreSQL and Redis where not already available;
- synthetic end-to-end proof from Conversation A to Memory Nucleus to Conversation B;
- background/serving usage measurements needed for later Memory ROI analysis;
- harness promotion after successful execution.

## Implementation Decisions

- The queue implementation is BullMQ and the initial broker is Redis.
- There is exactly one application queue: `memory-curation`.
- The queue transports identifiers, schema version, correlation and attempt metadata, not transcript text or projected memory.
- The conversation API persists immutable evidence before publishing the job.
- Enqueue reliability uses an explicit database-to-queue delivery mechanism suitable for the experiment, preferably an outbox claim/publisher boundary rather than an unsafe dual write.
- The worker is a separate long-lived Node app workspace and can be scaled independently from the HTTP application.
- The worker calls the existing Memory Nucleus application handler; it does not reimplement extraction, judgment, source claims or persistence.
- Queue delivery is treated as at least once. Nucleus idempotency and source claims provide exactly-once effects at the curation boundary.
- Consent and authorization are re-resolved immediately before protected evidence is loaded or inference is invoked.
- Retryable failures use bounded exponential backoff with jitter. Authorization denial, invalid payload and revoked consent are terminal skipped outcomes, not retry storms.
- Terminal failures are retained in a failed state with redacted diagnostics; a second application queue or DLQ is deferred.
- Worker concurrency starts conservatively and is configuration-driven.
- The worker does not run in an Edge function or browser Service Worker.
- Background economics report measured units and uncertainty; they do not assert production ROI.

## Testing Decisions

### Primary seam

The primary seam is a synthetic two-conversation system test:

1. Conversation A states one eligible synthetic fact.
2. The conversation is completed and evidence is committed.
3. The outbox/job is published.
4. The worker processes the job.
5. Memory Nucleus persists the governed result.
6. Conversation B retrieves the authorized projection and Ana uses the fact.

The test observes only public application, queue, worker and Conversation/Memory boundaries.

### Secondary seams

- transactional evidence/outbox persistence;
- job payload schema and absence of transcript content;
- worker retry classification and graceful shutdown;
- duplicate-delivery/idempotency behavior;
- revocation between enqueue and execution;
- Memory curation usage/economics telemetry;
- PostgreSQL and Redis container health in integration tests.

### Fixtures and privacy

All integration data is synthetic, isolated by generated tenant and subject identifiers, and deleted after tests. Logs, BullMQ job inspection and failed-job diagnostics must not contain raw conversation text.

### Required validation

- red-first public-seam tests for persistence, worker and complete longitudinal loop;
- PostgreSQL and Redis integration tests;
- duplicate delivery and consent-revocation tests;
- retry/backoff and terminal-failure tests with deterministic clocks where practical;
- Memory Nucleus curation/retrieval/economics evals;
- conversation API regression tests;
- full repository audits, lint, typecheck, tests, evals and build;
- controlled local process smoke test and two-axis review.

## Acceptance Criteria

- [ ] Completing Conversation A returns without waiting for Memory curation.
- [ ] Conversation evidence is durable before a curation job can be processed.
- [ ] The initial system has exactly one `memory-curation` application queue.
- [ ] Queue payloads contain no raw transcript or memory content.
- [ ] A long-lived Node worker consumes the queue outside Edge runtimes.
- [ ] The worker rechecks current authorization and consent before protected processing.
- [ ] The worker invokes the existing Memory Curation Handler rather than duplicating Nucleus logic.
- [ ] Duplicate delivery produces one curation effect.
- [ ] Retryable failures use bounded backoff; terminal failures do not loop indefinitely.
- [ ] Revocation after enqueue causes safe skip before inference/persistence.
- [ ] Worker shutdown stops accepting new work and finishes or safely releases in-flight work.
- [ ] Conversation B can retrieve and use the eligible fact from Conversation A within the existing serving token budget.
- [ ] Curation and serving usage are correlated without logging raw sensitive content.
- [ ] Economic output is measurable but explicitly non-production.
- [ ] Full repository CI and both review axes pass.
- [ ] Durable queue, worker and memory-loop behavior is promoted to the harness.

## Failure Behavior

- Evidence persistence failure prevents enqueue and returns a safe completion failure or explicit partial status; no orphan job is created.
- Queue publication failure leaves a retryable outbox record rather than losing committed evidence.
- Missing evidence, invalid job schema, denied authorization or revoked consent produces an observable terminal skip.
- Transient provider, Redis or PostgreSQL failures are retried within configured bounds.
- Expired source claims or concurrent duplicate jobs defer/retry according to Nucleus semantics without duplicate activation.
- Exhausted retries retain redacted failure metadata for manual inspection.
- Worker termination uses graceful shutdown and does not acknowledge unfinished work as successful.

## Out of Scope

- Multiple queues split by memory type or priority.
- A separate DLQ application queue.
- Kafka, Temporal or a general workflow engine.
- Edge-hosted or browser-hosted memory workers.
- Periodic global consolidation, decay and contradiction sweeps.
- Vector retrieval and reranking.
- Production SSO, entitlements and billing.
- Voice transport.
- Production scale, SLA or ROI claims.

## Evidence and Promotion

Planned evidence:

- reference-only job contract test;
- PostgreSQL outbox and BullMQ integration tests;
- duplicate, retry, revocation and graceful-shutdown traces;
- synthetic two-conversation longitudinal proof;
- correlated serving/background usage report;
- full CI and independent review axes.

After success, promote queue/worker ownership and lifecycle to Memory and application context, current system behavior to appropriate behavior specs, durable privacy constraints to existing rules only when genuinely new, and hard-to-reverse infrastructure tradeoffs to an ADR.

## Further Notes

This spec is blocked by `SPEC-009` and remains contract-only until bounded serving context is accepted. It completes the first experimental loop but does not imply that all future memory maintenance belongs in one queue. Additional queues require measured contention or distinct reliability requirements and a later spec.
