# ADR-0013 — Simplify Memory Nucleus into apps and packages

Status: accepted

## Decision

`elos/memory-nucleus` remains the capability aggregate. Deployable runtimes live under `apps/` (`service`, `worker`) and reusable libraries under `packages/` (`engine`, `sdk`). Database evolution, evals, docs and operational scripts live at aggregate root.

`@repo/memory-sdk` remains the only product-facing dependency. `@repo/ranking-evaluation` remains a neutral shared package outside Memory Nucleus.

The repository harness enforces topology, dependency direction, no deep parent imports, Memory/Knowledge isolation, migration inventory and memory release invariants.

## Why

The previous flat layout obscured deployment ownership and made documentation paths harder to reason about. This structure keeps the same semantic boundaries while making the tree predictable without introducing generic Clean Architecture layer folders.

## Consequences

- apps may depend on packages; packages may not depend on apps;
- product AI may use the SDK but not engine/worker/database internals;
- deep `../../` imports remain prohibited;
- historical ADR-0011 may retain obsolete paths as historical evidence only.
