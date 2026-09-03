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

Memory Nucleus is one workspace, not a nested mini-monorepo. Clean Architecture dependency direction is `infrastructure → application → domain`. AI consumes Memory Nucleus only through `@repo/memory-sdk`.

## Harness filename contract

Semantic suffixes make artifact ownership visible without opening the file:

| Boundary | Canonical filename |
|---|---|
| Architecture decision | `.agents/adrs/<name>.adr.md` |
| Durable rule | `.agents/rules/<name>.rule.md` |
| Numbered delivery/product contract | `.agents/specs/NNN-<name>.spec.md` |
| Empty engineering artifact template | `.agents/prompts/<type>.prompt.md` |
| Executable invariant checker | `.audit/<name>.audit.sh` |

Context documents and skills remain ordinary Markdown because their directory already identifies their role. The four `.agents/prompts/*.prompt.md` files are authoring skeletons consumed by Elo, never runtime AI prompts or project decisions. `readme.md`, `template.md` and `workflow.md` are the only unnumbered support documents in `.agents/specs/`. Renames and references must be changed atomically; compatibility paths must not become new sources of truth.
