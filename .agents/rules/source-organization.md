---
version: 2
extends: code-style.md
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

Allowed non-source-root examples include:

```text
package.json
tsconfig.json
vite.config.ts
next.config.ts
turbo.json
Dockerfile
compose files
lockfiles
public/
readme.md
```

Next.js applications should use `src/app/` when compatible with the current app. Vite/React applications should use `src/`.

The embedded repository CLI is a development subsystem and uses:

```text
cli/src/
```

Do not create generic root dumping grounds such as `helpers/`, `utils/`, `scripts/`, `common/`, `misc/`, or `tooling/` for project implementation code.

## 2. File naming

Use kebab-case for every project-created source file and folder.

Framework-reserved filenames are explicit exceptions.

## 3. One primary artifact per module

Each source module has one primary exported artifact: one function, class, interface/type, schema, component, hook, command, adapter, port, or equivalent concern.

Private helpers and internal types may remain colocated when they exist only to support that primary artifact.

Do not split tiny private expressions into separate files merely to satisfy the rule.

## 4. Canonical suffixes

Use only suffixes defined here. Add a suffix to this rule before introducing it in project-created source.

| Suffix | Meaning | Example |
| --- | --- | --- |
| `.abstract` | Abstract runtime contract | `payment.abstract.ts` |
| `.action` | React/server action | `sign-in.action.ts` |
| `.adapter` | Protocol/interface adapter | `postgres.adapter.ts` |
| `.atom` | State atom | `session.atom.ts` |
| `.client` | External-system or React client | `http.client.ts` |
| `.command` | Elo/repository CLI command | `doctor.command.ts` |
| `.compute` | Pure derived computation | `score.compute.ts` |
| `.data` | Related static application data | `thresholds.data.ts` |
| `.domain` | Domain-specific model/type when not an Entity/VO | `memory.domain.ts` |
| `.entity` | Domain Entity with identity/lifecycle | `memory.entity.ts` |
| `.event` | Event definition/payload | `memory-created.event.ts` |
| `.fmt` | Formatter/normalizer | `unicode-text.fmt.ts` |
| `.guard` | Access/execution guard | `authorized.guard.ts` |
| `.handler` | Event/request handler | `submit.handler.ts` |
| `.hook` | React hook | `session.hook.ts` |
| `.map` | Mapper | `memory.map.ts` |
| `.mock` | Test/development mock | `repository.mock.ts` |
| `.port` | Application/architecture port | `memory-repository.port.ts` |
| `.schema` | Runtime/schema validation | `memory.schema.ts` |
| `.script` | Elo-owned repository script/check | `architecture.script.mjs` |
| `.server` | React server component/module | `logo.server.tsx` |
| `.service` | Cohesive service | `projection.service.ts` |
| `.state` | Initial/default state | `session.state.ts` |
| `.type` | One type/interface contract | `memory.type.ts` |
| `.validate` | Validation behavior | `memory-provenance.validate.ts` |
| `.view` | Page/primary UI section | `hero.view.tsx` |
| `.vo` | Domain Value Object | `memory-judgment.vo.ts` |

Do not use `.value-object.ts`; use `.vo.ts`.

## 5. Entity vs Value Object

Use the semantic distinction:

```text
Entity
= identity/lifecycle matters across state changes

Value Object
= value + invariants define meaning; independent identity does not matter
```

A Value Object must be a real object/class or equivalent encapsulated domain value with meaningful invariants/behavior. A generic helper function is not a Value Object.

## 6. Leaf-directory barrels

Every code-bearing leaf directory must contain an `index.ts` that reexports every project-created module in that leaf directory.

Example:

```text
application/ports/
├── clock.port.ts
├── inference.port.ts
├── memory-repository.port.ts
└── index.ts
```

Consumers outside that leaf should import through the leaf barrel instead of enumerating internal files.

A package-level `src/index.ts` is different: it is a deliberate public API and must not expose private internals merely because leaf barrels exist.

Framework route directories, generated code, assets, and other directories with no module API semantics are exempt.

## 7. Imports

Prefer package aliases and local barrels. Avoid deep relative imports such as `../../../`.

Do not import another workspace's internals. Cross-workspace consumption must use that workspace/package public API.

## 8. Validation ownership

Classify validation by semantics:

```text
Domain invariant
→ Domain

Application use-case/contract invariant
→ Application

External/adaptor payload defense
→ Infrastructure
```

Do not create a generic DTO architecture when there is no controller/presentation boundary requiring DTO mapping.

## 9. Utilities and infrastructure

A generic technical helper may live under an owner's Infrastructure area when it represents implementation technology rather than domain meaning.

Examples include generic Unicode/NFKC normalization and SHA-256 implementation.

Do not move domain semantics to Infrastructure merely because the implementation is a function.

## 10. Assurance

AI-engineering assurance source belongs under the owning package's `src/assurance/` area when applicable.

For Memory Nucleus:

```text
src/assurance/evals/
```

`assurance` is cross-cutting engineering source, not a fourth Clean Architecture production layer. Domain/Application/Infrastructure must not depend on assurance/evals.

## 11. Audit evidence

`.audit/` is outside `.agents/` and outside product source roots. It contains temporary execution evidence only.

Audit artifacts are not canonical engineering context. Promote durable findings to `.agents/context`, `rules`, `specs`, `adrs`, or `skills` before deleting temporary audit contents.

## 12. Frontend organization

Frontend feature/route conventions remain framework-aware:

- globally reusable UI belongs in the app/package `src` tree;
- route-local implementation belongs under the route's source subtree;
- framework-reserved `page.tsx`, `layout.tsx`, `route.ts`, metadata and similar files keep their required names;
- globally reusable UI/library/state areas expose intentional public barrels;
- route groups may organize feature-specific code without creating additional pages;
- aliases should point at the normalized `src` locations after migration.

## 13. Mechanical enforcement

Elo repository checks must mechanically enforce every rule here that can be decided from the filesystem/import graph, including source-root placement, suffixes, leaf barrels, forbidden deep/cross-workspace imports, package export existence, assurance dependency direction, and obsolete root tooling paths.
