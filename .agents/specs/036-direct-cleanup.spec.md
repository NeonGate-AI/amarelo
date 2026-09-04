---
id: SPEC-036
title: Make cleanup execute without an apply flag
type: fix
status: in-progress
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
rules:
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0018-spec-driven-delivery.adr.md
  - .agents/adrs/0022-posix-elo-control-plane.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-036: Make cleanup execute without an apply flag

## Problem Statement

`elo cleanup` currently performs only a dry run and requires `--apply` before it removes generated outputs. This makes the command name misleading and adds a second invocation to the routine cleanup path. The owner has explicitly selected direct cleanup semantics.

The command already limits removal to known generated names, protects `.git`, `.audit`, tracked paths and dependency directories unless requested. Those safety boundaries should remain while the obsolete apply gate disappears.

## Solution

Make `elo cleanup` remove eligible generated outputs immediately. Preserve `--dependencies` as the explicit opt-in for dependency-directory removal and reject `--apply` as an unknown option.

Keep the existing path allowlist and tracked-path protection. Report each removed or protected path and return non-zero when deletion itself fails.

## User Stories

1. As a developer, I want `elo cleanup` to clean generated outputs in one invocation, so that routine repository cleanup is direct.
2. As a developer, I want tracked paths and harness evidence protected, so that direct execution cannot remove canonical repository content.
3. As a developer, I want dependency deletion to remain explicit, so that ordinary cleanup does not force a reinstall.
4. As a CLI user, I want the retired `--apply` option rejected, so that scripts cannot silently depend on obsolete semantics.

## Scope

This change owns the public `elo cleanup` contract, its help and CLI documentation, and executable platform-audit coverage for direct removal, protected paths, dependency opt-in and invalid options.

## Implementation Decisions

- `elo cleanup` is an applying command with no preview phase.
- `--dependencies` includes untracked `node_modules`; without it, dependency directories remain untouched.
- The known generated-target allowlist remains `.next`, `.turbo`, `dist`, `coverage`, `build`, `out`, `.cache`, `storybook-static`, `.mastra` and `*.tsbuildinfo`.
- `.git`, `.audit` and tracked paths remain protected.
- `--apply` is removed rather than retained as a compatibility no-op.
- The command remains non-interactive POSIX shell and never broadens its removal root beyond the resolved Amarelo checkout.

## Testing Decisions

### Primary seam

Exercise `./cli/elo cleanup` against an isolated synthetic checkout fixture and observe filesystem state plus exit status.

### Secondary seams

Exercise `--dependencies`, `--help`, `--apply`, tracked-path protection, POSIX syntax validation and the complete Elo audit suite.

### Fixtures and privacy

Fixtures contain only generated placeholder files in an exclusive temporary directory. They contain no product, account, conversation or Memory data.

### Required validation

Run the focused platform audit, `./cli/elo check all`, Commitlint, Biome, typecheck, tests, Memory PostgreSQL validation, AI evals, build and Git-hook smoke tests on the exact reviewed head.

## Acceptance Criteria

- [ ] `elo cleanup` removes eligible untracked generated outputs without another flag.
- [ ] Ordinary cleanup preserves every `node_modules` directory.
- [ ] `elo cleanup --dependencies` also removes eligible untracked dependency directories.
- [ ] Tracked paths, `.git` and `.audit` remain protected.
- [ ] `--apply` and every other unknown cleanup option exit with usage status 2.
- [ ] Help and CLI documentation expose no `--apply` cleanup contract.
- [ ] The public cleanup behavior has deterministic synthetic audit coverage.
- [ ] Complete exact-head CI and both independent review axes pass.
- [ ] Durable behavior is promoted to current CLI documentation and the spec closes as `implemented`.

## Failure Behavior

An unknown option exits 2 without removing anything. A removal error returns non-zero through fail-closed shell execution. Paths outside the generated allowlist, tracked paths, `.git`, `.audit` and dependency directories without `--dependencies` remain unchanged. A red audit, CI failure, moved head or unresolved review finding blocks merge.

## Out of Scope

- Adding a replacement dry-run flag or interactive confirmation.
- Removing persistent runtime data, environment files or Kubernetes resources.
- Changing the target-name allowlist.
- Changing bootstrap, doctor, environment, Git or invariant-check commands.
- Product, Memory Nucleus, database or deployment behavior.

## Evidence and Promotion

Planned evidence is the isolated public-CLI audit, exact branch diff, exact-head GitHub Actions run and two-axis review. At completion, stable references will replace `pending`, and current cleanup behavior will be reflected in `cli/readme.md` and help output.

## Further Notes

The owner approved direct cleanup semantics and execution of this spec on 2026-09-04.
