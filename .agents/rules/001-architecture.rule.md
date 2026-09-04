---
version: 4
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
- `workspaces/ai/agents/` is a structural capability parent. It owns no package, `src/`, or TypeScript configuration.
- Named product agents live under `workspaces/ai/agents/<agent>/`.
- Conversation's canonical workspace path is `workspaces/ai/conversation` and its package identity remains `@ai/conversation`.
- `workspaces/microservices/` is a structural parent for deployable network services and owns no `package.json`, `tsconfig.json`, or `src/` of its own.
- Chatterbox's canonical workspace path is `workspaces/microservices/chatterbox` and its package identity is `chatterbox`; it owns Fastify transport/provider composition, not Conversation domain behavior.
- `workspaces/ai/orchestrator/` is a retired topology and must not be recreated without a superseding spec and ADR backed by multiple independently owned runtimes.
- Memory Nucleus is a single workspace/package with real Clean Architecture direction: `infrastructure → application → domain`.
- Domain must not import Application or Infrastructure. Application must not import concrete Infrastructure.
- Cross-workspace imports use declared package names, never relative paths.
- Two-or-more-parent source imports (`../../`) are forbidden.
- Package namespaces communicate ownership: `@ai/*`, `@nucleus/*`, `@repo/*`.
- Shared packages require demonstrated cross-workspace ownership or an intentional public boundary.
