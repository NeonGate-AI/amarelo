---
version: 2
name: Package Ownership
description: Package namespace and shared-capability ownership constraints.
alwaysApply: true
priority: high
tags:
  - packages
  - ownership
  - boundaries
---

# Package ownership rules

- `@ai/*` packages belong to the AI workspace.
- `@nucleus/*` belongs to Memory Nucleus-owned public/package identity.
- `@repo/*` is only for cross-workspace capabilities/contracts.
- `@repo/memory-sdk` is the public cross-boundary Memory contract.
- `@repo/observability` transports observations/telemetry; it does not own domain economics.
- `@repo/evaluation` answers quality questions; it is separate from observability.
