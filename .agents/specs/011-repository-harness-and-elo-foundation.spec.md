---
id: SPEC-001
title: Establish the repository harness and Elo platform foundation
type: refactor
status: implemented
mode: retrospective
created: 2026-09-02
updated: 2026-09-02
owners:
  - Jonatas Sales
targets:
  - repository root
  - engineering harness
  - Elo CLI
  - continuous integration
context:
  - AGENTS.md
  - .agents/context/
rules:
  - .agents/rules/architecture.rule.md
  - .agents/rules/markdown.rule.md
  - .agents/rules/source-organization.rule.md
adrs:
  - .agents/adrs/
skills:
  - .agents/skills/
evidence:
  - https://github.com/NeonGate-AI/amarelo-v2/pull/1
  - commit 4823a314b2c6d5e3e3a5f7eb0ba0e9ad0561bfce
  - commit eff67611ab96669bd13848bb7009a00220e3f3da
  - commit 2a86bb1208b6b9d30d47d5710e50ee8d78d0826b
  - commit 5eb43ace0c0e852b3777f5a2aaddfea11f949e3f
  - commit 561bbb2a38f8f42be24494e0cf487e0088b58bea
  - commit 392200ec77b57ad2c1d769782a045067e92b1e74
---

# SPEC-001: Establish the repository harness and Elo platform foundation

## Problem Statement

The repository had accumulated competing engineering instructions, temporary planning artifacts and unclear ownership between platform bootstrap commands and the monorepo task runner. Source layout and module boundaries were not consistently enforceable, which made a fresh clone and an agent-driven change vulnerable to drift.

The reconstructed capability needed one canonical engineering entrypoint, progressive harness loading, an explicit temporary evidence plane, predictable workspace source roots and a platform CLI that did not duplicate Turborepo.

## Solution

Create a canonical repository harness centered on root `AGENTS.md` and the `.agents/{context,rules,specs,adrs,skills}` taxonomy. Separate temporary audit evidence under `.audit/`.

Establish Elo as the repository-local POSIX shell platform CLI at `cli/elo`. Elo owns bootstrap, doctor, environment, Git wiring and invariant-check entrypoints. Root scripts and Turborepo retain ownership of development, build, typecheck and test task graphs.

Normalize first-party source beneath workspace `src/` roots, expose code-bearing leaf barrels and run immutable repository checks through CI.

## User Stories

1. As an engineering agent, I want one canonical entrypoint, so that I load the correct rules before editing code.
2. As a maintainer, I want durable context separated from temporary evidence, so that logs do not become accidental architecture.
3. As a developer cloning the repository, I want one local bootstrap path, so that environment and Git setup are reproducible.
4. As a workspace owner, I want implementation under predictable `src/` roots, so that tooling and imports remain consistent.
5. As a platform maintainer, I want Elo and Turborepo to have non-overlapping ownership, so that the repository does not grow two task runners.
6. As a reviewer, I want architecture invariants executed in CI, so that structural regressions fail mechanically.

## Scope

The reconstructed scope includes:

- root engineering-agent entrypoint and progressive harness navigation;
- `.agents` knowledge taxonomy;
- `.audit` evidence boundary;
- repository-local Elo launcher and shell implementation;
- root/Turbo task ownership;
- source-root normalization;
- leaf-barrel convention;
- CI installation, audits, lint, typecheck, tests, evals and build.

## Implementation Decisions

- Root `AGENTS.md` is the only repository-wide engineering-agent entrypoint.
- `.agents` contains durable context, rules, specs, ADRs and reusable skills.
- `.audit` contains checkers and temporary evidence but is not canonical context.
- Elo remains POSIX shell and lives under `cli/`.
- Elo exposes platform and invariant entrypoints but not duplicate build, test, lint, format or typecheck orchestration.
- Root package scripts delegate task graphs directly to Turborepo.
- Workspaces place first-party implementation under `src/`.
- Mechanical architecture checks are first-class CI gates.

## Testing Decisions

### Primary seam

The highest observed seam is a clean repository validation run through CI, including Elo checks and the root/Turbo task graph.

### Secondary seams

- Direct `./cli/elo doctor --ci`.
- Direct invariant checks for platform and architecture.
- Git hook smoke tests.
- Workspace typecheck, package tests, evals and application builds.

### Fixtures and privacy

Repository validation uses source, configuration and synthetic test data. This retrospective spec does not authorize use of product user data.

### Required validation

The merged pull request reports a green CI run covering installation, Elo doctor, architecture checks, import checks, memory checks, lint, typecheck, tests, database validation, AI evals, build and hooks. This retrospective change does not independently rerun that historical CI result.

## Acceptance Criteria

- [x] Root `AGENTS.md` is the canonical engineering entrypoint.
- [x] Durable harness categories are separated from `.audit` evidence.
- [x] Elo is launched from `cli/elo` and is implemented in POSIX shell.
- [x] Elo does not own the repository build, test or typecheck task graph.
- [x] First-party workspace source is normalized under `src/`.
- [x] Code-bearing leaf directories expose barrels.
- [x] CI runs platform, architecture, import, memory and repository quality gates.
- [x] Git hooks delegate through the repository-local Elo CLI.
- [x] Pull request #1 records a green final validation for the merged state.

## Failure Behavior

- A missing or conflicting agent entrypoint is an architecture failure.
- Source outside an approved workspace `src/` boundary fails the architecture checker.
- Elo exposing task-runner commands owned by Turborepo fails the platform audit.
- Unexpected tracked audit evidence fails CI hygiene.
- Failed install, audit, lint, typecheck, test, eval or build blocks the validation workflow.

## Out of Scope

- Product feature development.
- Real AI agent execution.
- PWA-to-backend conversation.
- Production deployment architecture.
- A claim that the repository was originally created through this retrospective spec.

## Evidence and Promotion

Primary evidence is the merged pull request, the listed commits and the current committed harness, CLI and CI files.

The durable outcomes were promoted into root `AGENTS.md`, `.agents`, Elo, `.audit` checkers and the CI workflow. The earlier temporary handoff remained execution context rather than the durable source of these rules.

## Further Notes

Pull request #1 combines this capability with later import, application and AI-boundary work. This spec isolates the repository-platform foundation as a coherent historical capability rather than claiming the pull request was originally decomposed this way.

## Retrospective Integrity

This spec was written after implementation. The current repository and commit history are higher-confidence evidence than reconstructed prose intent. The pull-request description is evidence of reported scope and validation, not independent proof that every intermediate state satisfied the final constraints.

The document does not claim that the earlier work was spec-driven, test-first or planned using these exact user stories and decisions.
