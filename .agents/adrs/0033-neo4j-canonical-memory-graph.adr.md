---
id: ADR-0033
title: Use Neo4j as the canonical Memory graph
status: accepted
date: 2026-09-04
deciders:
  - product-owner
supersedes:
  - ADR-0009
superseded-by: null
---

# ADR-0033: Use Neo4j as the canonical Memory graph

## Context

ADR-0009 selected PostgreSQL, JSONB and full-text search before a production
Memory persistence path existed. The Memory Nucleus now needs one store whose
native model represents evidence, episodic records, semantic assertions,
relationships, lifecycle and cross-time projections without splitting graph
authority from retrieval indexes. The owner has selected Neo4j for that role.

The repository contains a PostgreSQL reference adapter and local PostgreSQL
workload, but no production Memory deployment or persisted production migration
must be preserved. This decision changes the target architecture; it does not
pretend that the current adapter has already been migrated.

## Decision

Neo4j is the canonical source of truth for personal Memory:

- evidence metadata and provenance;
- episodic records and semantic assertions;
- relationships and lifecycle state;
- rebuildable longitudinal projections;
- full-text and vector retrieval indexes; and
- transactional outbox events associated with Memory mutations.

Longitudinal Memory remains an aggregate and projection, not a third canonical
record kind. Full-text and vector indexes accelerate retrieval but never become
independent authorities. Vector serving must still earn activation through
domain-specific retrieval evidence; selecting Neo4j does not waive quality,
privacy, latency or cost gates.

A Neo4j transaction that changes protected Memory state also creates the
corresponding `OutboxEvent`. If either write fails, neither is committed.
Publication after that commit is governed separately by ADR-0034.

Object storage owns binary or large immutable source material: audio, original
documents and other artifacts that should not be embedded in graph properties.
Neo4j stores the governed reference, digest, media metadata, authorization and
provenance needed to resolve an object. Object storage is not a Memory source of
truth and an object reference cannot bypass authorization or retention policy.

PostgreSQL may remain available for non-Memory product data and as a temporary
reference adapter during migration. It is no longer the accepted canonical
Memory store. Personal Memory and Knowledge RAG remain separate domains and do
not share indexes, caches or authorization payloads.

## Alternatives considered

- **Keep PostgreSQL as canonical Memory and add Neo4j as a projection:** rejected
  because it creates two representations and makes relationship authority and
  lifecycle reconciliation ambiguous before a production store exists.
- **Use a vector database as canonical truth:** rejected because similarity does
  not own provenance, correction, authorization or lifecycle.
- **Put audio and original documents in Neo4j:** rejected because large binary
  payloads distort graph storage and lifecycle operations.
- **Treat longitudinal summaries as canonical records:** rejected because they
  are lossy, purpose-specific and rebuildable from governed records.

## Consequences

- The current PostgreSQL Memory adapter becomes migration/reference code until a
  Neo4j adapter replaces it under an executable delivery spec.
- Constraints, indexes, migrations and queries must carry tenant, subject,
  purpose, authorization and lifecycle boundaries explicitly.
- Backups and deletion must coordinate graph metadata with referenced objects.
- Vector and full-text search can share the canonical graph while remaining
  derived retrieval mechanisms.
- PostgreSQL-specific RLS and FTS evidence cannot be presented as proof of the
  future Neo4j serving path.

## Compliance and verification

A future operational Memory spec must prove atomic Memory/evidence/outbox graph
writes, tenant and subject isolation, lifecycle-aware full-text retrieval,
vector-index evaluation, object-reference authorization and deletion behavior.
Until that proof exists, documentation must distinguish the selected target
from the current PostgreSQL reference implementation.

## Links

- Memory rule: `.agents/rules/006-memory-nucleus.rule.md`
- Operational core: `.agents/specs/024-operational-memory-nucleus-core.spec.md`
- Asynchronous delivery: `.agents/adrs/0034-memory-outbox-and-redis-isolation.adr.md`
- Superseded store decision: `.agents/adrs/0009-postgresql-jsonb-fts-memory-store.adr.md`
