---
id: SPEC-042
title: Establish the layered test platform foundation
type: feature
status: draft
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - Chatterbox Fastify API
  - workspaces/packages/runtime
  - browser assurance
  - test data lifecycle
context:
  - .agents/context/workspaces/microservices/overview.md
  - .agents/context/workflows/mobile.md
rules:
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0032-test-platform-sequencing.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending owner decision on first suites, critical journeys, and seed contract
---

# SPEC-042: Establish the layered test platform foundation

## Problem Statement

Amarelo needs a deliberate automated-testing direction around its Fastify liveness seam and Kubernetes runtime without prematurely creating broad tests, browser scenarios, or test data that have not been selected.

## Solution

After approval of the remaining test decisions, introduce Vitest as the first general-purpose Node/TypeScript test platform. Keep Cypress for explicitly selected critical browser journeys and runtime availability checks. `elo runtime e2e` continues to start the runtime before Cypress runs headlessly. Define an idempotent, isolated database seed only if a chosen E2E scenario requires persisted data.

## User Stories

1. As a maintainer, I want a focused test platform before adding suites, so that testing effort follows meaningful public seams.
2. As a developer, I want runtime E2E to wait for live containers, so that browser results do not hide a startup failure.

## Scope

This draft owns the future platform boundary, not the selection or implementation of individual test cases.

## Implementation Decisions

- Vitest is the first general-purpose test runner for Node/Fastify and shared TypeScript behavior.
- Cypress is limited to selected critical interface journeys and explicit runtime availability checks.
- `/health` is liveness only; a dependency readiness endpoint requires its own decision.
- A seed must be idempotent, environment-scoped, synthetic, and resettable before it is introduced.

## Testing Decisions

### Primary seam

The first accepted Vitest slice will use Fastify's public injection seam for Chatterbox.

### Secondary seams

Cypress executes only owner-approved critical browser journeys against the runtime after `elo runtime up` succeeds.

### Fixtures and privacy

All future fixtures and seeds are synthetic, tenant-isolated where applicable, and never use private conversation or Memory data.

### Required validation

To be decided with the first approved suite and seed contract.

## Acceptance Criteria

- [ ] Owner approves the first Vitest behaviors and their public seams.
- [ ] Owner selects each critical Cypress journey and excludes broad interface coverage.
- [ ] Any database seed has idempotency, isolation, cleanup, and synthetic-data criteria.
- [ ] The first implementation records reproducible test/CI evidence without weakening runtime lifecycle guarantees.

## Failure Behavior

An unavailable runtime, nondeterministic fixture, unsafe data source, or unresolved seed lifecycle blocks implementation rather than broadening or weakening the test contract.

## Out of Scope

- Installing Vitest or Cypress dependencies now.
- Adding test suites, a test seed, a coverage target, or a CI gate before the owner approves the concrete first slice.

## Evidence and Promotion

This draft becomes `ready` only after the owner approves the first suites, critical journeys, and seed decision. Its implementation will promote proven test conventions to the relevant package docs, runtime context, and durable checks.

## Further Notes

This document captures the approved testing direction while preserving the owner's request not to create test suites or a seed yet.
