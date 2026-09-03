---
id: SPEC-007
title: Move Conversation under the AI orchestrator topology
type: refactor
status: in-progress
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/ai/conversation
  - workspaces/ai/orchestrator/conversation
  - AI workspace harness
  - workspace discovery
context:
  - .agents/context/workspaces/ai/overview.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/architecture.md
  - .agents/rules/import-boundaries.md
  - .agents/rules/source-organization.md
  - .agents/rules/spec-driven-development.md
adrs:
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.md
  - .agents/adrs/0019-ai-orchestrator-topology.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-tickets
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/implement
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/tdd
evidence:
  - https://github.com/NeonGate-AI/amarelo-v2/issues/3
  - commit f019af4fe5c6052f8c962c1c1f7f3a23b354608d
  - commit 37c3f3f42a07b6b06ac5f9f308a2c6d58b26bcc0
  - clean repository CI pending
---

# SPEC-007: Move Conversation under the AI orchestrator topology

## Problem Statement

`@ai/conversation` owns current-interaction orchestration, but its physical location was a direct child of `workspaces/ai/` beside product agents and Knowledge. That topology did not express the owner decision that coordination runtimes form a separate AI capability family.

The move must not silently turn the new parent into another package, change the package name, alter Conversation behavior, weaken the Memory Nucleus boundary or combine structural migration with agent/runtime implementation.

## Solution

Introduce `workspaces/ai/orchestrator/` as a structural parent for independently declared orchestration workspaces and move Conversation to `workspaces/ai/orchestrator/conversation/`.

Keep the public package identity `@ai/conversation`, its exports and current TypeScript behavior unchanged. Update workspace discovery, durable AI context, architecture rules and the architecture checker so the new topology is explicit and mechanically protected.

Use the singular term `orchestrator` for the capability family. `Orchestrator` names the subsystem that owns coordination, while `orchestration` describes the activity. The parent directory itself remains non-executable and owns no package, source root or TypeScript configuration.

## User Stories

1. As an AI maintainer, I want Conversation grouped under an orchestrator capability family, so that runtime coordination is visibly distinct from named product agents.
2. As a package consumer, I want `@ai/conversation` to keep the same public identity, so that a topology refactor does not create an API migration.
3. As a repository maintainer, I want pnpm and Turborepo to discover nested orchestrator workspaces, so that Conversation continues participating in build and typecheck graphs.
4. As an architecture reviewer, I want the parent directory to remain a grouping boundary rather than a package, so that the repository does not create a nested generic runtime workspace.
5. As a privacy reviewer, I want the existing Memory SDK boundary preserved, so that moving source cannot introduce direct access to Memory Nucleus internals.
6. As a future implementer, I want this prefactor isolated from LangChain, Fastify, PWA and queue behavior, so that later specs start from a stable topology.
7. As an engineering agent, I want the harness to point at the canonical path, so that progressive context loading does not reference the retired location.
8. As a reviewer, I want the obsolete direct Conversation path rejected mechanically, so that duplicate or stale workspaces cannot return.

## Scope

This spec owns:

- creation of the structural `workspaces/ai/orchestrator/` capability parent;
- relocation of the complete Conversation workspace beneath that parent;
- preservation of package name, exports, scripts and source behavior;
- pnpm workspace discovery for `workspaces/ai/orchestrator/*`;
- removal of the obsolete direct Conversation workspace path;
- AI context and durable architecture-rule updates;
- an ADR recording the `orchestrator` naming/topology decision;
- architecture-check enforcement for the parent and retired path;
- lockfile importer/link updates caused only by the physical move.

## Implementation Decisions

- The canonical path is `workspaces/ai/orchestrator/conversation`.
- The package name remains `@ai/conversation`.
- `workspaces/ai/orchestrator/` is a structural parent and must not contain `package.json`, `tsconfig.json` or `src/`.
- Named product agents remain under `workspaces/ai/agents/<agent>`.
- Conversation continues owning current interaction, final context assembly, tools, routing and authorized memory projection.
- The pnpm workspace configuration explicitly includes `workspaces/ai/orchestrator/*`.
- The obsolete `workspaces/ai/conversation` path is removed in the same change.
- Package exports, contracts and runtime semantics are unchanged by this migration.
- Existing imports inside Conversation retain their current semantics and continue obeying leaf-barrel rules.
- AI code continues consuming personal memory only through `@repo/memory-sdk`.
- The lockfile importer is relocated rather than duplicated.

