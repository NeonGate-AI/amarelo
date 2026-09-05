---
id: ADR-0019
title: Group Conversation under the AI orchestrator parent
status: superseded
date: 2026-09-03
deciders:
  - product-owner
supersedes: []
superseded-by: ADR-0023
---

# ADR-0019: Group Conversation under the AI orchestrator parent

## Status

Superseded on 2026-09-03 by [ADR-0023](0023-direct-ai-conversation-topology.adr.md).

## Context

`@ai/conversation` owns coordination of the current interaction: routing, final context assembly, tools and agent-facing behavior. Its former direct location at `workspaces/ai/conversation` placed that coordination runtime beside the `agents/` capability family and Knowledge without expressing the distinction.

Two names were considered for the new capability parent: `orchestration` and `orchestrator`. `Orchestration` accurately names an activity, while `orchestrator` names the subsystem responsible for coordinating agents, context and runtime policy. The repository already uses concrete capability-family nouns such as `agents` and `packages` for structural parents.

The parent could also have been made a package, but that would introduce an unnecessary generic runtime workspace and create ownership ambiguity with the independently packaged Conversation domain.

## Decision

Use `workspaces/ai/orchestrator/` as the structural parent for independently packaged AI coordination runtimes.

Move Conversation to `workspaces/ai/orchestrator/conversation/` while preserving package name `@ai/conversation` and its public API.

The `orchestrator/` parent itself owns no `package.json`, `tsconfig.json` or `src/`. It is parallel to the structural `agents/` parent, whose named children own their own packages.

`@ai/conversation` continues to own current-interaction orchestration. Named product agents remain under `workspaces/ai/agents/`. Memory Nucleus remains separate and is consumed from AI only through `@repo/memory-sdk`.

## Consequences

- Physical topology distinguished agent identity from interaction orchestration during the lifetime of this decision.
- pnpm required an explicit `workspaces/ai/orchestrator/*` workspace glob.
- Moving Conversation changed the importer path while preserving package identity.
- Harness context and architecture checks rejected the direct path and prevented the parent from becoming a package.

## Supersession note

The owner later selected a simpler topology after confirming that Conversation was the only coordination runtime and that package/port boundaries already expressed ownership. ADR-0023 restores the direct path, removes the generic parent and preserves all runtime semantics from this historical decision.
