---
id: ADR-0030
title: Place Chatterbox in the Microservices workspace
status: accepted
date: 2026-09-04
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0030: Place Chatterbox in the Microservices workspace

## Status

Accepted on 2026-09-04.

## Context

The existing Fastify composition boundary is physically located under `workspaces/apps/conversation-api`. It is a network API, not a user-facing application and not the `@ai/conversation` domain workspace. Its location and generic name blur the distinction between interface products, AI interaction policy, and a deployable HTTP service.

Amarelo needs a stable home for independently deployable network services. The first service also needs a concise product-facing identity that can remain stable while its implementation continues to compose Conversation, Ana, provider adapters, and future authorized Memory access.

## Decision

Create `workspaces/microservices/` as the structural parent for deployable network services. The parent owns no package, source root, or TypeScript configuration. Each service is an independent workspace below it and is discovered through `workspaces/microservices/*`.

Move the Fastify composition boundary to `workspaces/microservices/chatterbox/` and rename its package identity to `chatterbox`. Chatterbox owns HTTP transport, server-only environment validation, provider composition, safe error mapping, and `/health`; it does not own Conversation routing, named-agent behavior, Memory internals, browser contracts, or user-facing interface code.

`GET /health` is a liveness endpoint. It returns `200 { "status": "ok" }` whenever the Fastify process is available and does not require a model provider, database, or Memory dependency to be configured. A future readiness endpoint may establish dependency-specific semantics through a new spec.

## Alternatives considered

- **Keep the API under `workspaces/apps/`:** rejected because the API is not a user-facing product surface.
- **Place it below `workspaces/ai/`:** rejected because transport/provider composition must remain outside the framework-neutral `@ai/conversation` boundary.
- **Use a generic `microservices-api` package name:** rejected because the executable service needs a stable, concrete identity.

## Consequences

- The repository gains a clear structural parent for future deployable APIs without creating a nested mini-monorepo.
- Existing Fastify contracts retain their paths while their package/workspace identity becomes `chatterbox`.
- Health can prove process availability independently from provider credentials; provider-backed conversation and Realtime calls remain unavailable until configured.
- Historical specifications retain their original `conversation-api` evidence paths. Current context, runtime configuration, and future contracts point to Chatterbox.
