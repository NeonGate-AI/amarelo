---
id: SPEC-007
title: Make Elo directly invokable and migrate executable MJS automation to shell
type: feature
status: in-progress
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - Elo CLI
  - audit checkers
  - design-system token build
  - package lifecycle
  - continuous integration
  - engineering harness
context:
  - AGENTS.md
  - cli/readme.md
  - package.json
  - workspaces/packages/design-system/package.json
  - .github/workflows/ci.yml
rules:
  - .agents/rules/architecture.md
  - .agents/rules/context-engineering.md
  - .agents/rules/markdown.md
  - .agents/rules/source-organization.md
  - .agents/rules/spec-driven-development.md
adrs:
  - .agents/adrs/0014-workspaces-and-centralized-harness.md
  - .agents/adrs/0018-spec-driven-delivery.md
  - .agents/adrs/0019-posix-elo-control-plane.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/implement
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/code-review
evidence:
  - pending
---

# SPEC-007: Make Elo directly invokable and migrate executable MJS automation to shell

## Problem Statement

The repository already owns a POSIX-shell Elo CLI, but developers normally enter it through `pnpm elo` or `./cli/elo`. A fresh install does not establish `elo <command>` on the developer's existing user `PATH`. Elo without arguments also starts bootstrap work instead of presenting a safe discovery interface, and unknown-command behavior does not consistently return a usage-error status.

Six executable automations still use `.mjs`: five repository invariant checkers under `.audit/` and the design-system token builder. This leaves more than one executable scripting convention even though repository-platform automation is already owned by shell. The design-token transformation is non-trivial and should not be flattened into fragile shell text processing.

## Solution

Add an idempotent `elo setup` command that writes a small managed launcher into a user-owned binary directory selected from an explicit override, `PNPM_HOME`, `XDG_BIN_HOME`, or `~/.local/bin`. Invoke setup from `postinstall`; expose an explicit `postclone` package script because npm and pnpm do not provide an automatic post-clone lifecycle; and skip user-home mutation in CI.

Harden Elo so no arguments show help, help/version have direct contracts, unknown commands return status 2, and `check all` composes every invariant checker without taking task-graph ownership from Turborepo.

Replace the five `.audit/*.script.mjs` programs with executable POSIX `.audit/*.script.sh` programs. Replace the design-system `.mjs` entrypoint with a POSIX shell entrypoint while retaining the token transformation as an erasable TypeScript backend executed by the repository's required Node.js 24 runtime. Framework-owned `.mjs` configuration modules remain unchanged.

## User Stories

1. As a developer after dependency installation, I want to type `elo doctor` or `elo check all` without a package-manager prefix.
2. As a developer invoking Elo without arguments, I want side-effect-free help instead of an implicit bootstrap.
3. As a CI maintainer, I want local and CI invariant checks to execute the same shell entrypoints.
4. As a design-system maintainer, I want token generation to enter through shell without losing the typed implementation appropriate for JSON traversal and serialization.
5. As a repository maintainer, I want setup to be user-scoped, idempotent and collision-safe.
6. As a framework maintainer, I want required configuration modules such as `postcss.config.mjs` excluded from mechanical renaming.

## Scope

This change owns:

- direct user-scoped installation of the Elo launcher;
- `postinstall` wiring and an explicit `postclone` recovery script;
- safe no-argument, help, version, unknown-command and aggregate-check behavior;
- conversion of all five `.audit/*.script.mjs` programs to POSIX shell;
- conversion of `build-tokens.mjs` to a shell entrypoint plus TypeScript backend;
- preservation of current platform, architecture, import, memory, spec and generated-token behavior;
- CI, documentation and durable source-organization updates;
- deterministic shell contract fixtures that do not use product data or external network access.

## Implementation Decisions

- `cli/elo` remains the canonical repository binary; substantive CLI code remains under `cli/src/` as POSIX shell.
- `elo setup` generates a launcher rather than publishing or globally installing an npm package.
- Destination precedence is `--bin-dir` or `ELO_BIN_DIR`, then `PNPM_HOME`, `XDG_BIN_HOME`, and `$HOME/.local/bin`.
- Setup never invokes `sudo`, edits a shell profile, changes the current process `PATH`, or silently overwrites an unrelated command.
- A managed marker controls replacement. Setup writes a temporary file in the destination and atomically renames it.
- Manual setup fails on an unmanaged collision. Lifecycle setup warns and skips so dependency installation is not broken.
- The generated launcher targets the checkout that installed it. A moved checkout requires setup from a valid checkout.
- `postinstall` is the automatic local setup event. `postclone` is an explicit package script because Git/npm/pnpm expose no automatic post-clone lifecycle.
- CI and `ELO_SETUP_DISABLED` skip launcher installation.
- Audit scripts preserve allowlists, quoted argument boundaries, deterministic exit codes and no-`eval` execution.
- Design-token shell code only selects build/watch execution and delegates JSON/reference/serialization logic to `build-tokens.ts`.
- The TypeScript backend uses only erasable syntax supported by the required Node.js 24 runtime and keeps explicit `.ts` import extensions.
- Turborepo/root scripts remain the owners of `dev`, `start`, `build`, `typecheck`, tests and workspace task graphs.
- Framework-owned `.mjs` configuration files remain in their required locations and formats.

