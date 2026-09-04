---
version: 7
extends: 002-code-style.rule.md
name: Source Organization
description: Source roots, module boundaries, file naming, barrels, and architectural source ownership.
alwaysApply: true
priority: high
tags:
  - architecture
  - source
  - organization
---

# Source Organization

## Purpose

This document defines mandatory source-code organization for Amarelo. It applies repository-wide to project-created implementation code.

Framework-required files and configuration files may remain outside source roots only when the framework/tool requires or conventionally owns that location.

## 1. Canonical source root

Every code-bearing application, package, workspace, agent, or development subsystem must have one explicit `src/` source root.

If a directory has a `package.json`, ordinary first-party implementation code must live under its `src/` directory unless a framework/tool requires another location.

Allowed non-source-root examples include `package.json`, `tsconfig.json`, framework configs, `turbo.json`, container manifests, lockfiles, `public/`, and README entrypoints.

Cypress is a runner-owned exception: package configuration may use `cypress.config.*`, executable browser specs live under the conventional `cypress/e2e/*.cy.js` tree, and those specs do not participate in package barrel exports. Their imports remain subject to boundary checks.

Next.js applications use `src/app/` when compatible with the current app. Vite/React applications use `src/`.

The embedded Elo CLI is a repository development subsystem. Its executable binary is `cli/elo`; implementation lives under `cli/src/` and is POSIX shell. JavaScript/TypeScript implementation modules do not belong under `cli/src/`.

Do not create generic root dumping grounds such as `helpers/`, `utils/`, `scripts/`, `common/`, `misc/`, or `tooling/` for project implementation code.

## 2. File naming

Use kebab-case for project-created source files and folders. Framework-reserved filenames are explicit exceptions.

### Shell CLI exception

Files under `cli/src/` are shell modules ending in `.sh`. Commands live under `cli/src/commands/`; reusable CLI primitives live under `cli/src/core/`. Keep one command/primary concern per shell module. The TypeScript semantic suffix table below does not apply to `.sh` files.

`cli/elo` is a thin launcher and contains no substantive CLI behavior.

Durable repository rules are direct `.agents/rules/NNN-lowercase-kebab-case.rule.md` children. Their numeric prefix is a stable catalog identity and never controls precedence. Engineering artifact skeletons live only in `.agents/prompts/` and are consumed by Elo's scaffold command. They are not executable source and do not change the rule that runtime AI `.prompt.ts` modules live in their owning workspace source tree.

Executable repository/package automation enters through a POSIX `.sh` file. When structured data, typed contracts or non-trivial state make shell inappropriate, the `.sh` entrypoint may delegate to an owning TypeScript backend. The design-system token builder follows this shell-front/typed-backend form.

## 3. One primary artifact per module

Each source module has one primary exported artifact or concern: one function, class, interface/type, schema, component, hook, command, adapter, port, agent, or equivalent behavior.

Private helpers and internal types may remain colocated only when they exist exclusively to support that primary artifact.

## 4. Canonical TypeScript/JavaScript suffixes

Use only suffixes defined here for project-created semantic modules. Add a suffix before introducing a new semantic module kind.

| Suffix | Meaning | Example |
| --- | --- | --- |
| `.abstract` | Abstract runtime contract | `payment.abstract.ts` |
| `.action` | React/server action | `sign-in.action.ts` |
| `.adapter` | Protocol/interface adapter | `postgres.adapter.ts` |
| `.agent` | Product AI agent definition/scaffold | `ana.agent.ts` |
| `.atom` | State atom | `session.atom.ts` |
| `.client` | External-system or React client | `http.client.ts` |
| `.command` | Non-shell command module where required | `doctor.command.ts` |
| `.compute` | Pure derived computation | `score.compute.ts` |
| `.contract` | Application/public contract | `memory-retrieval.contract.ts` |
| `.data` | Related static application data | `thresholds.data.ts` |
| `.domain` | Domain model/type when not Entity/VO | `memory.domain.ts` |
| `.entity` | Domain Entity with identity/lifecycle | `memory.entity.ts` |
| `.error` | One error type/family | `memory-retrieval.error.ts` |
| `.eval` | Executable evaluation | `memory-retrieval.eval.ts` |
| `.event` | Event definition/payload | `memory-created.event.ts` |
| `.factory` | Factory behavior | `memory-candidate.factory.ts` |
| `.fingerprint` | Stable fingerprint derivation | `memory-curation.fingerprint.ts` |
| `.fixtures` | Cohesive test/eval fixtures | `memory-retrieval.fixtures.ts` |
| `.fmt` | Formatter/normalizer | `unicode-text.fmt.ts` |
| `.guard` | Access/execution guard | `authorized.guard.ts` |
| `.handler` | Event/request handler | `submit.handler.ts` |
| `.hook` | React hook | `session.hook.ts` |
| `.map` | Mapper | `memory.map.ts` |
| `.mock` | Test/development mock | `repository.mock.ts` |
| `.policy` | Domain/application policy | `memory-acceptance.policy.ts` |
| `.port` | Application/architecture port | `memory-repository.port.ts` |
| `.prompt` | Prompt artifact | `memory-extraction.prompt.ts` |
| `.schema` | Runtime/schema definition | `memory.schema.ts` |
| `.audit` | Executable repository invariant checker | `.audit/architecture.audit.sh` |
| `.server` | React server component/module | `logo.server.tsx` |
| `.service` | Cohesive service | `projection.service.ts` |
| `.state` | Initial/default state | `session.state.ts` |
| `.type` | One type/interface contract | `memory.type.ts` |
| `.usage` | Usage/accounting derivation | `memory-curation.usage.ts` |
| `.use-case` | Application use case | `retrieve-memory.use-case.ts` |
| `.validate` | Validation behavior | `memory-provenance.validate.ts` |
| `.view` | Page/primary UI section | `hero.view.tsx` |
| `.vo` | Domain Value Object | `memory-judgment.vo.ts` |

