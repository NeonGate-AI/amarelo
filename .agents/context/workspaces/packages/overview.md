# Shared packages context

`workspaces/packages/` contains capabilities or contracts intentionally shared across workspace boundaries. Namespace is `@repo/*`. Do not extract a package for hypothetical reuse.

Current AI-facing shared boundaries include `@repo/memory-sdk`, `@repo/evaluation` and `@repo/observability`.


`@repo/runtime` owns the repository-managed local container environment. Kubernetes/Kustomize is its only active orchestrator, namespace `amarelo-runtime` is the resource boundary, PostgreSQL state survives ordinary shutdown, and Redis remains ephemeral. Elo delegates `runtime up|down|prune|e2e` into the package: up and down wait for observable completion, prune destroys namespace-owned state plus the generated environment, and e2e runs pinned Cypress headlessly inside the cluster. The package builds/loads each project-owned application image or selects matching registry images; it does not own cluster provisioning, registry content or image-cache deletion.
