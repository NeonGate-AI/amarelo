---
id: SPEC-038
title: Expose the Kubernetes runtime lifecycle through Elo
type: feature
status: ready
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - Elo CLI
  - workspaces/packages/runtime
  - Kubernetes end-to-end assurance
  - engineering harness
context:
  - .agents/context/architecture/overview.md
  - .agents/context/workspaces/packages/overview.md
  - cli/readme.md
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
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-038: Expose the Kubernetes runtime lifecycle through Elo

## Problem Statement

SPEC-037 made Kubernetes the only repository-managed local runtime, but its temporary package-level entrypoint does not provide the owner-requested public CLI. Developers need four memorable lifecycle commands with observable completion semantics: bring the entire runtime up, bring every runtime container down without losing ordinary state, completely prune owned runtime state, and start the runtime before running headless Cypress assurance.

A shallow command alias would be insufficient. Kubernetes submission is asynchronous, scaling to zero may leave terminating pods, namespace deletion is destructive, and an end-to-end command must report the real Cypress result rather than only creating a Job.

## Solution

Add the public Elo family `elo runtime up|down|prune|e2e`. Keep Elo as a thin POSIX dispatcher and delegate structured lifecycle behavior to `@repo/runtime`.

Strengthen lifecycle completion so `up` returns only after all six workloads are ready, `down` returns only after all owned pods are absent while retaining the namespace and PostgreSQL PVC, and `prune` waits for namespace deletion before removing the generated runtime environment file. Implement `e2e` as `up` followed by a pinned, ephemeral, in-cluster Cypress Job that runs headlessly against all four application Services and propagates success or failure.

## User Stories

1. As a developer, I want `elo runtime up` to bring every runtime container to readiness, so that success means the complete stack is usable.
2. As a developer, I want `elo runtime down` to stop every runtime container while retaining PostgreSQL state, so that routine pauses are safe.
3. As a developer, I want `elo runtime prune` to remove all Amarelo Kubernetes resources and generated local credentials, so that I can intentionally return the runtime to a clean state.
4. As a developer, I want `elo runtime e2e` to start the runtime and execute Cypress headlessly, so that one command proves browser-facing service availability.
5. As a reviewer, I want destructive boundaries and test outcomes to be deterministic, documented and exercised through the public CLI.

## Scope

This feature owns the public Elo runtime dispatcher, package lifecycle completion, namespace prune, generated environment cleanup, the pinned Cypress Job and smoke suite, runtime/CLI documentation, source-ownership wording and deterministic audit coverage.

## Implementation Decisions

- The only public forms are `elo runtime up`, `elo runtime down`, `elo runtime prune` and `elo runtime e2e`; missing, unknown or extra arguments fail with usage status 2 before mutation.
- `cli/src/commands/runtime.sh` is the thin POSIX control-plane adapter. Kubernetes process orchestration remains in the typed `@repo/runtime` backend.
- `up` retains SPEC-037 semantics: build or select the app image, load it where required, reconcile Secret and Kustomize resources, restore all replicas and wait for five Deployments plus the PostgreSQL StatefulSet.
- `down` scales every owned Deployment and StatefulSet to zero, then waits until no pod with `app.kubernetes.io/part-of=amarelo` remains. Namespace, Services, ConfigMap, Secret and PostgreSQL PVC remain.
- `prune` is explicitly destructive and idempotent. It deletes namespace `amarelo-runtime` with wait semantics, thereby deleting workloads, Services, ConfigMap, Secret and PVC, then removes the configured/generated runtime `.env`.
- The cluster installation, registry content and reusable local/cluster image caches are outside the owned state boundary and are not deleted by `prune`.
- `e2e` always runs `up` first and leaves the base runtime up afterward. It replaces stale Cypress resources, executes a pinned `cypress/included:15.19.0` Job with `cypress run --headless`, streams the Job log and returns non-zero on Job failure or timeout.
- Cypress checks the in-cluster landing, console, onboarding and mobile Service URLs. Successful transient Cypress resources are removed; failed resources remain for diagnosis and are replaced by the next run.
- Cypress is containerized, so no root Cypress dependency or lockfile mutation is introduced.

