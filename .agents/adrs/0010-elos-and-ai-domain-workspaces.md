---
id: ADR-0010
title: Organize monorepo source under elos and AI domain workspaces
status: superseded
date: 2026-08-28
deciders:
  - product-owner
supersedes:
  - ADR-0004
superseded-by: ADR-0011
---

# ADR-0010: Organize monorepo source under elos and AI domain workspaces

This historical decision was superseded by ADR-0011 when the owner separated
longitudinal-memory infrastructure from the product-agent runtime behind a
narrow SDK. Its `elos/` source-root, feature-first organization, agent naming,
and kernel-admission principles are carried forward by ADR-0011; its placement
of `memory-manager` under `elos/ai/domains/` is no longer current.

## Context

The monorepo contains applications, reusable packages, and several AI capabilities. Keeping those units at unrelated root paths made the code families feel disconnected. Calling their parent `workflows/` would collide with AI workflows, CI/CD workflows, and domain processes. Calling it `repos/` would imply nested Git repositories, while the units are cooperating workspaces in one repository.

The former single `ai/` workspace also mixed memory management, scientific knowledge retrieval, conversation agents, orchestration, provider code, evals, and generic definitions. That layout did not reveal which capability owned an invariant and made a generic `core/` or `shared/` directory likely to become a catch-all.

The owner chose `elos/` as an in-house engineering name for monorepo code units that support one another. This metaphor must remain distinct from the product-facing `Elo`, which names the account-local Orbz presence or Ana, Nico, and Isa identity.

## Decision

Use `elos/` as the internal source root for Amarelo's cooperating monorepo workspaces:

```text
elos/
  apps/
  packages/
  ai/
    domains/
      memory-manager/
      knowledge/
      conversation/
    kernel/
```

`elos/` is an engineering organization boundary, not a runtime abstraction or nested repository model. Its name grants no product identity, relationship, memory sharing, permission, or authorization.

The AI children have these explicit categories:

- `domains/memory-manager` owns background memory curation, memory policy, Personal Memory retrieval, transport boundaries, and its evals;
- `domains/knowledge` owns isolated scientific Knowledge retrieval and its evals; corpus ingestion and publication remain future work;
- `domains/conversation` owns conversation semantics, Ana, Nico, and Isa agents, their prompts and tools, context assembly, and orchestration;
- `kernel` is not a domain. It contains only stable shared semantics, definitions, and narrow abstractions used with the same meaning by at least two AI domains.

Each AI domain and the kernel are independently declared TypeScript workspaces with their own package manifest, `tsconfig.json`, `src/`, and public exports. Domain-local evals remain with the domain they measure. A workflow remains inside the domain that owns its invariants; the repository does not introduce a global `workflows/` taxonomy.

Source is organized feature-first inside each workspace. This decision does not mandate Clean Architecture micro-layers such as `application/`, `domain/`, `infrastructure/`, `ports/`, or `adapters/`. Modules use kebab-case and one terminal role suffix where applicable. Prompts use `*.prompt.ts`; a feature with multiple prompt concerns uses separate files in a local `prompts/` directory. Files with unrelated responsibilities must be split even when they could share a role suffix.

A concept may enter `elos/ai/kernel` only when all of these conditions hold:

1. at least two AI domains use it with identical semantics;
2. no single domain clearly owns its invariants;
3. it is stable and independent of frameworks, providers, I/O, persistence, prompts, and domain policy;
4. the kernel can depend on no AI domain.

Ana, Nico, and Isa are called agents in technical language. They live under the conversation domain's `agents/` feature and are neither separate domains nor owners of independent canonical memory.

## Alternatives considered

- **Keep root `apps/`, `packages/`, and `ai/`:** rejected because the owner wants related monorepo code units gathered under one explicit source root.
- **Call the source root `repos/`:** rejected because these units are not nested Git repositories.
- **Call the source root `workspaces/`:** technically accurate, but rejected to avoid another generic infrastructure term and because the owner chose an Amarelo-specific metaphor.
- **Call the source root `workflows/`:** rejected because workflow already names AI processes, CI/CD automation, and domain procedures.
- **Keep one AI workspace:** superseded because memory, knowledge, and conversation have different ownership, contracts, and evaluation boundaries.
- **Use `bounded-contexts/` or architectural micro-layers in paths:** rejected because the source tree should communicate practical domains and features without requiring DDD or Clean Architecture terminology.
- **Use a generic `core/` or `shared/` folder:** rejected because ownership would be ambiguous. The narrower kernel has explicit admission and dependency rules.

## Consequences

### Benefits

- The source tree distinguishes apps, reusable packages, AI domains, and shared AI semantics without an explanatory taxonomy.
- Memory, knowledge, and conversation own their code, workflows, configuration, and evals independently.
- Ana, Nico, and Isa remain easy to find as conversation agents without becoming domains or memory silos.
- Kernel admission rules make cross-domain sharing deliberate and reviewable.
- Role suffixes and prompt placement expose module responsibility while feature folders preserve local cohesion.

### Costs and risks

- Workspace globs, lockfile importers, scripts, Docker paths, CI assumptions, imports, and harness links must migrate to `elos/`.
- The engineering `elos/` path and product-facing Elo identity share a word. Documentation and code review must preserve the explicit distinction.
- Multiple AI workspaces add package-boundary and TypeScript configuration maintenance.
- The kernel can still become a dumping ground unless every addition passes its admission rules.

## Compliance and verification

- Active monorepo code lives under `elos/apps/`, `elos/packages/`, or `elos/ai/`; root harness and repository configuration remain at the repository root.
- `pnpm-workspace.yaml` discovers `elos/apps/*`, `elos/packages/*`, `elos/ai/domains/*`, and `elos/ai/kernel`.
- `memory-manager`, `knowledge`, `conversation`, and `kernel` each expose an independent workspace boundary and TypeScript source root.
- Ana, Nico, and Isa implementation files live under `elos/ai/domains/conversation/src/agents/` and use agent terminology.
- No global workflow directory or mandatory Clean Architecture layer tree is introduced.
- Kernel imports no AI domain, and no provider, repository implementation, prompt, workflow, or domain policy resides in it.
- Relevant source uses the repository filename and concern rules in `.agents/rules/code-style.md` and `.agents/rules/source-organization.md`.
- Root install, lint, and build checks plus permitted domain-local offline evals pass. Reports state any unverified runtime behavior separately.

## Links

- Repository architecture: `.agents/ARCHITECTURE.md`
- Source organization: `.agents/rules/source-organization.md`
- AI runtime rules: `.agents/rules/ai-runtime.md`
- Superseded decision: `.agents/decisions/0004-product-agent-workspace.md`
- AI-wide instructions: `elos/ai/AGENTS.md`
- AI architecture: `elos/ai/ARCHITECTURE.md`
- Superseding decision: `.agents/decisions/0011-memory-platform-and-sdk.md`
