---
version: 3
name: Architecture
description: Repository topology, dependency direction, workspace ownership, and import boundaries.
alwaysApply: true
priority: high
tags:
  - architecture
  - boundaries
  - workspaces
---

# Architecture rules

- Canonical source root is `workspaces/`; references to the retired source-root name are forbidden in live implementation/configuration.
- A workspace must not contain a nested generic `apps/` or `packages/` mini-monorepo.
- `workspaces/ai/agents/` and `workspaces/ai/orchestrator/` are structural capability parents. They own no package, `src/`, or TypeScript configuration.
- Named product agents live under `workspaces/ai/agents/<agent>/`; current-interaction coordination runtimes live under `workspaces/ai/orchestrator/<runtime>/`.
- Conversation's canonical workspace path is `workspaces/ai/orchestrator/conversation` and its package identity remains `@ai/conversation`.
- Memory Nucleus is a single workspace/package with real Clean Architecture direction: `infrastructure → application → domain`.
- Domain must not import Application or Infrastructure. Application must not import concrete Infrastructure.
- Cross-workspace imports use declared package names, never relative paths.
- Two-or-more-parent source imports (`../../`) are forbidden.
- Package namespaces communicate ownership: `@ai/*`, `@nucleus/*`, `@repo/*`.
- Shared packages require demonstrated cross-workspace ownership or an intentional public boundary.
