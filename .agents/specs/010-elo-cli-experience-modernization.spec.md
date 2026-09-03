---
id: SPEC-028
title: Modernize the Elo CLI experience and restore reproducible installs
type: feature
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - cli
  - .audit/elo-platform-core.audit.sh
  - .github/workflows/ci.yml
  - workspaces/packages/runtime/compose.yaml
context:
  - .agents/context/engineering/workflow-skills.md
rules:
  - .agents/rules/architecture.rule.md
  - .agents/rules/code-style.rule.md
  - .agents/rules/source-organization.rule.md
  - .agents/rules/spec-driven-development.rule.md
adrs:
  - .agents/adrs/0022-posix-elo-control-plane.adr.md
  - .agents/adrs/0024-tracked-pnpm-lockfile.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - https://github.com/NeonGate-AI/amarelo/issues/24
  - https://github.com/NeonGate-AI/amarelo/issues/25
  - https://github.com/NeonGate-AI/amarelo/pull/26
  - .audit/elo-platform-core.audit.sh
  - .audit/workflow-skills.audit.sh
  - .agents/adrs/0024-tracked-pnpm-lockfile.adr.md
---

# SPEC-028: Modernize the Elo CLI experience and restore reproducible installs

## Problem Statement

Elo's command surface is functional but visually flat, its help does not establish a recognizable Amarelo identity, and operational commands have no shared verbose-log switch. The newly tracked `pnpm-lock.yaml` also conflicts with the older no-lockfile doctor and CI policy, so the current `main` branch fails before repository validation can begin.

## Solution

Give the existing POSIX shell CLI a compact presentation layer with a yellow ELO wordmark, semantic colors, and consistent emoji status markers. Preserve machine-safe output by disabling ANSI escapes when stdout is not interactive or `NO_COLOR` is set.

Add global `--help` and `--logs` option handling without turning Elo into a task runner. `--logs` may appear before or after the command and exports one shared verbose-mode contract to command modules. Reconcile bootstrap, doctor, CI, and the local runtime with the tracked pnpm lockfile by using frozen installs.

## User Stories

1. As a developer, I want a clear, branded command overview, so that Elo is approachable and commands are easy to scan.
2. As a developer diagnosing an operation, I want `--logs` in either common global position, so that I can opt into detailed execution output predictably.
3. As a CI owner, I want installation and doctor checks to agree with the tracked lockfile, so that a fresh exact-head validation is reproducible.

## Scope

- Shared terminal presentation primitives under `cli/src/core/`.
- Global parsing for `--help`, `--logs`, and existing version aliases.
- Help, doctor, bootstrap, and usage-error presentation.
- Public CLI documentation and platform audit coverage.
- Frozen pnpm installation in Elo bootstrap, CI, and Compose workspace preparation.
- Durable supersession of the former no-lockfile decision.

## Implementation Decisions

- Elo remains POSIX shell and the repository-local `cli/elo` stays a thin launcher.
- ANSI color is emitted only to an interactive stdout, unless an explicit test-only force-color environment value is set; `NO_COLOR` always wins.
- Emojis remain useful plain-text status markers even when color is disabled.
- `--logs` sets `ELO_LOGS=true`; command modules decide which additional operational detail is useful and must not print secrets.
- Tracked `pnpm-lock.yaml` is authoritative. Automated installs use `pnpm install --frozen-lockfile`.
- Historical specs remain historical evidence; current documentation and accepted decisions identify the superseding policy.

## Testing Decisions

### Primary seam

Exercise the public `cli/elo` launcher from the platform audit: no-argument help, `--help`, command-local help, `--logs` before and after a command, invalid options, redirected output, and forced-color output.

### Secondary seams

Run POSIX syntax validation for every CLI module, `elo doctor --ci`, the full Elo audit suite, and the complete repository CI workflow.

### Fixtures and privacy

Tests use isolated temporary directories and repository metadata. Verbose logging must not expose environment values, tokens, conversation content, or Memory data.

### Required validation

Run `./cli/elo doctor --ci`, `./cli/elo check all`, Commitlint, Biome, typecheck, tests, database validation, AI evals, build, and Git-hook smoke tests on the exact PR head.

## Acceptance Criteria

- [x] `elo`, `elo help`, and `elo --help` show the yellow ELO wordmark and a scannable emoji command catalog.
- [x] Redirected help contains the wordmark without ANSI escapes; `NO_COLOR` suppresses color.
- [x] `--logs` works before or after a command and exposes `ELO_LOGS=true` to the dispatched module.
- [x] Unknown commands and invalid options still exit with status 2 and include recovery guidance.
- [x] Doctor uses consistent semantic status output and requires the tracked `pnpm-lock.yaml`.
- [x] Bootstrap, CI, and Compose use frozen lockfile installation.
- [x] Elo remains POSIX shell and does not duplicate Turborepo task ownership.
- [x] Exact-head CI and both required reviews pass before merge.

## Failure Behavior

Invalid global options fail closed with status 2. Missing lockfiles or frozen-install drift fail doctor or dependency installation. Non-interactive output remains readable without terminal control sequences. A red exact-head check, unresolved review finding, merge conflict, or moved head blocks merge.

## Out of Scope

- New product or Memory Nucleus behavior.
- A general logging framework or persistent log files.
- Interactive prompts, command completion, or task-runner commands.
- Prompt-template creation and rule enumeration, which require separate bounded specs.

## Evidence and Promotion

The public CLI audit proves the branded help, color suppression, forced-color seam, global flags, dispatched verbose mode, and exit behavior. Pull request #26 records exact-head CI plus independent Standards and Spec-fidelity reviews before merge. The tracked-lockfile decision is promoted to ADR-0024, doctor, automated installation paths, executable harness checks, and current CLI/runtime documentation.

## Further Notes

The visual direction is adapted from the supplied CLI reference while retaining Elo's existing commands, ownership boundaries, and Amarelo vocabulary.
