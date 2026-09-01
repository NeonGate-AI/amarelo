---
version: 2
name: Import Boundaries
description: Canonical first-party absolute aliases and barrel-only cross-directory source imports.
alwaysApply: true
priority: high
tags:
  - architecture
  - imports
  - barrels
---

# Import Boundaries

First-party absolute source aliases always begin with `@`. The `#` prefix is forbidden for project source aliases.

Examples:

```ts
// correct: enter the ports/contracts leaves through their barrels
import type { ScopedMemoryRepository } from '@application/ports'
import { MemoryRepositoryScopeError } from '@application/contracts'

// forbidden
import type { ScopedMemoryRepository } from '#application/ports/memory-repository.port'
import type { ScopedMemoryRepository } from '@application/ports/memory-repository.port'
```

When an import crosses into another source directory, it terminates at that directory's barrel. Do not cross a folder boundary by importing its final semantic source file directly. Every code-bearing leaf directory exposes an `index.ts` that reexports every project-created semantic module in that leaf.

Modules already inside the same leaf may import sibling modules directly. This avoids self-barrel cycles such as `module → index → module`; the leaf `index.ts` remains the only supported entrypoint from outside that leaf.

Package boundaries remain authoritative: do not use an internal alias to bypass another workspace's public package API. Framework-reserved route files and non-module assets are exempt from barrel creation where the framework owns their filename/lookup semantics.

When moving source, update the relevant TypeScript `paths` mapping and the leaf barrels in the same change. Mechanical import-boundary checks must remain green.
