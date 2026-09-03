---
id: SPEC-007
title: Place Conversation under the AI Orchestrator topology
type: migration
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/ai/orchestrator/conversation
  - AI workspace discovery
  - architecture harness
context:
  - .agents/context/architecture/overview.md
  - .agents/context/workspaces/ai/overview.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/architecture.md
  - .agents/rules/import-boundaries.md
  - .agents/rules/package-ownership.md
  - .agents/rules/source-organization.md
  - .agents/rules/spec-driven-development.md
adrs:
  - .agents/adrs/0010-elos-and-ai-domain-workspaces.md
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.md
  - .agents/adrs/0019-ai-orchestrator-topology.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/tdd
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/code-review
evidence:
  - pending
---

# SPEC-007: Place Conversation under the AI Orchestrator topology

## Problem Statement

`@ai/conversation` owns routing, final context assembly, tools and agent-facing behavior for the current interaction, but it currently sits directly under `workspaces/ai/` beside capabilities with different roles. Named product agents already have an explicit grouping parent at `workspaces/ai/agents/`.

Before Conversation gains transport, model and runtime behavior, its physical location should communicate that it is an orchestrating runtime capability rather than a product agent, shared knowledge source or generic AI package. Leaving the move until after integration would increase migration blast radius and weaken the repository vocabulary.

## Solution

Introduce `workspaces/ai/orchestrator/` as a non-package grouping directory for independently declared orchestration workspaces. Move the existing Conversation workspace to `workspaces/ai/orchestrator/conversation/` while preserving package name `@ai/conversation`, public exports and current behavior.

Use the concrete noun `orchestrator` rather than the activity noun `orchestration`: the parent names the runtime owner category, while each child remains a separately declared package. Update workspace discovery, lockfile references, durable AI context and mechanical architecture checks in the same migration.

## User Stories

1. As an AI maintainer, I want Conversation grouped under Orchestrator, so that its runtime ownership is evident from repository topology.
2. As a product-agent maintainer, I want agents and orchestration physically separated, so that Ana does not accidentally absorb transport or routing responsibilities.
3. As a package consumer, I want `@ai/conversation` to remain stable, so that the physical move does not create an unnecessary public API migration.
4. As a repository maintainer, I want pnpm and Turborepo to discover the moved package, so that existing task graphs remain valid.
5. As a reviewer, I want the old path mechanically rejected after migration, so that two Conversation locations cannot coexist.
6. As a future runtime implementer, I want a stable Orchestrator parent before Fastify and LangChain integration, so that later specs start from the intended boundary.
7. As a maintainer reading the harness, I want context and topology diagrams to match code, so that repository documentation does not preserve the retired path.

## Scope

This migration owns:

- creation of `workspaces/ai/orchestrator/` as a grouping directory;
- relocation of the complete Conversation workspace beneath that parent;
- preservation of package identity and public exports;
- pnpm workspace and lockfile path updates;
- repair of current repository references to the physical Conversation path;
- durable context updates for the AI topology;
- mechanical checks for the Orchestrator parent and retired path;
- full validation of the unchanged Conversation capability.

## Implementation Decisions

- The canonical parent name is `orchestrator`, lowercase and singular.
- `workspaces/ai/orchestrator/` is not a package and owns no `package.json`, `tsconfig.json`, `src/` or parent barrel.
- Children of the parent are independently declared `@ai/*` workspaces.
- Conversation moves to `workspaces/ai/orchestrator/conversation/`.
- Its package name remains `@ai/conversation`.
- Its current public contract remains unchanged during this migration.
- The completed branch contains no compatibility copy at the old path.
- Architecture checks enforce the parent-directory role and absence of `workspaces/ai/conversation`.
- Historical delivery specs remain historical and are not rewritten to pretend the new path existed earlier.

## Testing Decisions

### Primary seam

The primary seam is repository workspace discovery and compilation through the existing package name:

```text
pnpm --filter @ai/conversation typecheck
```

The observable behavior is that the package remains discoverable and its public TypeScript contract compiles after relocation.

### Secondary seams

- `./cli/elo check architecture` verifies canonical topology and rejects the retired path.
- `./cli/elo check imports` verifies imports and leaf boundaries after the move.
- `./cli/elo check specs` verifies this delivery contract.
- frozen-lockfile installation verifies workspace importer consistency.
- the full Turbo typecheck, test and build graph verifies that consumers remain unchanged.

### Fixtures and privacy

The migration uses source and configuration only. No user, patient, support-network or conversation data is required.

### Required validation

- spec workflow audit;
- Elo platform and architecture audits;
- import-boundary and Memory-invariant audits;
- frozen-lockfile installation;
- repository lint;
- `@ai/conversation` typecheck;
- full typecheck, tests, evals and build;
- Standards and Spec review of the final diff.

## Acceptance Criteria

- [ ] Conversation exists only at `workspaces/ai/orchestrator/conversation/`.
- [ ] `workspaces/ai/conversation/` no longer exists.
- [ ] The package remains named `@ai/conversation` with the same public exports.
- [ ] `workspaces/ai/orchestrator/` has no package, source root or parent barrel.
- [ ] pnpm and the frozen lockfile discover the moved package.
- [ ] Existing consumers compile without a public package-name change.
- [ ] AI and architecture context use the new canonical path and vocabulary.
- [ ] A mechanical check rejects the retired path and invalid Orchestrator-parent ownership.
- [ ] No Fastify, model, PWA, queue, worker or Memory-serving behavior is introduced.
- [ ] Full repository CI passes.
- [ ] Both Standards and Spec review axes pass.

## Failure Behavior

- A partial move that leaves both paths present fails the architecture check.
- A parent `package.json`, `tsconfig.json`, `src/` or parent barrel under `workspaces/ai/orchestrator/` fails the architecture check.
- A lockfile or workspace-discovery mismatch fails frozen installation or package filtering.
- A consumer that can no longer resolve `@ai/conversation` fails typecheck and blocks completion.
- If the physical move changes runtime or public API behavior, the migration is rolled back or split before this spec can close.

## Out of Scope

- Implementing Ana as a LangChain agent.
- Adding a model provider or credentials.
- Creating the Fastify conversation service.
- Connecting the Mobile PWA to Conversation.
- Adding streaming, microphone, STT or TTS.
- Retrieving Memory Nucleus context during serving.
- Adding queues, workers or background curation.
- Creating Nico, Isa or multi-agent routing.

## Evidence and Promotion

Planned evidence:

- branch and pull-request diff for `SPEC-007`;
- architecture check demonstrating the new topology;
- frozen installation and package-filter output;
- full CI and two-axis review.

Planned promotion:

- resulting topology to AI and architecture context;
- permanent parent-directory constraints to architecture rules;
- mechanically enforceable path ownership to the architecture checker.

## Further Notes

This is the prerequisite for the first agentic PWA conversation. It is deliberately behavior-preserving so that later failures can be attributed to runtime integration rather than an unresolved workspace move.