## Testing Decisions

### Primary seam

Invoke all four forms through `./cli/elo runtime ...` with controlled fake Docker, kubectl, kind and pnpm-visible package execution. Assert observable commands, filesystem state, exit status and ordered `up` before Cypress behavior.

### Secondary seams

Render and inspect the Cypress Job, exercise package-level job success/failure and namespace-absent paths, verify all four in-cluster URLs, run the focused runtime audit and run the complete repository CI suite.

### Fixtures and privacy

Process fixtures, command logs and environment files live in exclusive temporary directories. The Cypress suite uses only local ClusterIP URLs and synthetic runtime configuration. It reads no product account, conversation, Memory or real cluster credential during CI.

### Required validation

Run `./cli/elo runtime` contract fixtures, `./cli/elo check runtime`, `./cli/elo doctor --ci`, `./cli/elo check all`, Commitlint, Biome, typecheck, tests, disposable Memory PostgreSQL validation, AI evals, build and Git-hook smoke tests on the exact reviewed head. Live-cluster execution is a developer acceptance seam and is not claimed when CI uses controlled processes and client-side manifest inspection.

## Acceptance Criteria

- [ ] Elo help and CLI documentation expose exactly `runtime up|down|prune|e2e`.
- [ ] Missing, unknown and extra runtime arguments exit 2 before any runtime mutation.
- [ ] `elo runtime up` restores every owned workload and returns only after all six are ready.
- [ ] `elo runtime down` reaches zero owned pods while preserving namespace and PostgreSQL state, including an idempotent absent-namespace path.
- [ ] `elo runtime prune` idempotently deletes the complete namespace-owned runtime state and generated environment file, and propagates deletion failure before local cleanup.
- [ ] `elo runtime e2e` executes `up` first, runs pinned Cypress headlessly inside the namespace against all four application Services and leaves the base runtime up.
- [ ] Cypress success removes transient test resources; failure/timeout returns non-zero, emits available logs and retains failed resources for diagnosis.
- [ ] Kubernetes and command failures return non-zero with actionable, secret-safe diagnostics.
- [ ] No tracked secret, external test URL, root Cypress dependency or second orchestrator is introduced.
- [ ] Deterministic audit coverage exercises the four public commands, destructive boundary and Cypress success/failure seams.
- [ ] CLI/runtime documentation and durable ownership context match the implemented lifecycle.
- [ ] Complete exact-head CI and both independent review axes pass.
- [ ] Stable evidence is promoted and the spec closes as `implemented`.

## Failure Behavior

Invalid public syntax exits 2 before invoking pnpm, Docker or kubectl. An `up` failure prevents Cypress creation. A scale or pod-termination timeout makes `down` fail. A namespace-deletion failure makes `prune` fail without deleting the local environment file. Cypress apply, status, test or timeout failure returns non-zero after emitting available Job logs and preserves failed test resources. A moved head, red CI, unresolved review finding or unsupported live-cluster claim blocks merge.

## Out of Scope

- Provisioning or deleting a Kubernetes cluster, registry image, kind/minikube image cache, ingress, TLS, DNS, autoscaling, backup or managed secret.
- Production deployment overlays or production-readiness claims.
- Authenticated browser journeys, visual regression, cross-browser matrices or broad product E2E coverage.
- Adding Cypress to the repository dependency graph.
- Reintroducing Docker Compose or another parallel runtime orchestrator.
- Changing application, AI, authentication, Memory Nucleus or database-schema behavior.

## Evidence and Promotion

Planned evidence is the red/green public CLI fixture, rendered Cypress Job invariants, lifecycle failure tests, exact diff, exact-head CI and two-axis review. At completion, public command usage will be promoted to Elo/runtime documentation and source-ownership context; ADR-0029 remains the canonical decision record.

## Further Notes

The owner explicitly authorized implementation, issue/PR management, self-review and merge on 2026-09-04, and requested all four command names and semantics directly.
