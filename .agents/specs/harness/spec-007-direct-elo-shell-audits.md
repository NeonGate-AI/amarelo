---
id: SPEC-007
title: Make Elo directly invokable and migrate audit automation to POSIX shell
type: feature
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - Elo CLI
  - audit checkers
  - package lifecycle
  - continuous integration
  - engineering harness
context:
  - AGENTS.md
  - cli/readme.md
  - package.json
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

# SPEC-007: Make Elo directly invokable and migrate audit automation to POSIX shell

## Problem Statement

The repository already owns a POSIX-shell Elo CLI, but developers still normally enter it through `pnpm elo` or `./cli/elo`. A fresh local install does not establish a direct `elo <command>` entrypoint on the developer's existing user PATH. The current no-argument behavior also starts bootstrap work instead of presenting a safe, discoverable interface, and an unknown command falls through to help without a reliable usage-error status.

The engineering harness additionally keeps five executable repository audits as `.mjs` programs even though their operational entrypoint is Elo and the repository has standardized CLI/platform automation on shell. This leaves two automation models and makes the source-organization rule describe JavaScript audit scripts as a special case.

## Solution

Add an idempotent `elo setup` command that installs a small, managed launcher into a user-owned binary directory selected from an explicit override, `PNPM_HOME`, `XDG_BIN_HOME`, or `~/.local/bin`. Run that setup from the package `postinstall` lifecycle, expose an explicit `postclone` package script because npm and pnpm do not provide a standard automatic post-clone lifecycle, and keep CI/non-interactive installs free from host PATH mutation.

Harden Elo's dispatch contract so no arguments show help, usage errors exit with status 2, version/help are directly available, and `check all` composes the invariant checks. Preserve Turborepo ownership of repository task graphs.

Replace the five executable `.audit/*.script.mjs` checkers with POSIX `.audit/*.script.sh` implementations, update Elo and CI dispatch, and promote the resulting shell-only audit convention into the durable source-organization rule. Framework-owned `.mjs` configuration files are not executable repository scripts and remain unchanged.

## User Stories

1. As a developer after cloning and installing dependencies, I want to type `elo doctor` or `elo check all`, so that I do not need to remember a package-manager prefix.
2. As a developer running Elo without arguments, I want safe help output rather than an implicit install, so that command discovery has no side effects.
3. As a CI maintainer, I want the same shell checkers invoked through Elo locally and in CI, so that there is one reproducible audit path.
4. As a harness maintainer, I want executable audit automation expressed as POSIX shell, so that Elo's platform automation no longer depends on separate `.mjs` scripts.
5. As a repository maintainer, I want lifecycle setup to be idempotent and user-scoped, so that installs never require `sudo`, overwrite an unrelated command, or edit shell profiles.
6. As a reviewer, I want framework configuration distinguished from executable automation, so that required `postcss.config.mjs` files are not renamed mechanically.

## Scope

This change owns:

- direct user-scoped installation of the `elo` launcher;
- package lifecycle wiring for `postinstall` and an explicit `postclone` script;
- safe no-argument, unknown-command, help, version and aggregate-check behavior;
- conversion of all five executable `.audit/*.script.mjs` files to POSIX `.sh` checkers;
- preservation of the current platform, architecture, import-boundary, memory and spec-workflow assertions;
- CI audit dispatch and hygiene updates;
- CLI and durable harness documentation for the new contract;
- shell contract validation using temporary directories and no external network.

## Implementation Decisions

- `cli/elo` remains the canonical repository binary and `cli/src/` remains shell-only.
- `elo setup` installs a generated launcher rather than publishing or globally installing an npm package.
- The destination order is `--bin-dir`/`ELO_BIN_DIR`, `PNPM_HOME`, `XDG_BIN_HOME`, then `$HOME/.local/bin`.
- Setup creates directories and files only inside the selected user-owned destination. It never invokes `sudo`, edits a shell profile or changes the process PATH.
- A managed marker distinguishes the Elo launcher from unrelated executables. Manual setup fails on an unmanaged collision; lifecycle setup warns and skips rather than breaking dependency installation.
- Setup is idempotent and replaces only a previously managed launcher using a temporary file and atomic rename in the destination directory.
- The generated launcher targets the checkout that installed it. A later clone or moved checkout reruns setup; the most recent successful setup owns the user launcher.
- `postinstall` performs user launcher setup. `postclone` is a documented explicit package script because Git has no npm/pnpm post-clone lifecycle event.
- CI and explicitly disabled environments skip user launcher installation without failing dependency installation.
- Shell audit scripts use standard Unix/POSIX utilities, preserve quoted argument boundaries and do not use `eval`.
- Elo remains a control plane. `dev`, `start`, `build`, `typecheck`, tests and workspace task graphs remain direct root/Turborepo responsibilities.
- Framework-owned `.mjs` files such as `postcss.config.mjs` remain in place because they are configuration modules, not executable audit scripts.

## Testing Decisions

