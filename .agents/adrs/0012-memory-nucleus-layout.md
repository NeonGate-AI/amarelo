> Superseded in physical layout by ADR-0013; semantic ownership remains valid.

---
id: ADR-0012
title: Name the memory ownership boundary Memory Nucleus and colocate its SDK
status: accepted
date: 2026-08-30
deciders:
  - product-owner
supersedes:
  - ADR-0011
superseded-by: null
---

# ADR-0012: Name the memory ownership boundary Memory Nucleus and colocate its SDK

## Context

ADR-0011 established the important architectural boundary: longitudinal memory is independent from the AI runtime, consumers use a narrow SDK, and neutral cross-domain utilities do not belong to AI or memory internals. After implementing that boundary, the owner selected **Memory Nucleus** as the canonical capability and workspace name and moved the SDK beside the engine.

The move also exposed a repository-legibility problem: `@repo/ranking-evaluation` is consumed by both Memory Nucleus and Knowledge. Colocating that neutral package under Memory Nucleus would imply domain ownership that does not exist.

## Decision

Use this topology:

```text
elos/
  ai/
    domains/
      conversation/
      knowledge/
  memory-nucleus/
    package.json            # @repo/memory-engine
    memory-sdk/             # @repo/memory-sdk
  packages/
    ranking-evaluation/     # @repo/ranking-evaluation
```

`memory-nucleus` is both the conceptual capability name and the source ownership directory. The executable engine package remains `@repo/memory-engine` because the current implementation is a library rather than a deployed platform service.

`@repo/memory-sdk` is colocated with Memory Nucleus because it exists solely as the stable consumer boundary for this capability. It remains an independent pnpm workspace and MUST remain dependency-independent from `@repo/memory-engine`. Consumers import only the SDK.

`@repo/ranking-evaluation` remains under `elos/packages/` because both Memory Nucleus and Knowledge consume it and neither domain owns its semantics.

Deep relative imports that traverse two or more parent directories are prohibited. Workspaces should use package-local TypeScript/Node import aliases for cross-directory internal imports, while short `./` and `../` imports remain valid for local cohesion. The architecture checker enforces this rule.

## Consequences

### Benefits

- The source tree uses the same name humans use for the capability.
- The SDK is discoverable beside the capability it represents without becoming an engine dependency.
- Neutral evaluation code retains neutral ownership.
- Deep relative-import fragility is converted into an executable repository invariant.
- Workspace, Docker, lockfile, docs and architecture checks have one canonical path.

### Costs

- pnpm must explicitly discover the nested SDK workspace.
- Runtime Docker bind/volume paths and lockfile importers must follow the nested SDK location.
- Historical ADR-0011 paths remain historical and are superseded by this decision.

## Compliance and verification

- `elos/memory-nucleus/packages/engine/package.json` is `@repo/memory-engine`.
- `elos/memory-nucleus/packages/sdk/package.json` is `@repo/memory-sdk`.
- `elos/packages/ranking-evaluation/package.json` is `@repo/ranking-evaluation`.
- Memory engine and SDK do not depend on one another.
- Consumers cannot depend on `@repo/memory-engine`.
- Memory and Knowledge remain mutually independent.
- No source import traverses two or more parent directories.
- `pnpm-workspace.yaml`, lockfile importers, Docker runtime paths and active docs use the canonical layout.

## Links

- Memory Nucleus architecture: `elos/memory-nucleus/README.md`
- Memory research register: `elos/memory-nucleus/docs/RESEARCH.md`
- Superseded decision: `.agents/decisions/0011-memory-platform-and-sdk.md`
