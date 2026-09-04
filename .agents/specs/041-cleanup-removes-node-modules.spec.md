---
id: SPEC-041
title: Make cleanup remove node_modules directly
type: fix
status: implemented
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - Elo CLI
  - repository cleanup
  - engineering harness
context:
  - cli/readme.md
  - .agents/context/engineering/workflow-skills.md
rules:
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0022-posix-elo-control-plane.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - commit 92b9c42 (direct node_modules cleanup implementation)
  - .audit/elo-platform-core.audit.sh isolated cleanup fixture
  - ./cli/elo cleanup (715 node_modules directories removed in the supplied checkout)
  - ./cli/elo cleanup --dependencies (status 2 without mutation)
---

# SPEC-041: Make cleanup remove node_modules directly

## Problem Statement

`elo cleanup` removes generated output but preserves `node_modules` unless a separate `--dependencies` option is provided. The owner expects cleanup to remove dependency directories as part of its direct operation.

## Solution

Make `elo cleanup` remove eligible untracked `node_modules` directories in the same direct invocation as other generated state. Retire `--dependencies`; preserve the generated-name allowlist, `.git`, `.audit`, tracked-path protection, deterministic reporting, and usage-status failure before mutation.

## User Stories

1. As a developer, I want one cleanup command to remove generated outputs and installed dependencies, so that a clean reinstall starts from an actually clean checkout.
2. As a maintainer, I want tracked paths and harness evidence protected, so that direct cleanup retains its safety boundary.

## Scope

This spec owns the public cleanup syntax, direct dependency removal, help/documentation, and isolated cleanup audit coverage.

## Implementation Decisions

- `elo cleanup` has no options.
- Untracked `node_modules` directories are eligible direct cleanup targets.
- `--dependencies`, `--apply`, and every other option exit status 2 before mutation.
- `.git`, `.audit`, tracked paths, and paths outside the cleanup allowlist remain protected.

## Testing Decisions

### Primary seam

Exercise `./cli/elo cleanup` against an isolated synthetic Git checkout and observe output, exit status, generated directories, dependencies, and protected files.

### Secondary seams

Exercise `--help`, retired options, POSIX syntax, and the aggregate Elo audit.

### Fixtures and privacy

The fixture contains only synthetic generated/dependency placeholder files in a temporary directory.

### Required validation

Run the focused Elo platform audit and complete executable repository checks.

## Acceptance Criteria

- [x] Plain `elo cleanup` removes eligible untracked `node_modules` directories.
- [x] Plain cleanup retains tracked paths, `.git`, and `.audit`.
- [x] `--dependencies` and `--apply` both fail with usage status 2 before mutation.
- [x] Help and CLI docs describe direct dependency removal with no option.
- [x] The isolated audit verifies the current public behavior.

## Failure Behavior

Unknown syntax exits 2 before cleanup begins. A delete failure propagates a non-zero result. Protected/unsupported paths remain unchanged.

## Out of Scope

- A replacement preview/dry-run mode.
- Deleting Kubernetes resources, local environment files, Git metadata, or tracked dependencies.

## Evidence and Promotion

Commit `92b9c42` makes direct dependency cleanup the public default. The isolated platform fixture passes, and the supplied checkout removed 715 generated `node_modules` directories with a single plain invocation. CLI documentation and the active cleanup contract supersede only the current behavior of SPEC-036.

## Further Notes

This spec changes only the direct cleanup contract and intentionally does not include runtime-prune behavior.
