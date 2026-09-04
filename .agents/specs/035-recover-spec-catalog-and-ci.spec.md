---
id: SPEC-035
title: Recover the specification catalog and CI
type: fix
status: implemented
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - .agents/specs
  - .audit/specs.audit.sh
context:
  - .agents/context/architecture/overview.md
  - .agents/context/engineering/workflow-skills.md
  - .agents/specs/readme.md
  - .agents/specs/workflow.md
rules:
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0018-spec-driven-delivery.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
  - .agents/skills/writing-for-agents/SKILL.md
evidence:
  - .agents/specs/readme.md canonical SPEC-032 through SPEC-035 mapping
  - .audit/specs.audit.sh catalog-link cardinality and computed next-ID gates
  - https://github.com/NeonGate-AI/amarelo/pull/63 exact-head CI and two-axis review record
---

# SPEC-035: Recover the specification catalog and CI

## Problem Statement

The merged specification catalog assigns priority `032` and durable ID `SPEC-032` to both the implemented Realtime 2 WebRTC contract and the new draft application-guardrails contract. The catalog also contains conflicting declarations for the next unallocated durable ID. The repository checker correctly rejects the collision, so the `main` CI stops before lint, typecheck, tests, evals and build.

Engineering agents, maintainers and CI need one unambiguous flat catalog whose durable identities preserve authorship order and whose next-ID declaration cannot silently become stale or duplicated during a merge.

## Solution

Preserve the previously implemented Realtime 2 WebRTC contract as priority `032`, durable `SPEC-032`. Reassign the later draft application guardrails contract to priority `033`, durable `SPEC-033`, and the dependent lifecycle-hooks contract to priority `034`, durable `SPEC-034`. Keep this recovery contract at priority `035`, durable `SPEC-035`, then publish one canonical next-ID declaration for `SPEC-036`.

Update every affected repository reference in the same final tree. Extend the specification audit so the catalog must contain exactly one canonical next-ID declaration and that declaration must equal the next numeric durable identity computed from the numbered specs.

## User Stories

1. As an implementer, I can resolve every priority and durable ID to exactly one contract, so that branches, issues and evidence remain traceable.
2. As a reviewer, I can distinguish the implemented Realtime contract from the draft guardrails and lifecycle contracts without relying on merge history.
3. As a CI maintainer, I receive a deterministic failure when the next-ID declaration is missing, duplicated or stale.
4. As a product owner, I regain a fully validated `main` before the operational Memory Nucleus sequence resumes.

## Scope

This fix owns the colliding specification filenames, frontmatter IDs, H1 identities, internal spec references, the catalog rows and next-ID declaration, and the narrow specification-audit invariant for the next durable ID.

It also owns the delivery evidence needed to restore the complete repository CI on the exact reviewed head.

## Implementation Decisions

- The first-authored and already implemented Realtime contract retains `SPEC-032` and priority `032`.
- The later draft guardrails and lifecycle contracts receive `SPEC-033` and `SPEC-034` respectively, preserving their dependency order.
- This fix uses `SPEC-035`; the next unallocated durable ID after recovery is `SPEC-036`.
- Renames and all repository references land in one tree so no compatibility copies or parallel sources of truth exist.
- The audit derives the expected next ID from spec frontmatter and accepts exactly one canonical declaration in `.agents/specs/readme.md`.
- No product behavior, runtime contract, ADR decision or Memory Nucleus gate changes in this fix.

## Testing Decisions

### Primary seam

The primary seam is `./cli/elo check all`, with `.audit/specs.audit.sh` observing the flat catalog, unique priorities, unique durable IDs, canonical links and the single computed next-ID declaration.

### Secondary seams

- Repository-wide reference scan for the retired guardrails and lifecycle paths and identities.
- GitHub Actions full CI to prove checks after the specification audit execute and pass.
- Fixed-base three-dot diff review to prove the change contains only the approved harness recovery.

### Fixtures and privacy

The fix uses repository metadata and synthetic shell state only. It reads, writes and exposes no product-user or personal-memory data.

### Required validation

- `./cli/elo doctor --ci`;
- `./cli/elo check all`;
- full CI including lint, typecheck, tests, PostgreSQL validation, AI evals and build;
- exact-head Standards and Spec-fidelity reviews.

## Acceptance Criteria

- [x] Realtime 2 WebRTC uniquely retains priority `032` and durable ID `SPEC-032`.
- [x] Application guardrails uniquely use priority `033` and durable ID `SPEC-033`.
- [x] Conversation lifecycle hooks uniquely use priority `034` and durable ID `SPEC-034`.
- [x] The catalog contains one row per numbered spec and exactly one next-ID declaration for `SPEC-036`.
- [x] Every affected repository reference resolves to its canonical semantic filename and durable identity.
- [x] The specification audit rejects a missing, duplicate or stale next-ID declaration.
- [x] The complete repository CI passes on the exact final head.
- [x] Both independent review axes pass with zero unresolved blocking findings on that head.
- [x] Durable conclusions are recorded in the catalog, recovery spec and mechanical checker.

## Failure Behavior

The audit fails closed when a priority or durable ID is duplicated, a catalog link is missing, an affected retired path remains, or the canonical next-ID declaration is absent, duplicated or differs from the computed value. A failed or pending CI job, changed review head, merge conflict or unresolved blocking finding prevents merge.

If another commit reaches `main` before merge, the branch must be refreshed and the full exact-head validation and review repeated.

## Out of Scope

- Implementing guardrails, lifecycle hooks or Realtime behavior.
- Changing the substantive contracts or acceptance criteria of the three affected product specs.
- Implementing SPEC-016 or any later Memory Nucleus phase.
- Redesigning the spec workflow, ADR numbering, CI topology or branch-protection policy.
- Adding compatibility files for retired spec paths.

## Evidence and Promotion

The canonical catalog preserves Realtime as `SPEC-032`, assigns guardrails and lifecycle to `SPEC-033` and `SPEC-034`, records this recovery as `SPEC-035`, and publishes `SPEC-036` as the next ID. The hardened `.audit/specs.audit.sh` enforces one catalog link per spec plus one exact computed next-ID declaration. PR #63 records the exact rename/reference diff, final-head GitHub Actions CI and independent Standards and Spec-fidelity reviews. No transient audit output is committed.

## Further Notes

This is the minimal recovery required before the executable Memory Nucleus chain resumes at SPEC-016.
