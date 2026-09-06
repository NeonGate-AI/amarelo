---
id: SPEC-054
title: Restore shell automation entrypoints for the Memory MVP
type: fix
status: ready
mode: prospective
created: 2026-09-06
updated: 2026-09-06
owners:
  - Jonatas Sales
targets:
  - workspaces/memory-nucleus
  - workspaces/packages/runtime
  - .audit/elo-platform-core.audit.sh
context:
  - .agents/context/workspaces/memory-nucleus/local-voice-mvp.md
rules:
  - .agents/rules/002-code-style.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - none
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - https://github.com/NeonGate-AI/amarelo/actions/runs/34008785244/job/101420762221
  - https://github.com/NeonGate-AI/amarelo/pull/97
---

# SPEC-054: Restore shell automation entrypoints for the Memory MVP

## Problem Statement

PR #97 fails the Elo platform audit because Memory worker/report commands execute
compiled MJS automation and the three previously delivered MVP aliases are absent
from the audit's bounded root command inventory. The owner explicitly requires
POSIX shell entrypoints and asks for the promotion PR to be repaired.

## Solution

Expose the existing Memory worker and economics report through owning `.sh`
entrypoints that delegate to their TypeScript backends. Route the local MVP
worker through the same boundary. Verify the exact existing MVP aliases without
permitting arbitrary root commands or executable MJS automation.

## User Stories

1. As the developer, I can launch the worker and report through supported package
   commands that follow the shell automation contract.
2. As the release owner, I can distinguish this repaired audit from any remaining
   CI failures before deciding whether to merge staging into main.

## Scope

Memory worker/report launchers, local MVP worker dispatch, the precise command
audit, related command documentation, and this spec/catalog entry. Preserve the
existing public command names and arguments. PR #97 remains staging-to-main.

## Implementation Decisions

- Shell owns launch preparation; the existing TypeScript backends retain their
  application behavior. Use `exec` to preserve exit status and process signals.
- Resolve the owning workspace from the shell file, so invocation is independent
  of the caller's current directory and safely handles paths/arguments with spaces.
- The local MVP must launch the shell boundary instead of a generated MJS file.
- Keep the source MJS prohibition and the existing framework-configuration
  exception unchanged. Generated ESM library exports are not automation entrypoints.
- Admit only the exact `mvp:init`, `mvp:infra` and `dev:mvp` aliases already owned
  by SPEC-050; assert their complete delegation to the runtime shell boundary.
- The user authorizes updating the existing promotion PR. Develop from staging
  in `fix/spec-054-shell-automation`, then append the fix commits to staging
  without rewriting history. The owner retains the main merge.

## Testing Decisions

### Primary seam

`./cli/elo check platform`: the existing failure is the red baseline. Extend its
bounded command checks to reject wrong MVP delegates and missing shell launchers.

### Secondary seams

Execute both shell entrypoints from a different directory using a synthetic Node
process to verify workspace selection, argument preservation and nonzero exit
propagation. Exercise real report/worker startup failure paths without credentials,
and compile/typecheck the affected runtime boundary.

### Fixtures and privacy

Use temporary synthetic paths and empty configuration. No live OpenAI, Neo4j,
Redis, Kubernetes or customer data is required to repair the launch contract.

### Required validation

Shell syntax, focused command checks, the Elo audit suite and the complete PR CI.
Inspect Vercel and the main-source guard on the final head. Report any independent
failure truthfully; a passing platform audit alone is not permission to merge.

## Acceptance Criteria

- [ ] Worker and report package commands enter through owning POSIX shell files.
- [ ] Local MVP worker dispatch uses the same shell entrypoint.
- [ ] Shell invocation preserves workspace, arguments, exit status and signals.
- [ ] The audit accepts exactly the approved MVP delegates and still rejects MJS automation.
- [ ] Focused validation passes and durable command guidance matches the implementation.
- [ ] Final-head required CI, deployments and source reviews permit the owner's merge.

## Failure Behavior

Unavailable tools/backends and invalid input fail nonzero. No error is converted
to success, no secrets are printed, and worker opt-in remains explicit. Stop
before any provider or infrastructure call when configuration is absent. Failed
CI remains blocking; do not relax gates or falsify historical acceptance evidence.
Rollback restores the previous launch implementation through a normal revert.

## Out of Scope

New product capabilities, model selection, authentication changes, infrastructure
deployment, rewriting prior spec evidence, weakening audits, and merging main.

## Evidence and Promotion

The failing PR run above is the reproduced baseline. Record focused checks and
the final CI/review results in this spec and PR #97. The source-organization rule
already owns the shell policy; improve its executable enforcement and owning
command guidance without introducing a duplicate rule or ADR.

## Further Notes

The owner's current request approves this minimal prospective fix. Existing
application validation debt is separate from the shell entrypoint correction.
