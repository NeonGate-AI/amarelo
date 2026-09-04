---
id: SPEC-039
title: Establish the Chatterbox Microservice workspace
type: migration
status: implemented
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - workspaces/microservices/chatterbox
  - pnpm workspace discovery
  - current architecture context
context:
  - .agents/context/workspaces/microservices/overview.md
  - .agents/context/architecture/overview.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/004-import-boundaries.rule.md
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
  - .agents/rules/012-container-ownership.rule.md
adrs:
  - .agents/adrs/0030-microservices-chatterbox-boundary.adr.md
  - .agents/adrs/0032-test-platform-sequencing.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/domain-modeling/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - commit 3731361 (harness decisions and planned contract)
  - commit 92b9c42 (Chatterbox workspace implementation)
  - corepack pnpm@10.32.1 --filter chatterbox typecheck
  - corepack pnpm@10.32.1 --filter chatterbox test
  - PATH=<temporary Kustomize renderer> ./cli/elo check all
---

# SPEC-039: Establish the Chatterbox Microservice workspace

## Problem Statement

The Fastify composition boundary is currently named and located as a user-facing application even though it is a deployable network API. It needs an explicit Microservices home and a stable Chatterbox identity without moving AI policy or browser concerns into the HTTP layer.

## Solution

Create `workspaces/microservices/chatterbox`, move the existing Fastify composition boundary there, and publish it as package `chatterbox`. Preserve the HTTP conversation and Realtime contracts. Expose `GET /health` as a provider-independent liveness endpoint so a running Chatterbox process can be observed before model credentials are available.

## User Stories

1. As a developer, I want the deployable API to live under a clearly named Microservices workspace, so that product apps, AI domain logic, and network services are distinguishable.
2. As a runtime operator, I want Chatterbox health to respond without model configuration, so that process availability is observable independently from provider readiness.

## Scope

This spec owns workspace discovery, the Chatterbox package/path/name, current source and documentation references, its safe environment template, and the provider-independent health behavior. Project image ownership and Kubernetes workload wiring are owned by SPEC-040.

## Implementation Decisions

- `workspaces/microservices/` is structural only; `chatterbox/` is its direct package child.
- Package identity is exactly `chatterbox`.
- `GET /health` returns `200` with `{ "status": "ok" }` and does not reach OpenAI, Memory, Redis, or PostgreSQL.
- Missing model credentials leave conversation and Realtime provider operations unavailable with safe HTTP failures, but do not prevent the service from starting.
- Existing historical specs retain their original evidence paths; current references move to Chatterbox.

## Testing Decisions

### Primary seam

The existing Fastify `app.inject()` seam observes `/health`, provider-unavailable behavior, and preserved safe HTTP contracts.

### Secondary seams

Package typechecking, import-boundary audits, workspace discovery, and a deterministic health response check localize migration errors.

### Fixtures and privacy

Use synthetic model adapters and placeholder configuration only. No provider key, conversation, Memory, or user data is used.

### Required validation

Run focused Chatterbox deterministic evals/typecheck, relevant harness audits, and the complete repository validation that remains executable from the supplied checkout.

## Acceptance Criteria

- [x] `workspaces/microservices/chatterbox` is a discovered standalone workspace named `chatterbox`.
- [x] No live implementation path remains at `workspaces/apps/conversation-api`.
- [x] Chatterbox preserves the existing safe conversation and Realtime HTTP contracts when provider configuration is present.
- [x] `GET /health` returns the stable liveness response when provider configuration is absent.
- [x] Missing provider configuration is safe and does not expose credentials or raw failures.
- [x] Chatterbox owns a safe `.env.template` and its current context/docs use the canonical name.
- [x] Scoped validation and exact-head review evidence are recorded before this spec closes.

## Failure Behavior

Invalid environment values fail safely at startup. Missing provider credentials do not prevent liveness but cause provider-backed operations to return safe unavailable responses. A failed move, red deterministic check, invalid workspace discovery, or broken import boundary blocks completion.

## Out of Scope

- Database readiness and a separate `/ready` endpoint.
- Vitest installation, new test suites, test data seed, or a new CI test gate.
- Product UI redesign, authentication, Memory retrieval, or provider-model behavior changes.

## Evidence and Promotion

Commit `92b9c42` moved the package, added the provider-independent liveness seam, and updated the current source/doc references. Chatterbox and mobile focused checks pass, as do the repository audits through a temporary Kustomize renderer because this environment has no `kubectl` binary. The stable workspace vocabulary is promoted to Microservices context and the hard boundary to ADR-0030.

## Further Notes

The owner approved the Chatterbox identity, Microservices topology, and execution on 2026-09-04.
