---
id: ADR-0035
title: Test Fastify with Vitest injection and real disposable dependencies
status: accepted
date: 2026-09-04
deciders:
  - product-owner
supersedes:
  - ADR-0032
superseded-by: null
---

# ADR-0035: Test Fastify with Vitest injection and real disposable dependencies

## Context

ADR-0032 selected Vitest before broad Cypress coverage but deferred concrete
suites and the integration boundary. The owner has now approved `GET /health`
as the first automated Fastify behavior and selected Testcontainers for code
that integrates with real infrastructure.

## Decision

Vitest is the first general-purpose Node/TypeScript test runner. Fastify API
tests start from the application factory and observe routes through
`app.inject()`, without binding a host port. The first new Chatterbox test is the
process-liveness contract at `GET /health`.

Testcontainers is the integration companion for adapters that depend on Neo4j,
Redis Queue, Redis Cache or object storage. Prefer the official technology
module when it exists. An infrastructure suite creates two independent Redis
containers; selecting two logical databases in one container is prohibited.
Chatterbox does not acquire Testcontainers merely because it is a Fastify
service: its current health seam has no external dependency.

Cypress remains the only interface/browser runner. It covers the existing
in-cluster runtime availability smoke and only owner-selected critical user
journeys. `elo runtime e2e` must complete runtime startup and readiness before
creating the headless Cypress Job.

There is no global database seed. A selected scenario may introduce a synthetic,
tenant-scoped, idempotent fixture/seed with explicit cleanup. Tests must not use
private conversations or production Memory data.

No coverage percentage is a release gate in this foundation. Tests are added at
approved public seams based on risk, not to maximize line counts.

## Alternatives considered

- **Start a TCP listener for every Fastify test:** rejected because injection is
  the public HTTP seam without port races or network overhead.
- **Mock Neo4j/Redis for adapter integration:** rejected as the only evidence
  because mocks cannot prove driver, query, transaction or broker semantics.
- **Run Testcontainers for dependency-free route tests:** rejected because it
  adds cost without increasing confidence.
- **Use Cypress for all interface behavior:** rejected because browser coverage
  is reserved for critical journeys and full runtime seams.
- **Create a shared mutable seed:** rejected because it couples scenarios and
  risks cross-test and cross-tenant leakage.

## Consequences

- Chatterbox gains a fast deterministic health test while existing evals retain
  their distinct quality/safety role.
- Infrastructure integration suites require a supported local container runtime
  and may run as a separate explicit task.
- Cypress remains slower and sparse by design.
- Test modules use a runner-owned source convention and do not become package
  exports.

## Compliance and verification

The Chatterbox test command must run Vitest once and close its Fastify instance.
Future infrastructure adapters must prove their real dependency behavior with
disposable containers and deterministic cleanup. Runtime audits continue to
prove that E2E starts the containers before Cypress. Seeds require a separate
approved scenario contract.

## Links

- Test delivery: `.agents/specs/042-layered-test-platform-foundation.spec.md`
- Memory infrastructure: `.agents/specs/043-memory-infrastructure-runtime.spec.md`
- Superseded sequencing: `.agents/adrs/0032-test-platform-sequencing.adr.md`
