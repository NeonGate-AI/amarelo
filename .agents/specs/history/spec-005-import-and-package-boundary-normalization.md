---
id: SPEC-005
title: Normalize imports and package-public boundaries
type: migration
status: implemented
mode: retrospective
created: 2026-09-02
updated: 2026-09-02
owners:
  - Jonatas Sales
targets:
  - first-party source imports
  - shared package exports
  - onboarding server-client boundary
  - application build compatibility
context:
  - .agents/context/workspaces/
rules:
  - .agents/rules/import-boundaries.md
  - .agents/rules/source-organization.md
  - .agents/rules/package-ownership.md
  - .agents/rules/react-and-next.md
adrs:
  - .agents/adrs/
skills:
  - .agents/skills/
evidence:
  - https://github.com/NeonGate-AI/amarelo-v2/pull/1
  - commit c36759ed5e6366e78492897bde86e9c9568d39e5
  - commit f879608f0ef613e1d4ff3530748cc333555b467d
  - commit 8e08b64ed008449d6241e710da2e522d933cfb5d
  - commit 8b3ecb20d39e4a90059e45a55ad9ad6ad00f15cc
  - commit 91a0871b92fd30346fbc09849bea72145dd8b802
  - commit b933c9c0ea9f1f7b83db7c2cf7515eda4f5d4e11
---

# SPEC-005: Normalize imports and package-public boundaries

## Problem Statement

The source-root migration left inconsistent first-party aliases, deep cross-directory imports and shared packages that compiled only because consumers could see producer-private TypeScript paths. Some barrels also risked mixing client-safe state with server-only dependencies.

These inconsistencies caused application build failures and made package boundaries descriptive rather than enforceable.

## Solution

Normalize first-party absolute imports to the `@` prefix, require cross-directory source imports to terminate at the target leaf barrel and expose every code-bearing leaf through `index.ts`.

Replace producer-private aliases and undeclared deep imports with declared package exports. Preserve server/client runtime boundaries by moving client-safe onboarding state behind a dedicated leaf rather than weakening server-only markers.

Repair application consumers, shared UI exports and Tailwind source paths so the full monorepo compiles and builds through public boundaries.

## User Stories

1. As a workspace consumer, I want imports to use declared package APIs, so that my build does not depend on another package's private compiler aliases.
2. As a source maintainer, I want one canonical absolute alias convention, so that refactors do not preserve parallel `#` and `@` forms.
3. As a module owner, I want cross-directory imports to enter through leaf barrels, so that source boundaries are visible and mechanically checkable.
4. As a Next.js maintainer, I want client-safe contracts isolated from server-only modules, so that barrel cleanup does not leak credentials or server dependencies into Client Components.
5. As a Mobile maintainer, I want shared React components to compile from public exports, so that the Vite build remains independent of producer internals.
6. As a reviewer, I want import-boundary violations rejected in CI, so that normalization does not regress gradually.

## Scope

The reconstructed migration includes:

- conversion of first-party `#` aliases to `@`;
- leaf-barrel creation and coverage;
- cross-directory final-file import replacement;
- public export repair in shared packages;
- Agent Orb preset consumption through its public barrel;
- SmoothUI utility dependency exposure;
- onboarding client-safe auth/action state boundary;
- Mobile and other application consumer fixes;
- Tailwind source path repair;
- mechanical import-boundary and architecture enforcement.

## Implementation Decisions

- First-party source aliases start with `@`; `#` is forbidden.
- Imports that enter another source directory terminate at that directory's barrel.
- Same-leaf sibling imports may remain direct to avoid self-barrel cycles.
- Cross-workspace imports use declared package names and exports.
- Consumer compilation must not rely on private producer TypeScript aliases.
- A barrel must preserve runtime boundaries and may not mix client-safe exports with server-only implementation dependencies.
- Server-only markers are retained; client-safe state is moved instead.
- Framework-reserved files and assets remain exempt where the framework owns lookup semantics.
- Import checks accompany source moves rather than relying on a one-time migration script.

## Testing Decisions

### Primary seam

The primary observed seam is repository-wide typecheck and build across every consumer workspace using only the normalized boundaries.

### Secondary seams

- Import-boundary audit.
- Architecture audit.
- Mobile Vite/PWA production build.
- Onboarding Next.js client/server compilation.
- Shared package export resolution.
- Tailwind source path validation.

### Fixtures and privacy

This migration concerns source and build graphs. It does not require personal product data.

### Required validation

Pull request #1 reports 227 imports across 83 files normalized and a green final CI run including Mobile, Landing, Console and Onboarding builds.

## Acceptance Criteria

- [x] First-party absolute aliases use `@` rather than `#`.
- [x] Cross-directory source imports use target leaf barrels.
- [x] Every code-bearing leaf exposes its project-created modules.
- [x] Cross-workspace consumers use package-public exports.
- [x] Shared React consumers do not depend on producer-private aliases.
- [x] Agent Orb presets are available through the public Agent Orb boundary.
- [x] Onboarding client state does not import a mixed server-only barrel.
- [x] Server-only markers remain intact.
- [x] Tailwind source paths resolve after source moves.
- [x] Mobile production build and PWA generation pass.
- [x] Architecture and import-boundary audits enforce the resulting convention.
- [x] One-time migration artifacts are removed after durable rules/checks are established.

## Failure Behavior

- A `#` first-party alias fails the import-boundary check.
- A cross-directory final semantic-file import fails the boundary check.
- A consumer import of an undeclared package subpath fails compilation or the audit.
- A mixed server/client barrel is rejected rather than solved by removing the server-only marker.
- A stale relative Tailwind source fails the architecture checker.
- A workspace that compiles only with producer-private aliases fails consumer build validation.

## Out of Scope

- New product features.
- Changing package ownership for convenience.
- Introducing a universal root alias.
- Weakening Next.js runtime boundaries.
- Rewriting framework-reserved route files.
- Real AI runtime or Memory Nucleus product integration.
- A claim that every individual import edit was originally planned as one bounded ticket.

## Evidence and Promotion

Primary evidence is the merged pull request, listed migration/rule commits, current package exports and the architecture/import checkers.

The resulting conventions were promoted into durable rules, workspace context and mechanical audits. Temporary migration scripts were removed after the repository reached the normalized state.

## Further Notes

The merged pull request describes the migration numerically. Those counts are retained as reported evidence from that pull request rather than recomputed by this retrospective spec.

## Retrospective Integrity

This spec was reconstructed after the normalization and repair work. Commit history and current package resolution are the highest-confidence evidence; the pull-request summary supplies reported counts and validation status.

It does not imply that the broad migration was originally decomposed using the later tracer-bullet workflow or that every intermediate commit independently satisfied the final architecture.
