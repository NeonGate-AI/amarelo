---
id: SPEC-010
title: Make Elo directly invokable and migrate executable MJS automation to shell
type: feature
status: implemented
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
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0014-workspaces-and-centralized-harness.adr.md
  - .agents/adrs/0018-spec-driven-delivery.adr.md
  - .agents/adrs/0022-posix-elo-control-plane.adr.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/implement
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/code-review
evidence:
  - commit 028b4ca70648ade3b1af288fd333cf4b5198af31
  - commit 3e4ba88785dc766f2caf656aae284b19d21d79d5
  - commit 241f8c237d3f981ddd67ead99680fb41479bba91
  - commit f7f20c5e48a312d03e989577351613ef16e20840
  - commit 0b256414003c31c8a8a09a584a6927880b652550
  - commit 58def13f616eed7c3abf8b6fec6103dd3df0ef23
  - commit 8c3154ab06aafb2489bed16a792fdbf536dc3fc6
  - commit 2708cf4f163c234ec1bf7570f7b2de0fd36a4b3b
  - commit 6c01e188847e51859adcec4ab806865d8dbf8e48
  - commit 5797d4ebfea5df51bb10e7e498eb27faa2ce7c46
  - commit 4b1e52eb7e41abadc113142903debdf11d49e0e0
  - commit 45ff897b297938857053c7732b27b8280be8b6fc
  - https://github.com/NeonGate-AI/amarelo-v2/issues/6
  - https://github.com/NeonGate-AI/amarelo-v2/issues/7
  - https://github.com/NeonGate-AI/amarelo-v2/issues/8
  - https://github.com/NeonGate-AI/amarelo-v2/issues/12
  - https://github.com/NeonGate-AI/amarelo-v2/pull/11
  - https://github.com/NeonGate-AI/amarelo-v2/actions/runs/33721619558
  - https://github.com/NeonGate-AI/amarelo-v2/pull/11#issuecomment-5521409275
---

# SPEC-010: Make Elo directly invokable and migrate executable MJS automation to shell

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
- A managed marker controls replacement. Setup writes through an exclusive temporary directory in the destination and atomically renames the completed launcher.
- Manual setup fails on an unmanaged regular file, symlink or non-regular collision. Lifecycle setup warns and skips so dependency installation is not broken.
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

The fixture must prove creation, direct nested command execution, idempotence including executable-mode repair, manual and lifecycle collision behavior, CI/disable/missing-destination skipping, path handling for spaces and apostrophes, stale-checkout guidance, invalid-subcommand status, and no writes outside the selected temporary destination.

Secondary seams are:

- `./cli/elo` prints help and exits 0 without bootstrap effects;
- unknown commands and invalid subcommands exit 2;
- `./cli/elo check all` runs all five checks in deterministic order;
- every committed shell entrypoint passes `/bin/sh -n`;
- no executable `.mjs` remains in `.audit/`, package `scripts`, or a `src/scripts/` execution path;
- all framework `.config.mjs` files remain valid;
- `pnpm --filter @repo/ds build` generates the token JSON and CSS contract;
- existing repository validation remains green.

Fixtures create exclusive temporary directories with POSIX `mkdir`, use controlled environment variables and generate collisions. They do not contact registries, start Docker, read product data or edit user shell configuration.

## Acceptance Criteria

- [x] `SPEC-010` transitioned from approved `ready` to `in-progress` before executable implementation.
- [x] `elo setup` installs an idempotent managed launcher in the selected user-owned binary directory.
- [x] Setup never uses `sudo`, edits shell profiles or implicitly replaces an unmanaged `elo` command.
- [x] Local `pnpm install` invokes setup through `postinstall`; CI skips it safely.
- [x] The root exposes an explicit `postclone` script and documentation states that it is not an automatic npm/pnpm lifecycle.
- [x] After setup, `elo <command>` works without a `pnpm` prefix.
- [x] Elo without arguments shows help without mutation; usage errors return status 2.
- [x] Elo exposes `--version` and `check all` without duplicating Turborepo task graphs.
- [x] All five executable `.audit/*.script.mjs` checkers are replaced by executable POSIX `.audit/*.script.sh` checkers.
- [x] `build-tokens.mjs` is replaced by an executable shell entrypoint and a typed backend with equivalent generated artifacts.
- [x] Package scripts do not execute `.mjs` automation.
- [x] Framework-owned `.config.mjs` modules remain unchanged.
- [x] CI, audit hygiene, CLI help and durable source-organization documentation use the new contract.
- [x] Existing lint, typecheck, tests, database validation, AI evals, build and Git-hook smoke validation pass on the pull-request implementation head.
- [x] The spec closes as `implemented` with stable commit, issue, pull-request, review and CI evidence.

## Failure Behavior