### Primary seam

The primary public seam is:

```text
ELO_BIN_DIR=<temporary-directory> ./cli/elo setup
<temporary-directory>/elo --version
<temporary-directory>/elo check platform
```

It must prove that setup creates a usable direct command without writing outside the fixture directory.

### Secondary seams

- `./cli/elo` returns help and status 0 without bootstrap side effects.
- Unknown commands and invalid subcommands return status 2.
- `./cli/elo check all` runs every audit in deterministic order and stops on the first failure.
- Every committed shell entrypoint passes `sh -n`.
- No executable `.audit/*.script.mjs` remains tracked.
- Package lifecycle scripts contain the exact setup and Git-adapter delegations expected by the platform audit.

### Fixtures and privacy

CLI installation tests use a `mktemp` directory, an isolated `ELO_BIN_DIR`, controlled environment variables and generated fake collisions. They do not read product data, contact a registry, start Docker or modify the developer's shell configuration.

### Required validation

- Elo platform audit, including direct-launcher contract checks.
- Architecture audit.
- Spec workflow audit.
- Import boundaries audit.
- Memory invariants audit.
- POSIX syntax validation for tracked shell files.
- Existing lint, typecheck, tests, database validation, AI evals, build and Git-hook smoke tests in CI.

## Acceptance Criteria

- [ ] `SPEC-007` is approved as `ready` before implementation and transitions through `in-progress` to `implemented` with stable evidence.
- [ ] `elo setup` installs an idempotent managed launcher in the selected user-owned binary directory.
- [ ] Setup never uses `sudo`, edits shell profiles or overwrites an unmanaged `elo` command implicitly.
- [ ] Local `pnpm install` invokes direct-command setup through `postinstall`; CI can skip it safely.
- [ ] The root exposes an explicit `postclone` script and documentation states that npm/pnpm have no automatic post-clone lifecycle.
- [ ] After setup, `elo <command>` works without a `pnpm` prefix.
- [ ] Elo with no arguments shows help without mutating the repository or installing dependencies.
- [ ] Unknown commands and invalid subcommands return exit status 2.
- [ ] Elo exposes `--version` and `check all` without taking ownership of Turborepo task graphs.
- [ ] All five executable `.audit/*.script.mjs` checkers are replaced by executable POSIX `.audit/*.script.sh` checkers.
- [ ] Existing audit contracts for platform, architecture, imports, memory and specs remain green.
- [ ] Framework configuration modules ending in `.mjs` remain unchanged.
- [ ] CI, audit hygiene, CLI help and durable source-organization documentation use the shell checker names and direct Elo contract.
- [ ] Existing repository validation completes successfully on the pull-request head.

## Failure Behavior

- Missing write permission or an unavailable destination fails manual setup with an actionable error.
- An existing unmanaged `elo` file is never replaced without an explicit future migration decision.
- Lifecycle setup treats CI, a disabled install flag, a missing home directory or an unmanaged collision as a non-fatal skip with a warning.
- An installed launcher whose checkout no longer exists exits with guidance to rerun `./cli/elo setup` from a valid checkout.
- Any failed audit causes `check all` to return non-zero immediately.
- Any shell syntax failure, remaining executable `.script.mjs`, lifecycle-contract drift or task-runner ownership violation fails the platform audit and CI.
- The branch can be abandoned without changing application runtime behavior; the change is confined to repository platform automation and documentation.

## Out of Scope

- Renaming framework-owned `postcss.config.mjs` files.
- Publishing Elo to the npm registry or installing a global npm package.
- Editing `.bashrc`, `.zshrc`, fish configuration or any other shell profile.
- Adding `sudo`-based installation.
- Adding build, dev, lint, format, typecheck, test or eval task graphs to Elo.
- Changing application, AI, Memory Nucleus, database or Docker runtime behavior.
- Promising macOS or Windows support without an explicit CI matrix.
- Adding destructive reset commands or deleting persistent data.

## Evidence and Promotion

Evidence will be recorded from implementation commits, derived GitHub issues, the pull request, direct launcher contract checks and the full CI run.

Durable conclusions will be promoted to:

- `cli/readme.md` for developer-facing command and installation behavior;
- `.agents/rules/source-organization.md` for executable audit-script ownership and naming;
- `.agents/adrs/0019-posix-elo-control-plane.md` for the installation and shell-control-plane tradeoff;
- `package.json` for lifecycle entrypoints;
- `.github/workflows/ci.yml` for reproducible validation.

## Further Notes

The owner approved this bounded change in the engineering request on 2026-09-03. The attached technical research supports a thin shell control plane and preserving pnpm/Turborepo as the workspace engine. This spec narrows direct installation to a small user-scoped launcher rather than a globally published CLI package.

There is no standard `postclone` lifecycle in npm or pnpm. The first `pnpm install` after cloning is therefore the automatic setup event through `postinstall`; `pnpm postclone` remains an explicit, named recovery/setup entrypoint.
