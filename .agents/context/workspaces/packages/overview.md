# Shared packages context

`workspaces/packages/` contains capabilities or contracts intentionally shared across workspace boundaries. Namespace is `@repo/*`. Do not extract a package for hypothetical reuse.

Current AI-facing shared boundaries include `@repo/memory-sdk`, `@repo/evaluation` and `@repo/observability`.


`@repo/runtime` owns the repository-managed local container environment. Kubernetes/Kustomize is its only active orchestrator and namespace `amarelo-runtime` is the resource boundary. PostgreSQL remains available for general/reference behavior; Neo4j is the selected persistent canonical Memory dependency, Redis Queue is persistent for BullMQ, Redis Cache is a separate ephemeral workload, and S3-compatible object storage retains large source artifacts. Elo delegates `runtime up|down|prune|e2e` into the package: up and down wait for observable completion, prune destroys namespace-owned state plus the generated environment, and e2e runs pinned Cypress headlessly inside the cluster. The package builds/loads each project-owned application image or selects matching registry images; it does not own cluster provisioning, registry content or image-cache deletion.

Vitest is the first general-purpose TypeScript test runner. Fastify route tests
prefer `app.inject()`. Testcontainers belongs to concrete external-adapter
integration suites and uses distinct containers for Redis Queue and Redis
Cache. Cypress remains the only browser/interface runner and is limited to the
runtime availability smoke plus explicitly approved critical journeys.
