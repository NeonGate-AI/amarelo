---
id: SPEC-042
title: Establish the layered test platform foundation
type: feature
status: in-progress
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - workspaces/microservices/chatterbox
  - workspaces/packages/runtime
  - browser assurance
  - test data lifecycle
context:
  - .agents/context/workspaces/microservices/overview.md
  - .agents/context/workspaces/packages/overview.md
  - .agents/context/workflows/mobile.md
rules:
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/microservices/chatterbox/src/assurance/tests/health/chatterbox-health.test.ts
  - workspaces/microservices/chatterbox/vitest.config.ts
  - workspaces/microservices/chatterbox/package.json
  - .audit/runtime.audit.sh
  - Docker-independent repository validation passed on 2026-09-04
  - closure pending Docker-backed doctor and database gate
---

# SPEC-042: Establish the layered test platform foundation

## Problem Statement

Chatterbox exposes a public liveness seam, but its package test task is a chain
of executable `node:assert` eval scripts rather than a deliberate test runner.
The repository also needs a durable boundary between fast API tests,
infrastructure integration tests and costly browser/runtime E2E without
creating broad unapproved coverage or shared test data.

## Solution

Introduce Vitest as the first general-purpose Node/TypeScript runner and prove
the Chatterbox `GET /health` contract through Fastify `app.inject()`. Preserve
existing evals as separate assurance until a later spec deliberately migrates
them. Adopt Testcontainers for future code that integrates with real Neo4j,
Redis or object storage, while keeping it out of dependency-free Chatterbox
health tests. Keep Cypress limited to the current runtime smoke and later
owner-selected critical interface journeys.

## User Stories

1. As a maintainer, I can run one deterministic command that proves the API
   process is alive through its public Fastify seam.
2. As an integration author, I know when to use disposable real dependencies
   instead of mocks or a shared developer database.
3. As a product owner, I can add only critical Cypress journeys without turning
   the browser suite into broad interface coverage.

## Scope

- Vitest configuration and package task for Chatterbox.
- One liveness test for `GET /health` through `app.inject()`.
- A runner-owned `src/assurance/tests/**/*.test.ts` convention.
- Testcontainers, Cypress and seed lifecycle rules in the Harness.
- Preservation of existing deterministic eval tasks and runtime E2E ordering.

## Implementation Decisions

- `vitest run` is the non-watch package/CI entrypoint.
- The test creates Chatterbox from its public application factory, injects a
  request and closes the Fastify instance.
- The liveness response is HTTP 200 with `{ "status": "ok" }`; it does not probe
  a model, database, queue, cache or object store.
- Existing eval modules remain evals; this slice does not relabel or bulk-migrate
  them as tests.
- Testcontainers belongs with the first concrete external adapter suite. A
  dependency-free microservice test does not install unused container modules.
- Cypress remains the only interface test platform and runs only after runtime
  readiness.
- No seed is introduced because the selected health scenario needs no data.

## Testing Decisions

### Primary seam

Fastify's public injection seam on a Chatterbox instance observes status and
response payload for `GET /health`.

### Secondary seams

The runtime audit verifies that `elo runtime e2e` completes `runtime up` before
the Cypress Job. Package typecheck and repository audits verify configuration,
source placement and task ownership.

### Fixtures and privacy

The health test has no user, conversation, provider or Memory fixture. Future
fixtures and seeds must be synthetic and tenant-isolated where applicable.

### Required validation

Run the focused Chatterbox Vitest command, Chatterbox typecheck, existing evals,
runtime and architecture audits, and the complete repository validation.

## Acceptance Criteria

- [x] Chatterbox uses Vitest as its package test runner.
- [x] `GET /health` is verified through `app.inject()` without binding a port or
  contacting an external dependency.
- [x] The Fastify instance is closed after the test.
- [x] Existing eval commands remain available and green.
- [x] The Harness records Testcontainers for real infrastructure adapters, two
  physical Redis test instances, sparse Cypress coverage and scoped synthetic
  seeds.
- [x] Runtime E2E still starts and waits for containers before Cypress.
- [ ] Required validation and both review axes pass on the final head.

## Failure Behavior

A non-200 response, changed payload, leaked handle, provider call, red existing
eval or broken runtime ordering fails the delivery. Missing container runtime
blocks an infrastructure suite; it must not be converted into mocked evidence.

## Out of Scope

- Readiness or dependency-health endpoints.
- Migrating every existing eval to Vitest.
- A Testcontainers suite before a concrete external adapter is implemented.
- New Cypress user journeys, component tests or visual snapshots.
- A database seed, coverage percentage or production monitoring check.

## Evidence and Promotion

The Vitest test/configuration, package command and runtime audit are stable
evidence. The source convention and layered responsibilities were promoted to
rules and workspace context. Chatterbox tests, evals, typecheck, repository
lint, audits, full typecheck, evals and build pass. Closure remains pending
because this execution environment has neither a Docker CLI nor daemon, so
`elo doctor --ci` and the existing PostgreSQL container eval cannot pass here.

## Further Notes

The owner approved health as the first behavior, Testcontainers as the external
integration companion, Cypress only for critical interface paths and no seed
for this slice.
