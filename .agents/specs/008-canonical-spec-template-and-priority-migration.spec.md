---
id: SPEC-026
title: Modernize and priority-order the canonical specification catalog
type: governance
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - .agents/specs
  - .audit/specs.audit.sh
  - repository spec references
context:
  - .agents/context/architecture/overview.md
rules:
  - .agents/rules/markdown.rule.md
  - .agents/rules/spec-driven-development.rule.md
adrs:
  - .agents/adrs/0018-spec-driven-delivery.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - .agents/specs/readme.md canonical priority registry
  - .agents/specs/001-memory-nucleus-product-contract.spec.md through 007-plans-and-entitlements.spec.md
  - .agents/specs/workflow.md and .agents/rules/spec-driven-development.rule.md unified numbered-spec model
  - pull request 20 final diff and GitHub Actions CI on the final reviewed head
---

# SPEC-026: Modernize and priority-order the canonical specification catalog

## Problem Statement

Seven canonical product contracts remained at priorities 101–107 in older document formats while newer delivery specs occupied the first priorities. This split made the most important product targets less visible, allowed inconsistent metadata and required contributors to reason about two incompatible spec shapes.

## Solution

Convert the seven legacy product contracts to the canonical spec template, assign durable IDs `SPEC-019` through `SPEC-025`, and place them at priorities 001–007. Reserve priorities 009 and 010 for the already owner-approved Conversation topology and Elo CLI experience changes, then move the existing modern-format delivery specs to priorities 011–024 without changing their durable IDs or historical acceptance records.

## User Stories

1. As a product owner, I want the Memory Nucleus and product contracts first in the catalog, so that engineering starts from the canonical product target.
2. As an implementer, I want every numbered spec to use one template and metadata model, so that status, evidence and review can be checked mechanically.
3. As a maintainer, I want filename priority changes to preserve durable IDs and references, so that PR and evidence history remain traceable.

## Scope

- Reformat legacy priorities 101–107 into the current frontmatter/body template.
- Assign durable IDs `SPEC-019`–`SPEC-025` while recording legacy aliases in the migrated documents.
- Move those contracts to priorities 001–007.
- Add this governance record at priority 008.
- Reserve priorities 009 and 010 for `SPEC-027` and `SPEC-028`.
- Shift the existing priorities 001–014 to 011–024 without changing their durable IDs.
- Update the catalog, workflow language, spec rule and repository references atomically.
- Preserve the absence and ignore policy of `pnpm-lock.yaml`.

## Implementation Decisions

- Filename numbers remain mutable priority; `SPEC-###` remains the durable identity.
- Migrated product contracts retain their terminology, product boundaries and level of detail.
- Retrospective contracts use `mode: retrospective`, checked acceptance criteria and evidence tied to current code; the still-unapproved plans contract remains `draft` and prospective.
- Existing delivery records are renamed only. Their content and historical status are not rewritten except for necessary path-reference repair.
- Priorities 009 and 010 are explicitly reserved to avoid renumbering the entire catalog again during the two immediately following migrations.
- No runtime, product feature, plan entitlement or pricing decision is introduced here.

## Testing Decisions

### Primary seam

`./cli/elo check specs` and `.agents/specs/readme.md` together verify that every catalog entry resolves, every numbered spec follows the canonical shape and every priority/ID is unique.

### Secondary seams

Repository-wide stale-reference scans, Markdown link checks and the full CI workflow detect renamed paths that the primary checker cannot localize.

### Fixtures and privacy

This governance migration processes repository documentation only. No conversation, account, memory or other personal data is introduced.

### Required validation

Run `./cli/elo doctor --ci`, `./cli/elo check all`, Markdown/reference checks, full repository lint/typecheck/tests/evals/build and two independent review axes on the final head.

## Acceptance Criteria

- [x] The seven legacy product contracts use canonical frontmatter and all required template sections.
- [x] Migrated contracts occupy priorities 001–007 with durable IDs `SPEC-019`–`SPEC-025`.
- [x] Existing modern-format specs occupy priorities 011–024 with unchanged durable IDs and historical content.
- [x] Priorities 009 and 010 are named reservations for the approved next migrations.
- [x] The catalog, workflow, rule and repository references agree with the new paths.
- [x] No spec remains in priorities 101–107 or in the retired legacy shape.
- [x] `pnpm-lock.yaml` remains absent and ignored.
- [x] Full CI and both independent review axes pass on the exact final head.

## Failure Behavior

Any duplicate priority or durable ID, broken catalog link, stale repository reference, malformed frontmatter or changed historical acceptance record blocks merge. Missing or ambiguous legacy content remains explicit rather than being invented. A generated `pnpm-lock.yaml` is a hard failure and must be removed before validation resumes.

## Out of Scope

Moving Conversation code, changing runtime package identity, restyling the Elo CLI, correcting the Memory validation roadmap, implementing product specs, approving plans/prices or changing production behavior are separate changes.

## Evidence and Promotion

The final flat catalog, canonical product contracts, unified workflow/rule, full CI and Standards/Spec-fidelity reviews form the stable evidence. The single numbered-spec catalog model is promoted to `readme.md`, `workflow.md` and the always-applied rule.

## Further Notes

Legacy alias mapping:

- `101-memory-nucleus.md` → `SPEC-019` / priority 001.
- `102-routing.md` → `SPEC-020` / priority 002.
- `103-mobile-voice-experience.md` → `SPEC-021` / priority 003.
- `104-account-and-elo-entry.md` → `SPEC-022` / priority 004.
- `105-memory-control.md` → `SPEC-023` / priority 005.
- `106-product-narrative.md` → `SPEC-024` / priority 006.
- `107-plans-and-entitlements.md` → `SPEC-025` / priority 007.