Do not use `.value-object.ts`; use `.vo.ts`.

## 5. Entity vs Value Object

```text
Entity       = identity/lifecycle matters across state changes
Value Object = value + invariants define meaning; independent identity does not matter
```

A generic helper function is not a Value Object.

## 6. Leaf-directory barrels

Every code-bearing TypeScript/JavaScript leaf directory must contain an `index.ts` that reexports every project-created semantic module in that leaf directory.

A package-level `src/index.ts` remains a deliberate public API. Framework route directories, generated code, assets, shell-command directories and other directories without TypeScript module API semantics are exempt.

## 7. Imports

First-party absolute source aliases always begin with `@`; never define or use a project source alias beginning with `#`.

Imports terminate at the owning directory barrel. Do not import a final semantic source file directly. For example, import `@application/ports`, not `@application/ports/memory-repository.port`, and import `@component/auth-shell`, not `@component/auth-shell/auth-shell`.

Relative imports follow the same boundary: outside an `index.ts` barrel, import a directory API rather than another module file. An `index.ts` may directly reexport its own leaf modules because that is the barrel's purpose.

Do not import another workspace's internals; consume its declared package API. Avoid deep relative imports such as `../../../`.

## 8. Validation ownership

```text
Domain invariant                    → Domain
Application use-case/contract rule → Application
External/adaptor payload defense   → Infrastructure
```

Do not create DTO ceremony without an actual presentation/controller boundary.

## 9. Utilities and infrastructure

Generic technology helpers such as Unicode/NFKC normalization and SHA-256 belong to the owning Infrastructure/technical area when they do not encode domain meaning.

## 10. Assurance

AI-engineering assurance source belongs under the owner's `src/assurance/` area when applicable. In Memory Nucleus the canonical location is `src/assurance/evals/`.

`assurance` is cross-cutting engineering source, not a fourth production layer. Production Domain/Application/Infrastructure must not depend on it.

## 11. Audit evidence

`.audit/` is outside `.agents/`, product source roots, and CLI source. It is the temporary evidence/checking plane.

Generated evidence is ignored. During an active migration, narrowly scoped executable checker `.audit.sh` files may be committed in `.audit/` so CI and reviewers can reproduce the audit. Executable repository audit/check scripts use POSIX shell and end in `.audit.sh`; `.script.mjs` is not an allowed executable audit format. Package `scripts` must not execute `.mjs` automation; use a shell entrypoint and, when needed, an owning typed backend.

Framework-owned `.mjs` configuration modules, including `postcss.config.mjs`, are not executable repository audit scripts and remain in the locations and formats required by their tools.

Audit artifacts are not canonical engineering context. Promote durable conclusions into `.agents/context`, `rules`, `specs`, `adrs`, or `skills` before deleting them.

## 12. Frontend organization

Preserve framework-aware frontend architecture while normalizing source roots:

- globally reusable UI lives in the owning app/package `src` tree;
- route-local code remains colocated under the route source subtree;
- `page.tsx`, `layout.tsx`, `route.ts`, metadata and other reserved files keep framework names;
- reusable UI/library/state concerns expose intentional barrels;
- route groups may organize feature-specific source without creating pages;
- aliases must point at normalized `src` locations;
- source-root migration must not be used as a React/design redesign.

## 13. Ownership of repository commands

Turborepo/root task scripts own `dev`, `start`, `build`, `typecheck`, tests and workspace task graphs.

Elo owns monorepo platform operations: bootstrap, user-scoped direct-command setup, doctor, cleanup, the thin Kubernetes runtime lifecycle adapter, environment preparation/validation, Git/Husky/Commitlint/lint-staged setup and thin audit-check entrypoints. Structured Kubernetes lifecycle and Cypress Job behavior remains package-owned behind the POSIX adapter. The canonical repository binary remains `cli/elo`; `elo setup` installs a managed user launcher without publishing a global npm package or editing shell profiles.

A local `pnpm install` invokes `elo setup` through `postinstall`. `pnpm postclone` is an explicit recovery alias because npm and pnpm do not define an automatic post-clone lifecycle. `pnpm elo` and `./cli/elo` remain compatibility/recovery entrypoints.

The shell checkers themselves live in `.audit/`, never under `cli/src/`.

## 14. Mechanical enforcement

Executable `.audit/*.audit.sh` checkers and durable CI/harness mechanisms enforce filesystem/import invariants. Elo exposes shell entrypoints that invoke active audit checkers, but Elo does not own their implementation or duplicate the repository task graph.
