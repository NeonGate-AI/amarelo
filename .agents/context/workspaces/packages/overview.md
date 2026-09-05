# Shared packages context

`workspaces/packages/` contains capabilities or contracts intentionally shared across workspace boundaries. Namespace is `@repo/*`. Do not extract a package for hypothetical reuse.

Current AI-facing shared boundaries include `@repo/memory-sdk`, `@repo/evaluation`, `@repo/conversation-sdk` and `@repo/observability`.

`@repo/conversation-sdk` owns browser-safe HTTP contracts, server-session acquisition and abortable text transport. It validates restricted caller fields and correlated responses, uses same-origin credentials/no-store requests and preserves cancellation through response-body reading. It owns neither identity verification nor persistent state. PWA lifecycle/setup is disclosed through `.agents/context/workflows/mobile.md`.

`@repo/observability` defines transport ports and scalar observation attributes, including null for unknown values. It owns neither domain economics nor quality gates. SPEC-047's production Chatterbox composition provides the concrete allowlisted structured sink; `NoopObservability` remains an explicit optional/test sink, not proof that observations were delivered. Closed event fields, privacy filtering and bounded failure fallback belong to the emitting Chatterbox boundary described in `.agents/context/workspaces/microservices/overview.md`.

`@repo/runtime` owns the repository-managed local container environment. Kubernetes/Kustomize is its only active orchestrator and namespace `amarelo-runtime` is the resource boundary. The default application profile starts no Memory database, queue, cache or object store. The explicit Memory profile adds Neo4j, persistent Redis Queue, physically separate ephemeral Redis Cache and S3-compatible object storage; the reference profile adds PostgreSQL for its existing reference tests. Selecting a profile does not prune retained namespace data. Elo delegates `runtime up|down|prune|e2e` into the package: up and down wait for observable completion, prune destroys namespace-owned state plus the generated environment, and e2e runs pinned Cypress headlessly inside the cluster. The package builds/loads each project-owned application image or selects matching registry images; it does not own cluster provisioning, registry content or image-cache deletion. See `workspaces/packages/runtime/readme.md` for exact profile commands and resource membership.

Vitest is the first general-purpose TypeScript test runner. Fastify route tests
prefer `app.inject()`. Testcontainers belongs to concrete external-adapter
integration suites and uses distinct containers for Redis Queue and Redis
Cache. Cypress remains the only browser/interface runner and is limited to the
runtime availability smoke plus explicitly approved critical journeys.

SPEC-050 adds `mvp:init`, `mvp:infra` and `dev:mvp` for the owner-only voice slice. This launcher uses its own `amarelo-mvp` Redis namespace, hosted Neo4j configuration and loopback host processes; the original runtime profiles retain `amarelo-runtime`. See `workspaces/packages/runtime/mvp.md`.
