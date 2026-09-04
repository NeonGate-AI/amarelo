---
id: ADR-0034
title: Isolate Memory queue and cache behind a transactional outbox
status: accepted
date: 2026-09-04
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0034: Isolate Memory queue and cache behind a transactional outbox

## Context

Memory extraction, embedding, consolidation, linking, summarization, retention
and notifications should not extend the synchronous conversation response. At
the same time, using one Redis instance for both durable work and disposable
cache would couple retention, eviction, failure and capacity policies. Writing
Neo4j and BullMQ independently would also create a loss window between the
canonical mutation and job publication.

## Decision

Use BullMQ on a dedicated Redis Queue instance for asynchronous Memory work.
Use a physically separate Redis Cache instance for cache-aside values, context
snapshots, retrieval cache, session state and TTL-bound ephemeral data. Logical
Redis databases in one server do not satisfy this isolation requirement.

The initial BullMQ boundary may use one versioned Memory processing queue with
named job types for extraction, embedding, consolidation, linking,
summarization, retention and notifications. Queue partitioning is a later
capacity decision; every Memory queue still belongs to Redis Queue and never to
Redis Cache.

The delivery protocol is:

1. one Neo4j transaction commits the governed Memory/evidence mutation and a
   pending `OutboxEvent`;
2. an asynchronous dispatcher reads committed pending events;
3. it adds a reference-only BullMQ job using stable `jobId = eventId`;
4. only after BullMQ acknowledges enqueue does it mark the outbox event as
   published; and
5. an idempotent worker records or derives a stable effect key before applying
   an externally visible effect.

This is eventual, at-least-once delivery. It is not a distributed atomic
transaction between Neo4j and Redis. Dispatchers may retry publication and
workers may receive duplicates. Queue persistence, outbox reconciliation,
stable job/effect identities and idempotent handlers make those retries safe.

Authorization, consent, request validation, hard safety limits and any
guardrail required to decide whether the synchronous response may proceed stay
in the synchronous path. Background workers revalidate current authority before
protected reads, model calls and durable effects; asynchronous processing never
turns a critical guardrail into a best-effort check.

Queue payloads carry identifiers, versions, purpose and correlation metadata,
not transcript, Memory text or object contents. Neo4j and authorized object
storage remain the sources from which a worker resolves protected material.

## Alternatives considered

- **One Redis server with separate logical databases:** rejected because memory,
  eviction, restart and operational failure remain shared.
- **Direct Neo4j then BullMQ dual write:** rejected because a crash between
  writes can permanently lose work.
- **Make workers exactly-once:** rejected as an unsupported transport promise;
  at-least-once delivery plus idempotent effects is the enforceable contract.
- **Run extraction and safety checks in the response path:** rejected because
  non-critical curation adds latency, while critical guardrails cannot be
  deferred.
- **Put transcript or document bodies in jobs:** rejected because it expands the
  broker's sensitive-data surface and creates stale duplicate payloads.

## Consequences

- Redis Queue needs persistence and recovery behavior appropriate for BullMQ;
  Redis Cache remains disposable and TTL-oriented.
- Operations, credentials, metrics and capacity are separate for both Redis
  roles.
- Publication lag, attempts, oldest pending event, queue age and terminal
  outcomes become required operational signals.
- Every worker contract must define its idempotency/effect key, retry classes and
  terminal behavior.
- An unavailable queue delays background work but does not roll back an already
  committed Neo4j transaction; the pending outbox remains recoverable.

## Compliance and verification

Integration evidence must use separate Redis processes/containers, exercise
duplicate publication and delivery, prove that queue payloads are reference
only, and show recovery from dispatcher/worker interruption. Protected worker
paths must prove authority revalidation and idempotent effects. Testcontainers
must create distinct Redis Queue and Redis Cache containers rather than select
two logical database numbers.

## Links

- Canonical graph: `.agents/adrs/0033-neo4j-canonical-memory-graph.adr.md`
- Background delivery spec: `.agents/specs/025-background-memory-curation-loop.spec.md`
- Test strategy: `.agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md`
