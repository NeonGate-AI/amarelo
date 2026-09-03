# Architecture overview

Amarelo is organized around user-facing `workspaces/apps/`, bounded-context `workspaces/`, shared cross-workspace packages, and a centralized engineering harness in `.agents/`.

```text
workspaces/
  apps/
    user-facing products and deployable services
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
    ...

.agents/
  context/ rules/ specs/ adrs/ skills/
```

`agents/` is a structural AI capability parent, not a package. Named product agents own independent workspaces beneath it. Conversation and Knowledge are direct concrete AI workspaces; package identities, public ports and exports express their boundaries without a generic single-child coordinator directory.

Memory Nucleus is one workspace, not a nested mini-monorepo. Clean Architecture dependency direction is `infrastructure → application → domain`. AI consumes Memory Nucleus only through `@repo/memory-sdk`.