## Testing Decisions

The primary direct-command seam is:

```text
ELO_BIN_DIR=<temporary-directory> ./cli/elo setup
<temporary-directory>/elo --version
<temporary-directory>/elo check platform
```

The fixture must prove creation, direct execution, idempotence, unmanaged-collision protection, CI skipping and no writes outside the selected temporary destination.

Secondary seams are:

- `./cli/elo` prints help and exits 0 without bootstrap effects;
- unknown commands and invalid subcommands exit 2;
- `./cli/elo check all` runs all five checks in deterministic order;
- every committed shell entrypoint passes `/bin/sh -n`;
- no executable `.mjs` remains in `.audit/`, package `scripts`, or a `src/scripts/` execution path;
- all framework `.config.mjs` files remain valid;
- `pnpm --filter @repo/ds build` generates the same token JSON and CSS contract;
- existing repository validation remains green.

Fixtures use `mktemp`, controlled environment variables and generated collisions. They do not contact registries, start Docker, read product data or edit user shell configuration.

## Acceptance Criteria

- [ ] `SPEC-007` transitioned from approved `ready` to `in-progress` before executable implementation.
- [ ] `elo setup` installs an idempotent managed launcher in the selected user-owned binary directory.
- [ ] Setup never uses `sudo`, edits shell profiles or implicitly replaces an unmanaged `elo` command.
- [ ] Local `pnpm install` invokes setup through `postinstall`; CI can skip it safely.
- [ ] The root exposes an explicit `postclone` script and documentation states that it is not an automatic npm/pnpm lifecycle.
- [ ] After setup, `elo <command>` works without a `pnpm` prefix.
- [ ] Elo without arguments shows help without mutation; usage errors return status 2.
- [ ] Elo exposes `--version` and `check all` without duplicating Turborepo task graphs.
- [ ] All five executable `.audit/*.script.mjs` checkers are replaced by executable POSIX `.audit/*.script.sh` checkers.
- [ ] `build-tokens.mjs` is replaced by an executable shell entrypoint and a typed backend with equivalent generated artifacts.
- [ ] Package scripts do not execute `.mjs` automation.
- [ ] Framework-owned `.config.mjs` modules remain unchanged.
- [ ] CI, audit hygiene, CLI help and durable source-organization documentation use the new contract.
- [ ] Existing lint, typecheck, tests, database validation, AI evals, build and Git-hook smoke validation pass on the pull-request head.
- [ ] The spec closes as `implemented` with stable commit, issue, pull-request and CI evidence.

## Failure Behavior

- Missing permissions or an unavailable destination fail manual setup with an actionable error.
- Lifecycle setup treats CI, an explicit disable flag, a missing home directory and unmanaged collisions as non-fatal skips with warnings.
- A launcher whose configured checkout is unavailable exits with guidance to rerun local setup.
- An invalid Elo command or subcommand exits 2.
- `check all` stops at the first failing invariant and returns non-zero.
- Invalid shell syntax, executable MJS drift, lifecycle drift, token-build drift or task-runner ownership drift fail the platform audit/CI.
- Token parsing, references and serialization retain explicit errors from the typed backend.
- Abandoning the branch changes no product runtime, database or persisted product data.

## Out of Scope

- Renaming `postcss.config.mjs` or other framework-owned configuration modules.
- Implementing JSON traversal or token serialization directly in shell.
- Publishing Elo to npm, globally installing a package, adding auto-update, invoking `sudo`, or editing shell profiles.
- Adding product build/dev/test/eval task graphs to Elo.
- Changing application, AI, Memory Nucleus, database, Docker or deployment behavior.
- Promising macOS/Windows support without an explicit CI matrix.
- Adding destructive reset commands or deleting persistent data.

## Evidence and Promotion

Implementation evidence will include the spec/ADR commits, derived issues #6, #7, #8 and #12, direct-launcher fixtures, shell syntax checks, design-token build output, the pull request and its full CI run.

Durable conclusions are promoted to `cli/readme.md`, `.agents/rules/source-organization.md`, `.agents/adrs/0019-posix-elo-control-plane.md`, `package.json`, the design-system package manifest and `.github/workflows/ci.yml`.

## Further Notes

The owner approved this bounded change on 2026-09-03. The attached research supports a thin shell control plane while retaining pnpm/Turborepo and typed backends for non-trivial behavior. The implementation therefore removes executable `.mjs` entrypoints without turning JSON transformation into a shell application.

There is no standard automatic `postclone` lifecycle in npm or pnpm. The first `pnpm install` after cloning is the automatic setup event through `postinstall`; `pnpm postclone` remains an explicit recovery command.