## Testing Decisions

### Primary seam

The primary seam is repository workspace discovery and compilation of the unchanged public package:

```text
pnpm --filter @ai/conversation typecheck
```

The command must resolve the package only from the new path and compile its existing public contract.

### Secondary seams

- `./cli/elo check architecture` verifies topology and package ownership.
- `./cli/elo check imports` verifies import boundaries after the move.
- `./cli/elo check specs` verifies this delivery contract.
- `pnpm exec turbo run typecheck` proves task-graph discovery.
- Full CI verifies the repository remains green.

### Fixtures and privacy

No product data, transcripts, model calls or personal memory are required. The migration is verified through repository structure and synthetic compile-time contracts only.

### Required validation

- Spec workflow audit.
- Architecture audit.
- Import-boundary audit.
- Memory-invariant audit.
- `@ai/conversation` typecheck.
- Repository typecheck, tests, evals and build through CI.

## Acceptance Criteria

- [ ] Conversation exists at `workspaces/ai/orchestrator/conversation`.
- [ ] `workspaces/ai/conversation` no longer exists.
- [ ] The package remains named `@ai/conversation` with the same public exports.
- [ ] `workspaces/ai/orchestrator/` owns no package, `src/` or TypeScript configuration.
- [ ] pnpm discovers `workspaces/ai/orchestrator/*` and no longer depends on the retired direct path.
- [ ] The lockfile contains one Conversation importer at the canonical path.
- [ ] Existing Conversation contracts compile without behavioral changes.
- [ ] AI context describes agents and orchestrators as separate capability families.
- [ ] Architecture rules and checks protect the new topology and reject the obsolete path.
- [ ] ADR 0019 records the naming and ownership decision.
- [ ] Memory Nucleus remains accessible to AI only through `@repo/memory-sdk`.
- [ ] No LangChain agent, provider, Fastify route, PWA API call, queue or worker behavior is added.
- [ ] Full repository CI passes.
- [ ] Durable harness paths agree with the resulting repository.

## Failure Behavior

- If the old and new Conversation paths coexist, the architecture check fails.
- If the orchestrator parent becomes a package or source root, the architecture check fails.
- If `@ai/conversation` is not discovered at the new path, package typecheck and Turbo validation fail.
- If the move introduces direct `@nucleus/memory` consumption from AI, the architecture check fails closed.
- If package exports or compilation change, the migration remains incomplete rather than accepting a compatibility break.
- The branch can be reverted without data migration because this spec changes source topology only.

## Out of Scope

- Implementing Ana as a LangChain agent.
- Adding prompts, tools, middleware or provider selection.
- Creating a conversation runtime use case.
- Creating a Fastify service or public HTTP contract.
- Connecting Mobile to any backend.
- Adding short-term persistence, queues or workers.
- Integrating real Memory Nucleus retrieval or curation.
- Creating Nico or Isa.
- Changing deployment or authentication.

## Evidence and Promotion

Current evidence:

- implementation issue #3;
- spec branch `refactor/spec-007-orchestrator-topology`;
- topology implementation commit `f019af4fe5c6052f8c962c1c1f7f3a23b354608d`;
- generated lockfile commit `37c3f3f42a07b6b06ac5f9f308a2c6d58b26bcc0`;
- clean repository validation is the remaining closure gate.

Promotion:

- topology vocabulary to AI workspace context;
- permanent ownership constraints to architecture rules;
- the naming tradeoff to ADR 0019;
- mechanically enforceable paths to the architecture checker;
- final acceptance evidence back into this delivery spec.

## Further Notes

This is the expand/migrate/contract prefactor for the executable agentic workflow. Later specs may depend on the canonical path, but this spec does not implement those behaviors.