- Missing permissions or an unavailable destination fail manual setup with an actionable error.
- Lifecycle setup treats CI, an explicit disable flag, a missing home directory and unmanaged collisions as non-fatal skips with warnings.
- A launcher whose configured checkout is unavailable exits with guidance to rerun local setup.
- An invalid Elo command or subcommand exits 2.
- `check all` stops at the first failing invariant and returns non-zero.
- Invalid shell syntax, executable MJS drift, lifecycle drift, token-build drift or task-runner ownership drift fail the platform audit and CI.
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

Final evidence:

- `028b4ca70648ade3b1af288fd333cf4b5198af31` recorded the owner-approved ready contract under its initially assigned legacy ID;
- `3e4ba88785dc766f2caf656aae284b19d21d79d5` moved the contract to `in-progress` before executable implementation;
- `31be1b1727dad8f59aed2f95cf1b229931997f5b` implemented the direct launcher and lifecycle seam;
- `b4dffde6ff47b69cd3bf9d735bef746cf7381ad0` moved design-token execution behind shell with a typed backend;
- `6fa6ad57dcd35737b62b271a5c69812f5dd07f62` replaced the five MJS audit programs with POSIX shell and updated CI dispatch;
- `a002c8e88b29a3110dd1b0814d32b2f7ed2fd060` promoted the CLI and source-organization contracts;
- `241f8c237d3f981ddd67ead99680fb41479bba91` reconciled the active record to `SPEC-010` and ADR 0022 after parallel reservations were discovered;
- `f7f20c5e48a312d03e989577351613ef16e20840` hardened exclusive temporary creation, exact PATH parsing, collision handling and installed-launcher fixtures;
- `0b256414003c31c8a8a09a584a6927880b652550` formally reopened the spec when deeper post-closure review found additional gaps;
- `58def13f616eed7c3abf8b6fec6103dd3df0ef23` completed lifecycle, destination, stale-checkout, usage and executable-mode contracts;
- `8c3154ab06aafb2489bed16a792fdbf536dc3fc6` restored recursive package-export validation and hardened portable audit signal handling;
- `2708cf4f163c234ec1bf7570f7b2de0fd36a4b3b` added strict typechecking ownership for the design-token backend;
- `6c01e188847e51859adcec4ab806865d8dbf8e48` completed recursive alternate-destination manifests and made doctor validate path type before reading;
- `5797d4ebfea5df51bb10e7e498eb27faa2ce7c46` added a FIFO regression fixture proving doctor does not open non-regular launcher paths;
- `4b1e52eb7e41abadc113142903debdf11d49e0e0` made that FIFO fixture deterministic and signal-safe;
- `45ff897b297938857053c7732b27b8280be8b6fc` is the exact independently reviewed implementation head;
- issues #6, #7, #12 and #8 record the completed vertical delivery graph;
- pull request #11 contains the complete diff and references `SPEC-010`;
- the final two-axis completion review at https://github.com/NeonGate-AI/amarelo-v2/pull/11#issuecomment-5521409275 approved the exact implementation head with zero blocking findings;
- CI run `33721619558` / run number 251 completed Elo doctor, every shell audit, audit hygiene, Commitlint, Biome, strict typecheck, tests, Memory PostgreSQL validation, AI evals, full build and Git-hook smoke tests successfully on `45ff897b297938857053c7732b27b8280be8b6fc`;

Promotion completed:

- developer-facing installation and command behavior in `cli/readme.md` and the root `readme.md`;
- permanent executable-script and task-ownership constraints in `.agents/rules/010-source-organization.rule.md`;
- the shell-control-plane and user-launcher tradeoff in `.agents/adrs/0022-posix-elo-control-plane.adr.md`;
- lifecycle entrypoints in `package.json`;
- shell-front/typed-backend token execution in `workspaces/packages/design-system/package.json` and `src/scripts/`;
- reproducible checks and audit hygiene in `.github/workflows/ci.yml` and `.audit/*.script.sh`.

## Further Notes

The first implementation commits used `SPEC-007` and ADR 0019 while parallel approved delivery branches had already reserved `SPEC-007` through `SPEC-009` and ADRs 0019 through 0021. This record was therefore renumbered to `SPEC-010` and ADR 0022 before promotion. The legacy branch name and early commit trailers remain historical Git metadata.

The owner approved this bounded change on 2026-09-03. The attached research supports a thin shell control plane while retaining pnpm/Turborepo and typed backends for non-trivial behavior. The implementation therefore removes executable `.mjs` entrypoints without turning JSON transformation into a shell application.

There is no standard automatic `postclone` lifecycle in npm or pnpm. The first `pnpm install` after cloning is the automatic setup event through `postinstall`; `pnpm postclone` remains an explicit recovery command.

The selected user binary directory must already be on `PATH` for direct invocation. Elo reports the missing entry but deliberately does not edit shell profiles.
