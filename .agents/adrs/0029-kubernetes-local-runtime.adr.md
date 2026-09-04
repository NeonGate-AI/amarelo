# ADR 0029: Use Kubernetes for the repository-managed local runtime

## Status

Accepted on 2026-09-04.

## Context

Amarelo's local container runtime currently uses Docker Compose to run PostgreSQL, Redis, landing, console, onboarding and mobile. The owner has selected Kubernetes as the runtime substrate. This is consequential because it changes resource identity, readiness, persistence, shutdown, secret handling, image distribution and the public operational seam.

Keeping Compose beside Kubernetes would create two active orchestration truths and make tests ambiguous. Adopting Helm immediately would add chart values, release ownership and templating behavior before the repository has multiple demonstrated deployment environments. Choosing one local distribution would make the runtime simpler but couple Amarelo to kind, minikube or Docker Desktop.

The application image still needs an OCI builder. PostgreSQL must remain durable across ordinary stops; Redis remains reconstructible. Local credentials must stay untracked. The current local topology cannot by itself establish production concerns such as ingress, TLS, autoscaling, backup or managed secrets.

## Decision

Kubernetes becomes the only repository-managed container orchestrator for the local Amarelo runtime. Docker remains the default local OCI image builder, but Docker Compose is removed from active implementation and documentation.

The canonical resource model is a plain Kustomize base in `workspaces/packages/runtime/kubernetes/`, owned by `@repo/runtime` and isolated in namespace `amarelo-runtime`:

- PostgreSQL is a StatefulSet with a retained persistent volume claim.
- Redis is a Deployment with ephemeral storage.
- Landing, console, onboarding and mobile are separate Deployments and ClusterIP Services built from one application image.
- Workloads use health probes, bounded resources, graceful termination and no application service-account token.
- Non-sensitive defaults use a ConfigMap; generated local credentials are applied as a Secret and never committed.
- `up` means reconcile desired resources, restore replicas and wait for readiness.
- `down` means scale owned workloads to zero while retaining runtime state.
- `prune` means delete the namespace and generated local runtime state.
- End-to-end browser assurance runs as an ephemeral in-cluster Cypress Job.

The base remains cluster-distribution neutral. The runtime may load the default local image into detected kind/minikube clusters or use an explicitly configured registry image. Helm, a local-cluster installer and production overlays require later evidence and decisions.

ADR-0022 remains accepted: Elo is still a thin POSIX control plane and pnpm/Turborepo retain task-graph ownership. Kubernetes orchestration remains package-owned behind that control plane. This ADR supersedes only the active Docker Compose orchestration described by the former runtime implementation and current documentation; it does not rewrite historical specs.

## Consequences

- Local orchestration now exercises Kubernetes resource, rollout and namespace semantics.
- Ordinary shutdown preserves PostgreSQL data; explicit prune is visibly destructive.
- The repository gains more manifests and requires `kubectl`, an active cluster and an image path the cluster can resolve.
- kind/minikube image loading and registry-image selection add controlled portability branches.
- Plain Kustomize avoids premature chart abstractions but offers fewer environment-level parameters than Helm.
- ClusterIP services provide stable in-cluster addresses; host exposure remains a local cluster concern rather than a production ingress promise.
- Cypress can test the same service network from inside the namespace without host-network assumptions.
- Secret values stay outside Git while still entering Kubernetes through its native Secret boundary.
- Static rendering and fake-process audits do not prove a live production cluster; documentation and evidence must preserve that distinction.
