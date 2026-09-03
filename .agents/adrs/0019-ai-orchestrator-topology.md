# ADR 0019: Group runtime orchestration workspaces under Orchestrator

## Status

Accepted on 2026-09-03.

## Context

Conversation owns the current-interaction runtime, routing and final context assembly. It is not a named product agent and it is not shared knowledge or personal memory infrastructure. Keeping it directly under `workspaces/ai/` made that ownership less visible just before transport, model and PWA integration increased its responsibilities.

The repository already uses `workspaces/ai/agents/` as a non-package grouping parent for independently declared product-agent workspaces. Two candidate names were considered for the corresponding runtime group: `orchestration`, which names an activity or capability, and `orchestrator`, which names the concrete runtime owner category.

## Decision

Use `workspaces/ai/orchestrator/` as a non-package grouping directory for independently declared orchestration workspaces.

Move Conversation to `workspaces/ai/orchestrator/conversation/` while retaining package identity `@ai/conversation` and its public API. The parent owns no package manifest, TypeScript configuration, source root or barrel.

Use `orchestrator` rather than `orchestration` because repository topology groups concrete runtime owners beside the concrete `agents` category. The activity remains described as orchestration in prose.

## Consequences

- Repository topology distinguishes named agents from interaction orchestration.
- Future Conversation transport and runtime work starts from its intended owner boundary.
- Physical paths change while package consumers remain stable.
- pnpm workspace discovery needs an additional nested glob.
- Architecture checks must reject the retired direct Conversation path and any package/source ownership on the Orchestrator parent.
- Additional Orchestrator children require independent package ownership rather than a generic parent API.
