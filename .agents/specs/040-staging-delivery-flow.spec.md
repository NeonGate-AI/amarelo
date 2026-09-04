---
id: SPEC-040
title: Staging-first repository delivery flow
type: governance
status: ready
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - repository branch settings
  - .github/workflows
  - .agents/specs
context:
  - .agents/context/engineering/workflow-skills.md
rules:
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - none
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
  - .agents/skills/writing-for-agents/SKILL.md
evidence:
  - pending
---

# SPEC-040: Staging-first repository delivery flow

## Problem Statement

The repository currently uses `main` as its default integration target, has no permanent `staging` branch, and configures CI pull-request validation for a non-existent `develop` branch. This lets ordinary feature delivery target the production branch directly and leaves the intended integration and promotion boundary implicit.

Maintainers need one stable integration branch for numbered-spec and feature work while retaining `main` as the production-ready branch. The boundary must be visible in repository policy, mechanically checked where GitHub Actions can enforce it, and completed with GitHub branch settings that reject direct writes.

## Solution

Adopt `staging` as the permanent default and integration branch. New delivery branches start from `staging` and merge back into `staging` by pull request. `main` receives changes only through promotion pull requests whose source branch is `staging`.

CI validates both integration and production-promotion pull requests. A dedicated fail-closed GitHub Actions guard rejects any pull request into `main` whose source branch is not exactly `staging`. Repository administrators configure `staging` as the default branch and protect both permanent branches without using GitHub's literal read-only `Lock branch` option.

## User Stories

1. As a contributor, I want new feature branches and pull requests to default to `staging`, so that ordinary integration cannot accidentally target production.
2. As a maintainer, I want pull requests into `main` to accept only `staging` as their source, so that production promotion follows one auditable path.
3. As a maintainer, I want direct pushes, force pushes, and deletions rejected on both permanent branches, so that the pull-request and CI gates cannot be bypassed accidentally.

## Scope

This spec owns:

- creation of the permanent `staging` branch from the current `main` head;
- CI event filters for `staging` and `main`;
- retirement of the unused `develop` CI target;
- the automated source-branch guard for pull requests into `main`;
- canonical delivery-workflow language for integration and production promotion;
- the GitHub default-branch and branch-protection settings required to complete the flow.

It does not change application behavior, deployment environments, release versioning, or product data flows.

## Implementation Decisions

- `staging` is the repository's default and integration branch.
- `main` is the production-ready branch and accepts only `staging -> main` promotion pull requests.
- Numbered-spec, feature, fix, migration, refactor, governance, documentation, chore, and test branches start from `staging` unless a later spec defines an explicit exception.
- Both permanent branches require pull requests; direct pushes, force pushes, and deletion are prohibited through GitHub branch settings.
- GitHub's literal `Lock branch` option is not used because it would also prevent normal promotion merges.
- The `Main accepts only staging` Action fails closed for every pull request into `main` whose `github.head_ref` is not exactly `staging`.
- Existing CI validation remains one `Validate` job and runs for pull requests targeting either permanent branch.
- The absent `develop` branch is removed from CI filters rather than retained as a second integration path.
- The first bootstrap promotion may occur before the source guard exists on `main`; after that promotion, the guard is the mechanical source restriction.
- Branch rules and the default branch are repository settings, not versioned files. Their final application is recorded as manual acceptance evidence.

## Testing Decisions

### Primary seam

The primary seam is GitHub pull-request execution:

- a pull request from an ordinary branch into `staging` runs `Validate`;
- a pull request from an ordinary branch into `main` fails `Main accepts only staging`;
- a pull request from `staging` into `main` passes the source guard and remains subject to the full CI gate.

### Secondary seams

- Static review of `.github/workflows/*.yml` verifies the declared push and pull-request targets.
- GitHub repository metadata verifies the default branch and protected state of `staging` and `main`.
- Canonical workflow documents verify that future agents use `staging` as the implementation base and `main` only for promotion.

### Fixtures and privacy

No product, user, conversation, memory, or sensitive data is used. Verification uses synthetic branch names and repository metadata only.

### Required validation

- `./cli/elo doctor --ci`
- `./cli/elo check all`
- full GitHub Actions `Validate` job on the exact PR head
- successful `Main accepts only staging` run for `staging -> main`
- failed manual probe from a non-`staging` branch into `main`, closed without merge
- repository settings inspection confirming `staging` is default and both permanent branches are protected

## Acceptance Criteria

- [ ] `staging` exists and was created from the current `main` head without rewriting either branch.
- [ ] CI validates pushes and pull requests for `staging` and `main`, and no longer names the absent `develop` branch.
- [ ] Pull requests into `main` fail unless their source branch is exactly `staging`.
- [ ] Canonical delivery documentation directs ordinary implementation PRs to `staging` and reserves `main` for promotion.
- [ ] `staging` is configured as the GitHub default branch.
- [ ] `staging` and `main` reject direct pushes, force pushes, and deletion while allowing gated pull-request merges.
- [ ] Required repository validation passes on the exact reviewed head.
- [ ] Durable conclusions are recorded in this spec and `.agents/specs/workflow.md` without duplicating temporary evidence.

## Failure Behavior

- A pull request into `main` from any source other than `staging` fails closed with an explicit GitHub Actions error.
- A failing CI or required source-guard check blocks merge when branch protection is active.
- If the default-branch or protection settings cannot be applied, this spec remains `in-progress`; the repository must not claim that `main` is locked or that the staging-first flow is fully enforced.
- Rollback restores the previous workflow files and default branch, then removes `staging` only after confirming no unique commits or open pull requests depend on it.

## Out of Scope

- Mapping `staging` or `main` to Vercel or any other deployment environment.
- Automated release scheduling, semantic versioning, release notes, or deployment approvals.
- Changing merge methods, enabling auto-merge, or requiring a specific number of human approvals.
- Retargeting or rewriting already merged historical pull requests.
- Upgrading the GitHub organization plan solely to obtain rulesets.

## Evidence and Promotion

Planned stable evidence:

- the `staging` branch reference and its bootstrap commit;
- the pull-request diff for CI filters, the source guard, and canonical workflow language;
- GitHub Actions runs from the integration and promotion seams;
- repository metadata or reviewed settings confirming the final default branch and branch protections.

The durable branch model is promoted to `.agents/specs/workflow.md`. Temporary probes and logs remain outside the repository and are removed after review.

## Further Notes

The source guard supplements branch protection; it does not replace it. Until the first `staging -> main` promotion installs the workflow on `main`, maintainers must manually ensure that the bootstrap PR originates from `staging`.
