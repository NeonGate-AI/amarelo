---
id: SPEC-037
title: Migrate the local container runtime to Kubernetes
type: migration
status: in-progress
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - workspaces/packages/runtime
  - local container orchestration
  - continuous integration
  - engineering harness
context:
  - .agents/context/architecture/overview.md
  - .agents/context/workspaces/packages/overview.md
  - workspaces/packages/runtime/readme.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0014-workspaces-and-centralized-harness.adr.md
  - .agents/adrs/0018-spec-driven-delivery.adr.md
  - .agents/adrs/0022-posix-elo-control-plane.adr.md
  - .agents/adrs/0029-kubernetes-local-runtime.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/domain-modeling/SKILL.md
  - .agents/skills/documentation-and-adrs/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-037: Migrate the local container runtime to Kubernetes

## Problem Statement

The repository-managed local runtime currently encodes PostgreSQL, Redis and four application processes in Docker Compose. The owner has selected Kubernetes as the new runtime substrate, so retaining Compose would leave local orchestration, lifecycle semantics and future assurance on the wrong platform.

The migration must preserve the existing service topology, local-only credentials, canonical PostgreSQL persistence, ephemeral Redis role, frozen dependency graph and one-image application build without claiming that a local-development topology is already a production deployment.

## Solution

Replace Docker Compose orchestration with a namespace-scoped Kubernetes runtime rendered through Kustomize and reconciled with `kubectl`.

Run PostgreSQL as a StatefulSet backed by a persistent volume claim, Redis as an ephemeral Deployment, and landing, console, onboarding and mobile as independent Deployments and ClusterIP Services. Build one reproducible development image for the four applications and support loading it into common local clusters or selecting a registry image explicitly.

Keep runtime credentials in a generated ignored environment file and materialize them as a Kubernetes Secret without committing secret values. Preserve data across ordinary shutdown by scaling workloads to zero. Complete removal belongs to the explicit prune lifecycle in SPEC-038.

## User Stories

1. As a developer, I want the complete Amarelo stack represented as Kubernetes resources, so that local runtime behavior exercises the selected orchestration model.
2. As a developer, I want one command seam to reconcile and wait for every workload, so that a successful start means the runtime is ready rather than merely submitted.
3. As a developer, I want ordinary shutdown to preserve PostgreSQL state, so that stopping containers does not erase local memory data.
4. As a security reviewer, I want generated credentials applied as a Secret and absent from tracked manifests, so that local secrets do not become repository content.
5. As a maintainer, I want a distribution-neutral Kustomize base, so that kind, minikube, Docker Desktop or a registry-backed cluster can consume the same resources.
6. As a reviewer, I want executable manifest and orchestration checks without a false production-readiness claim.

## Scope

This migration owns the local `@repo/runtime` package, removal of its Compose definition, Kubernetes resource definitions, image build/load behavior, generated-secret application, readiness waiting, state-preserving shutdown, runtime documentation, architecture context, ADR-0029 and a dedicated executable runtime audit.

## Implementation Decisions

- Kubernetes namespace `amarelo-runtime` is the ownership and cleanup boundary.
- Plain Kubernetes resources plus a Kustomize base are canonical; Helm is deferred until real multi-environment templating pressure exists.
- PostgreSQL 17 remains canonical and uses a retained PVC; Redis 8 remains reconstructible and uses ephemeral storage.
- Landing, console, onboarding and mobile remain independent workloads and services.
- The existing `Dockerfile.dev` produces one immutable local application image with the frozen pnpm graph and built design tokens.
- The default image is `amarelo-dev-workspace:local`. kind and minikube receive an explicit local-image load; other clusters may use `AMARELO_RUNTIME_IMAGE`.
- Runtime configuration contains safe defaults; credentials are generated locally with mode `0600` and sent to the cluster with `kubectl create secret --dry-run=client` piped to `kubectl apply`.
- Start reconciles resources, restores replicas and waits for StatefulSet/Deployment rollout completion.
- Stop scales all owned workloads to zero while preserving namespace, Services, configuration, Secret and PostgreSQL PVC.
- The existing package runtime seam remains temporarily available; Elo's final `runtime` command family and destructive prune/e2e behavior are owned by SPEC-038.
- No service account token is mounted into application workloads.

## Testing Decisions

### Primary seam

Exercise the `@repo/runtime` command entrypoint with controlled fake `docker`, `kubectl`, kind and minikube processes, and assert the ordered build, apply, image, scale and rollout contract.

### Secondary seams

Render the Kustomize base with client-side `kubectl kustomize`, inspect resource inventory/security/persistence invariants, reject Compose drift, run package typecheck and run the complete repository audit suite.

### Fixtures and privacy

All command fixtures use temporary logs, generated local credentials and fake cluster responses. No product account, conversation, Memory or real cluster credential is read by the audit.

### Required validation

Run the focused runtime audit, `./cli/elo doctor --ci`, `./cli/elo check all`, Commitlint, Biome, typecheck, tests, Memory PostgreSQL validation, AI evals, build and Git-hook smoke tests on the exact reviewed head. Live-cluster execution remains a developer acceptance seam and is not represented as CI evidence unless a cluster is explicitly provisioned.

## Acceptance Criteria

- [ ] Docker Compose is absent from the active runtime and documentation.
- [ ] The Kustomize base renders the namespace, configuration, PostgreSQL, Redis and four application workloads/services.
- [ ] PostgreSQL uses retained persistent storage while Redis remains ephemeral.
- [ ] Workloads have readiness/liveness checks, bounded resources, graceful termination and no application service-account token.
- [ ] Runtime start builds or selects the application image, applies a generated Secret, reconciles resources, restores replicas and waits for readiness.
- [ ] Runtime stop brings every owned workload to zero replicas without deleting PostgreSQL storage.
- [ ] Missing tools, context, image loading, apply, scale or rollout failures return non-zero with actionable diagnostics.
- [ ] No tracked resource contains a runtime credential or Kubernetes Secret payload.
- [ ] The dedicated runtime audit validates manifest rendering and orchestration behavior and runs through `elo check all`.
- [ ] Runtime and architecture documentation explain Kubernetes ownership, portability and local-versus-production limits.
- [ ] Complete exact-head CI and both independent review axes pass.
- [ ] Stable evidence is promoted and the spec closes as `implemented`.

## Failure Behavior

Missing Docker, `kubectl`, an active context, or a required local-cluster loader fails before readiness is reported. Secret generation or application, manifest reconciliation, image selection, scaling or rollout failures propagate a non-zero status. Stop is idempotent when the namespace is absent. A tracked secret, active Compose path, invalid manifest, red audit, CI failure, moved head or unresolved review finding blocks merge.

## Out of Scope

- Production cluster provisioning, cloud networking, ingress, TLS, autoscaling, backup, disaster recovery or managed-secret integration.
- Helm charts, operators or a distribution-specific cluster bootstrap.
- Changing product, AI, Memory Nucleus, authentication or database schemas.
- Changing PostgreSQL/Redis semantic ownership.
- Elo `runtime up|down|prune|e2e` commands and Cypress execution, which are delivered by SPEC-038.
- Claiming live-cluster validation when only client-side rendering and controlled command fixtures ran.

## Evidence and Promotion

Planned evidence is the red/green runtime audit, rendered resource inventory, exact diff, exact-head CI and two-axis review. At completion, Kubernetes ownership and tradeoffs will be promoted to ADR-0029, architecture/package context and current runtime documentation.

## Further Notes

The owner approved Kubernetes migration and execution on 2026-09-04. This spec migrates the current repository-managed local runtime; it intentionally does not turn local development manifests into an unsupported production platform claim.
