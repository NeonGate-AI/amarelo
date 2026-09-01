---
version: 1
name: Import Boundaries
description: Canonical first-party absolute aliases and barrel-only source imports.
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
// correct
import type { ScopedMemoryRepository } from '@application/ports'
import { MemoryRepositoryScopeError } from '@application/contracts'

// forbidden
import type { ScopedMemoryRepository } from '#application/ports/memory-repository.port'
import type { ScopedMemoryRepository } from '@application/ports/memory-repository.port'
```

Imports terminate at an owning directory barrel. Do not import a final semantic source file directly. Every code-bearing leaf directory exposes an `index.ts` that reexports every project-created semantic module in that leaf.

Package boundaries remain authoritative: do not use an internal alias to bypass another workspace's public package API. Framework-reserved route files and non-module assets are exempt from barrel creation where the framework owns their filename/lookup semantics.

When moving source, update the relevant TypeScript `paths` mapping and the leaf barrels in the same change. Mechanical import-boundary checks must remain green.
