# Architecture overview

Amarelo is organized around user-facing `workspaces/apps/`, bounded-context `workspaces/`, shared cross-workspace packages, and a centralized engineering harness in `.agents/`.

```text
workspaces/
  apps/
    user-facing products and deployable services
  microservices/
    deployable network APIs
  ai/
    agents/
      ana/
    conversation/
    knowledge/
  memory-nucleus/
    src/
      domain/
      application/
      infrastructure/
      assurance/evals/
  packages/
    memory-sdk/
    observability/
    evaluation/
    runtime/
    ...

.agents/
  context/
  rules/
  specs/
  adrs/
  skills/
  prompts/
    adr.prompt.md
    rule.prompt.md
    skill.prompt.md
    spec.prompt.md

.audit/
  *.audit.sh
```

`agents/` is a structural AI capability parent, not a package. Named product agents own independent workspaces beneath it. Conversation and Knowledge are direct concrete AI workspaces; package identities, public ports and exports express their boundaries without a generic single-child coordinator directory.

`microservices/` is a structural parent for deployable network services, not a package. Chatterbox is the Fastify composition boundary at `workspaces/microservices/chatterbox/`; it exposes transport/provider behavior and liveness while `@ai/conversation` remains the framework-neutral interaction domain. Every Amarelo application container owns a Dockerfile and safe environment template at its project boundary. `@repo/runtime` builds and deploys these project-owned images; PostgreSQL, Neo4j, separate Redis Queue/Cache, object storage and Cypress remain platform-owned images.

Memory Nucleus is one workspace, not a nested mini-monorepo. Clean Architecture dependency direction is `infrastructure → application → domain`. AI consumes Memory Nucleus only through `@repo/memory-sdk`. Neo4j is the selected canonical Memory graph; BullMQ uses persistent Redis Queue, disposable cache-aside state uses a physically separate Redis Cache, and object storage holds large immutable sources. Neo4j commits Memory changes with outbox events; dispatch to BullMQ is eventual and workers are idempotent. `@repo/runtime` owns the repository-managed local Kubernetes resources and structured orchestration backend; namespace `amarelo-runtime` is its resource boundary. Elo exposes the thin `runtime up|down|prune|e2e` control-plane adapter, while the package owns readiness, termination, wipe and in-cluster Cypress semantics. Local runtime manifests do not imply a production deployment contract.

## Harness filename contract

Semantic suffixes make artifact ownership visible without opening the file:

| Boundary | Canonical filename |
|---|---|
| Architecture decision | `.agents/adrs/<name>.adr.md` |
| Durable rule | `.agents/rules/NNN-<name>.rule.md` |
| Numbered delivery/product contract | `.agents/specs/NNN-<name>.spec.md` |
| Empty engineering artifact template | `.agents/prompts/<type>.prompt.md` |
| Executable invariant checker | `.audit/<name>.audit.sh` |

Rule numbers are stable catalog identities and never imply load order or precedence; existing rule metadata and authored policy remain authoritative. `.agents/rules/readme.md` is the only unnumbered support document in that boundary. Context documents and skills remain ordinary Markdown because their directory already identifies their role. The four `.agents/prompts/*.prompt.md` files are authoring skeletons consumed by Elo, never runtime AI prompts or project decisions. `readme.md`, `template.md` and `workflow.md` are the only unnumbered support documents in `.agents/specs/`. Renames and references must be changed atomically; compatibility paths must not become new sources of truth.
