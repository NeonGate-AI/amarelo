---
id: ADR-0031
title: Make container images and environment templates project-owned
status: accepted
date: 2026-09-04
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0031: Make container images and environment templates project-owned

## Status

Accepted on 2026-09-04.

## Context

The Kubernetes runtime currently builds one generic development image from `workspaces/packages/runtime/Dockerfile.dev` and selects the application process through manifest commands. That makes an application container dependent on a platform-owned Dockerfile and hides the runtime contract away from the project that owns the process.

Deployable projects also need an explicit, safe way to declare configuration. A missing template makes local setup implicit; a browser template containing a secret would expose a security boundary violation.

## Decision

Every application, API, package, or project that is launched as an Amarelo application container owns a `Dockerfile` at its workspace root. The Dockerfile is built with the repository root as its context so workspace dependencies and the tracked lockfile remain reproducible. The Kubernetes runtime builds, loads, and deploys a distinct image for each such project rather than routing all application deployments through a shared generic image.

Each containerized project also owns `.env.template`. Templates document only variables relevant to that project and use empty or synthetic values. Browser-visible configuration is explicitly public and uses the framework's public prefix; API keys, credentials, and other secrets never belong in a browser template.

Platform dependencies such as PostgreSQL, Neo4j, Redis Queue, Redis Cache,
object storage and the ephemeral Cypress runner retain their upstream image
ownership and are not treated as Amarelo project containers.

## Alternatives considered

- **Keep one shared application image:** rejected because ownership and startup contracts remain hidden in the runtime package.
- **Create a Dockerfile only when a project first fails:** rejected because it makes container behavior non-discoverable and inconsistent.
- **Commit a shared secret-bearing environment file:** rejected because templates must document configuration without distributing credentials.

## Consequences

- Each deployable project carries a visible container entrypoint and configuration boundary.
- The runtime builds and loads more images, so local startup may take longer but image ownership is explicit.
- Runtime checks can mechanically verify that declared Amarelo application workloads have a matching Dockerfile and environment template.
- A future production image pipeline may optimize layers or publish images without restoring the shared-image ownership model.
