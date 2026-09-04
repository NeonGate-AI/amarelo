# Shared packages context

`workspaces/packages/` contains capabilities or contracts intentionally shared across workspace boundaries. Namespace is `@repo/*`. Do not extract a package for hypothetical reuse.

Current AI-facing shared boundaries include `@repo/memory-sdk`, `@repo/evaluation` and `@repo/observability`.


`@repo/runtime` owns the repository-managed local container environment. Kubernetes/Kustomize is its only active orchestrator, namespace `amarelo-runtime` is the resource boundary, PostgreSQL state survives ordinary shutdown, and Redis remains ephemeral. The package may build/load a local OCI image or select a registry image; it does not own production cluster provisioning.
