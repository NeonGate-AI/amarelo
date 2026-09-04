---
version: 1
name: Container Ownership
description: Project-owned Dockerfile and safe environment-template requirements for Amarelo application containers.
alwaysApply: true
priority: high
tags:
  - containers
  - runtime
  - environment
---

# Container ownership

- Every Amarelo application/API/package/project launched as a Kubernetes application container owns a `Dockerfile` in that workspace root.
- A project Dockerfile builds with the repository root as context and preserves the tracked lockfile/frozen-install contract.
- Runtime manifests and lifecycle code select a distinct project-owned image for each declared Amarelo application workload; platform dependencies and third-party test images are exempt.
- Every containerized project owns `.env.template`, containing only relevant keys and synthetic or empty example values.
- Browser templates may contain only explicitly public browser configuration. API keys, credentials, private URLs, tokens, and server-only variables never appear in them.
- A project that adds, removes, or renames a container workload updates its Dockerfile, environment template, runtime manifest, lifecycle implementation, documentation, and executable runtime checks in the same change.
