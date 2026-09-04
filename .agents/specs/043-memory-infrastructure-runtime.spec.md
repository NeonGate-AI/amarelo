---
id: SPEC-043
title: Establish the Memory infrastructure runtime topology
type: feature
status: ready
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - workspaces/packages/runtime
  - workspaces/memory-nucleus
  - local Kubernetes infrastructure
context:
  - .agents/context/architecture/overview.md
  - .agents/context/workspaces/memory-nucleus/overview.md
  - .agents/context/workspaces/packages/overview.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
  - .agents/rules/012-container-ownership.rule.md
adrs:
  - .agents/adrs/0033-neo4j-canonical-memory-graph.adr.md
  - .agents/adrs/0034-memory-outbox-and-redis-isolation.adr.md
  - .agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending implementation
---

# SPEC-043: Establish the Memory infrastructure runtime topology

## Problem Statement

The local Kubernetes runtime exposes PostgreSQL and one ephemeral Redis service,
which contradicts the newly selected Memory architecture. It has no canonical
Neo4j graph, no physically isolated queue/cache Redis roles and no object store
for source artifacts. Future adapters and workers would otherwise grow against
ambiguous endpoints and secret ownership.

## Solution

Add platform-owned local workloads for a persistent Neo4j graph, persistent
Redis Queue, ephemeral Redis Cache and persistent S3-compatible object storage.
Give both Redis roles distinct Services and credentials. Make the runtime CLI
generate safe local credentials, reconcile every workload and wait for each
rollout. Retain PostgreSQL for non-Memory and legacy reference behavior while
removing its canonical-Memory claim.

## User Stories

1. As a Memory implementer, I can target explicit local endpoints whose roles
   match the accepted architecture.
2. As an operator, queue data, disposable cache and large artifacts have
   independent lifecycle and credentials.
3. As a maintainer, runtime startup does not report success before the new
   stateful dependencies are ready.

## Scope

- Neo4j Service, StatefulSet and retained data claim.
- Redis Queue Service, StatefulSet, append-only persistence and retained claim.
- Redis Cache Service and ephemeral Deployment.
- MinIO-compatible object-storage Service, StatefulSet and retained claim.
- Runtime environment generation/templates, Kustomize inventory, readiness,
  shutdown/prune descriptions and executable runtime audit expectations.
- Harness and active Memory roadmap updates that identify Neo4j as canonical.

## Implementation Decisions

- Platform dependency images remain upstream-owned and do not receive project
  Dockerfiles or project `.env.template` files.
- Neo4j and object storage preserve local state across ordinary `runtime down`.
- Redis Queue uses AOF and a PVC; Redis Cache uses no persistence.
- Redis Queue and Redis Cache have different hostnames and password variables.
- Object storage holds audio, original documents and large immutable artifacts;
  the graph will hold governed references in a later adapter spec.
- PostgreSQL remains running for current non-Memory/reference consumers but is
  not described as the canonical Memory store.
- No production adapter, graph schema, worker or bucket bootstrap is claimed by
  this runtime foundation.

## Testing Decisions

### Primary seam

The controlled `@repo/runtime` CLI audit observes environment generation,
Kustomize reconciliation, scaling and rollout waits through the public
`elo runtime` delegation path.

### Secondary seams

Rendered resource inventory checks validate distinct names, workload kinds,
PVC counts, health probes, service-account hardening and absence of tracked
secrets. Package typecheck validates lifecycle changes.

### Fixtures and privacy

Generated audit credentials are synthetic and live only in a temporary
directory. No conversation, Memory or production object is loaded.

### Required validation

Run the runtime audit, architecture/spec/rule audits, runtime typecheck and full
repository validation. A real cluster smoke remains an environment-dependent
operator check and is not misrepresented by controlled command evidence.

## Acceptance Criteria

- [ ] The runtime exposes persistent Neo4j as the selected canonical Memory
  graph dependency.
- [ ] Redis Queue and Redis Cache are separate workloads, Services and secret
  keys; only Redis Queue is persistent.
- [ ] Object storage is a persistent independent workload for large immutable
  artifacts.
- [ ] Runtime startup waits for every new Deployment and StatefulSet rollout.
- [ ] Ordinary shutdown preserves stateful claims; prune removes the namespace
  and its claims.
- [ ] No tracked manifest or environment template contains a real credential.
- [ ] PostgreSQL is no longer documented as canonical Memory storage.
- [ ] The Harness and active Memory specs agree on Neo4j, outbox, BullMQ,
  idempotent workers, synchronous guardrails and Testcontainers boundaries.
- [ ] Required validation and both review axes pass on the final head.

## Failure Behavior

Missing commands, invalid manifests, credential generation failure, failed
reconciliation or any incomplete rollout returns non-zero. Queue or graph
unavailability prevents runtime readiness. Cache loss remains recoverable and
must never destroy canonical Memory.

## Out of Scope

- Neo4j repositories, Cypher schema/migrations and production data migration.
- BullMQ dispatcher/worker code, outbox reconciliation and job handlers.
- Object bucket creation, authorization and retention implementation.
- Production backup, ingress, TLS, autoscaling and managed secrets.
- Removing the existing PostgreSQL reference adapter or workload.

## Evidence and Promotion

At completion, the Kubernetes manifests, runtime lifecycle audit and generated
environment contract provide stable evidence. Target architecture and current
implementation gaps are promoted to Memory/runtime context and rules.

## Further Notes

This foundation enables, but does not replace, the operational core and
background-curation specs. Their real adapter suites will use Vitest plus
Testcontainers with separate Redis containers.
