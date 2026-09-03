---
id: SPEC-013
title: Flatten and priority-order the specification catalog
type: governance
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - .agents/specs
  - .agents/rules/spec-driven-development.rule.md
  - .audit/specs.audit.sh
  - AGENTS.md
context:
  - .agents/specs/readme.md
  - .agents/specs/workflow.md
rules:
  - .agents/rules/context-engineering.rule.md
  - .agents/rules/markdown.rule.md
  - .agents/rules/spec-driven-development.rule.md
adrs:
  - .agents/adrs/0018-spec-driven-delivery.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement-spec/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - .agents/specs/readme.md priority registry
  - .audit/specs.audit.sh flat-catalog enforcement
  - GitHub Actions CI on the final pull-request head
---

# SPEC-013: Flatten and priority-order the specification catalog

## Problem Statement

The specification catalog mixes area folders, a retrospective `history/` folder, behavior documents with semantic IDs and delivery documents whose filenames begin with `spec-NNN-`. This makes discovery depend on knowing the old taxonomy and lets chronological allocation obscure the actual implementation priority. It also leaves active product work separated from the canonical Memory Nucleus validation sequence.

The owner requires the catalog to follow the same navigational shape as ADRs: one flat directory, a three-digit numeric filename prefix, lowercase kebab-case slugs and no spec subdirectories. The numeric prefix must communicate current priority rather than immutable creation history.

## Solution

Migrate every specification document into the root of `.agents/specs/`. Support documents `readme.md`, `template.md` and `workflow.md` remain unnumbered, as they do in the ADR catalog; every behavior or delivery spec uses `NNN-lowercase-slug.md`.

Treat the filename prefix as mutable catalog priority. Keep the frontmatter `id` as the durable delivery identity where one already exists, so PR, evidence and ADR references do not become ambiguous when priorities change. Behavior specs retain their semantic contract identity when present. Update every repository reference, workflow rule and mechanical checker atomically.

Preserve the currently declared executable dependencies in this structural migration and reserve the final semantic reprioritization for the post-governance audit. That audit will rewrite the active contracts into the canonical sequence: serving baseline, asynchronous curation, shadow/parity, controlled A/B and canary, then scale.

## User Stories

1. As an engineer, I want every spec visible in one directory, so that I can discover the full catalog without traversing area and history folders.
2. As a product owner, I want the numeric filename prefix to show current priority, so that the next executable work is obvious.
3. As an implementer, I want durable spec IDs to survive priority moves, so that branches, PRs and evidence remain traceable.
4. As a CI maintainer, I want the flat layout mechanically enforced, so that nested specs and malformed priority prefixes cannot return.
5. As a reviewer, I want references migrated atomically, so that no active instruction points to a deleted path.

## Scope

This change owns:

- flattening all files below `.agents/specs/` into that directory;
- assigning one unique three-digit priority prefix to every spec filename;
- removing all spec subdirectories, including `history/`;
- preserving `readme.md`, `template.md` and `workflow.md` as unnumbered support documents;
- defining filename priority separately from durable spec identity;
- ordering the current catalog by declared dependencies while documenting the canonical post-governance target sequence;
- updating paths in specs, rules, context, ADRs, skills, checks and root instructions;
- changing the spec checker to enforce the new catalog;
- updating workflow language that currently treats filenames and implemented delivery documents as immutable chronology;
- keeping the repository valid throughout the migration.

## Implementation Decisions

- A spec filename is exactly `NNN-lowercase-kebab-case.md`.
- `NNN` is a unique priority rank; `001` through `099` are delivery priorities and `101` through `199` are behavior-contract priorities. Lower delivery numbers execute earlier, and reserved gaps must be named in `readme.md`.
- Priority prefixes may change in one explicit catalog-reordering change.
- Delivery `id` values remain durable identifiers and are not required to equal the mutable filename priority.
- Behavior specs may keep an existing semantic `id`; unnumbered behavior documents receive explicit metadata only where needed for unambiguous indexing.
- `readme.md`, `template.md` and `workflow.md` are the only unnumbered Markdown files allowed directly under `.agents/specs/`.
- No directory is allowed below `.agents/specs/`.
- Implemented and retrospective documents remain readable but no dedicated history directory or history-only naming rule remains.
- The first migration preserves declared product blockers; the later semantic audit may reorder priorities only after rewriting those contracts to the PDF validation sequence.
- All path references are rewritten in the same commit as each move.
- The checker validates unique priority ranks, flatness, allowed support files, delivery metadata and reference integrity without assuming priority equals spec ID.

## Testing Decisions

### Primary seam

The primary seam is the repository command `./cli/elo check all`, with `.audit/specs.audit.sh` proving the flat catalog contract and the Markdown/context checks proving references remain valid.

### Secondary seams

- direct listing of `.agents/specs/` to prove there are no child directories;
- duplicate/malformed priority fixtures exercised inside the checker where practical;
- repository-wide search for deleted spec paths and the legacy `spec-NNN-` filename pattern;
- manual review of the priority index against the canonical PDF validation sequence.

### Fixtures and privacy

The change uses repository metadata only and processes no user data. Any checker fixture is synthetic and temporary.

### Required validation

- `./cli/elo doctor --ci`;
- `./cli/elo check all`;
- full repository lint, typecheck, tests, evals and build through CI;
- repository-wide stale-reference scan;
- independent Standards and Spec-fidelity reviews on the final head.

## Acceptance Criteria

- [x] All spec documents are direct children of `.agents/specs/`.
- [x] Every spec document filename matches `NNN-lowercase-kebab-case.md`.
- [x] `readme.md`, `template.md` and `workflow.md` remain the only unnumbered support documents.
- [x] Numeric priority prefixes are unique, and the reserved delivery gap is documented.
- [x] Active priorities preserve their currently declared blockers and reserve the canonical semantic reordering for the post-governance audit.
- [x] Durable delivery IDs and evidence links remain traceable after moves.
- [x] No repository reference points to a removed spec path or legacy filename.
- [x] The spec workflow and always-applied rule define mutable filename priority and a flat catalog.
- [x] The structural checker rejects nested specs, malformed prefixes and duplicate priorities.
- [x] Full CI and both independent review axes pass.

## Failure Behavior

The migration fails closed if two files map to the same target, a priority rank is duplicated or malformed, a spec remains nested, a stale reference remains, or a delivery spec loses required metadata. No old path is deleted unless its replacement is present in the same tree. If priority order cannot be justified by dependency or the canonical product objective, the affected document remains explicitly indexed for owner review instead of being silently discarded.

## Out of Scope

- Implementing product behavior described by ready specs.
- Rewriting the substantive acceptance contract of an existing product spec.
- Renumbering ADRs.
- Replacing GitHub Issues as the ticket tracker.
- Designing the pull request template; that is a separate spec executed after this migration.
- Preserving a separate chronological spec-history hierarchy.

## Evidence and Promotion

Planned evidence includes the final flat tree, the priority index, zero stale-path search results, the spec checker result, full CI and independent reviews. Durable catalog rules are promoted to `workflow.md`, the always-applied spec rule and `.audit/specs.audit.sh`; the migration spec records the final mapping.

## Further Notes

The attached Amarelo Memory Nucleus document is the product-order authority for this migration. Its validation sequence is baseline, core memory, background processing, shadow validation, controlled A/B and canary, then scale. Repository reality shows much of the core domain already exists, so the catalog should expose the missing baseline and integration proof before production-scale claims.
