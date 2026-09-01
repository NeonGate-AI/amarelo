# Architecture overview

Amarelo is organized around user-facing `workspaces/apps/`, bounded-context `workspaces/`, shared cross-workspace packages, and a centralized engineering harness in `.agents/`.

```text
workspaces/
  apps/
    user-facing products
  ai/
    conversation/
    knowledge/
    agents/
  memory-nucleus/
    domain/
    application/
    infrastructure/
    evals/
  packages/
    memory-sdk/
    observability/
    evaluation/
    ...

.agents/
  context/ rules/ specs/ adrs/
```

Memory Nucleus is one workspace, not a nested mini-monorepo. Clean Architecture dependency direction is `infrastructure → application → domain`. AI consumes Memory Nucleus only through `@repo/memory-sdk`.
