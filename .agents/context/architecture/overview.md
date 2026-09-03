# Architecture overview

Amarelo is organized around user-facing `workspaces/apps/`, bounded-context `workspaces/`, shared cross-workspace packages, and a centralized engineering harness in `.agents/`.

```text
workspaces/
  apps/
    user-facing products and deployable services
  ai/
    agents/
      ana/
    orchestrator/
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

`agents/` and `orchestrator/` are structural AI capability parents, not packages. Named product agents own independent workspaces under `agents/`; Conversation and future coordination runtimes own independent workspaces under `orchestrator/`.

Memory Nucleus is one workspace, not a nested mini-monorepo. Clean Architecture dependency direction is `infrastructure → application → domain`. AI consumes Memory Nucleus only through `@repo/memory-sdk`.
