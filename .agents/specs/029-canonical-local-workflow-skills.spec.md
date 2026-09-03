---
id: SPEC-029
title: Canonicalize the local engineering workflow skill set
type: governance
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - .agents/skills/
  - .agents/skills/readme.md
  - .agents/specs/workflow.md
  - .agents/specs/template.md
  - .agents/context/engineering/workflow-skills.md
  - .agents/rules/011-spec-driven-development.rule.md
  - .audit/workflow-skills.audit.sh
  - cli/src/elo.sh
  - AGENTS.md
  - active numbered-spec skill references
context:
  - AGENTS.md
  - .agents/context/engineering/workflow-skills.md
  - .agents/skills/readme.md
  - .agents/specs/readme.md
  - .agents/specs/workflow.md
rules:
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - none
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
  - .agents/skills/domain-modeling/SKILL.md
  - .agents/skills/writing-for-agents/SKILL.md
evidence:
  - https://github.com/NeonGate-AI/amarelo/pull/22
  - commit a50757b5c1bba3455a6098a26d06c01028cf9b46 import provenance
  - commit 52ac9fcb07d8d428d56472de83f18feaa737618f provenance-based pruning and retained-skill adaptation
  - commit 0686c46042e9cda8889f4421f41da760905ec5d8 workflow, template, context, index and rule promotion
  - commit 7515dd700a22781d98657f28694f7a47e6337df2 active spec metadata reconciliation
  - commit 03b55ec49023208814372e84cb92cecb617658ae mechanical inventory and local-reference checker
  - commit 5e9d5615241158d9e4e56e2e9dcbbcd0b776c533 current-main reconciliation
  - CI run 33787375498 success on implementation head
  - merge commit 811427fb08b56880a4ece06e2acc18690c613210
  - CI run 33787881077 success on merged main
---

# SPEC-029: Canonicalize the local engineering workflow skill set

## Problem Statement

Amarelo imported a broad Matt Pocock engineering-skill catalog in commit `a50757b5c1bba3455a6098a26d06c01028cf9b46`, while the repository's canonical delivery workflow actually depends on seven procedures: `to-spec`, `to-tickets`, `implement`, `tdd`, `code-review`, `domain-modeling` and `writing-for-agents`.

Keeping the rest of that imported workflow catalog created unnecessary routing choices, stale setup assumptions and contradictory process guidance. Some active harness documents also pointed to remote GitHub copies even though reviewed local copies existed under `.agents/skills/`, allowing an external branch to become an accidental procedural source of truth.

## Solution

The local harness is now authoritative for engineering workflow procedures. Exactly seven Matt-Pocock-derived workflow skills remain:

1. `.agents/skills/to-spec/`
2. `.agents/skills/to-tickets/`
3. `.agents/skills/implement/`
4. `.agents/skills/tdd/`
5. `.agents/skills/code-review/`
6. `.agents/skills/domain-modeling/`
7. `.agents/skills/writing-for-agents/`

Every other top-level skill directory proven to belong to that import lineage was removed. Independently sourced Amarelo, Memory, LangChain/LangGraph, frontend, accessibility, quality and platform skills were preserved.

`.agents/specs/workflow.md` remains the lifecycle owner and links the seven local procedures. Active normative references use local `.agents/skills/.../SKILL.md` paths. Remote links remain permissible only as explicit attribution, provenance or immutable historical evidence.

## User Stories

1. As an engineering agent, I have one small canonical workflow-skill set and do not choose among flows Amarelo does not use.
2. As a maintainer, reviewed local skill files are authoritative and revision-stable.
3. As the workflow owner, I can see how the seven procedures compose with Amarelo's lifecycle without surrendering ownership to imported methodology.
4. As a project maintainer, unrelated project-native skills remain intact.

## Scope

- Used repository history, including commit `a50757b5c1bba3455a6098a26d06c01028cf9b46`, to identify the imported lineage.
- Retained the seven named workflow skills and removed thirty non-retained imported directories.
- Preserved the twenty-four independently sourced/project-native skills recorded by the inventory checker.
- Removed retained-skill dependencies on deleted routers, setup flows and tracker documents.
- Updated workflow, template, skills index, `AGENTS.md`, scoped engineering context, the spec-driven rule and active spec metadata.
- Added `.audit/workflow-skills.audit.sh` and wired it into `elo check all`.
- Preserved semantic suffixes and the repository no-lockfile policy.

## Implementation Decisions

- Provenance, not naming or conceptual overlap, determined deletion.
- The retained imported set is exactly the seven procedures named above.
- `.agents/specs/workflow.md` remains the single owner of the delivery lifecycle; skills are phase-level procedures.
- A locally vendored skill is referenced normatively through its repository-local path.
- Remote skill links are limited to attribution, provenance or immutable historical evidence.
- Retained skills are self-contained against the Amarelo harness and no longer depend on deleted router/setup procedures.
- No deleted workflow skill received a compatibility wrapper.
- Context documents and `SKILL.md` keep ordinary filenames; specs, rules, ADRs and audit checkers preserve their semantic suffixes.
- No product, AI runtime, Memory Nucleus or application behavior changed.

## Testing Decisions

### Primary seam

`./cli/elo check all` executes the workflow-skill audit together with the existing suffix, architecture, import and Memory checks.

### Secondary seams

- Provenance allowlist and denylist encoded in the checker.
- Active frontmatter and canonical workflow-document reference scans.
- Retained-skill dependency scan.
- Explicit preserved project-skill inventory.
- Human review of workflow, template, context, rules and skill procedures.

### Fixtures and privacy

Only repository paths and a synthetic frontmatter fixture are used. No personal, production, credential or health data is involved.

### Required validation

The implementation head and the merged `main` both passed the complete GitHub Actions workflow, including Elo doctor and audits, audit hygiene, Commitlint, lint, typecheck, tests, PostgreSQL Memory validation, AI evals, build and Git-hook smoke tests. The closure correction receives a fresh exact-head CI and two independent reviews before merge.

## Acceptance Criteria

- [x] The only Matt-Pocock-derived workflow skills remaining are the seven named by this spec.
- [x] Every other skill from that import lineage is absent.
- [x] Project-native and independently sourced skills are preserved.
- [x] Every retained workflow skill is usable without a deleted prerequisite.
- [x] `workflow.md` links the seven local procedures and remains lifecycle owner.
- [x] `template.md` uses a local skill-path example.
- [x] The skills index separates workflow procedures from project/domain skills and matches the tree.
- [x] `AGENTS.md`, context and active harness metadata use local normative skill references.
- [x] Mechanical checks reject missing retained skills, reintroduced imported directories, prohibited remote normative references and deleted-skill dependencies.
- [x] Semantic suffixes remain intact and `pnpm-lock.yaml` remains absent.
- [x] Full implementation and post-merge CI passed.
- [x] The closure PR requires exact-head CI and both independent review axes before merge.

## Failure Behavior

Ambiguous provenance fails closed by preserving the directory until ownership is established. A retained skill referencing a deleted prerequisite fails the workflow-skill audit. Remote links are classified instead of deleted blindly: attribution and historical evidence remain, while executable or normative pointers must be local. Any suffix regression, recreated lockfile, missing preserved skill, broken checker or stale branch blocks merge.

## Out of Scope

- Redesigning project-native, LangChain/LangGraph, Memory Nucleus, frontend, accessibility, performance, SEO or other non-Pocock skills.
- Adding workflow procedures beyond the retained seven.
- Replacing the Amarelo workflow with a router such as `ask-matt`.
- Adopting the complete upstream setup, triage or session-management model.
- Changing product/runtime behavior or erasing legitimate provenance.

## Evidence and Promotion

The before/after import inventory, preserved project inventory, retained-skill rewrites, active metadata changes and executable checker form the implementation evidence. Durable ownership was promoted to `AGENTS.md`, `.agents/specs/workflow.md`, `.agents/specs/template.md`, `.agents/skills/readme.md`, `.agents/context/engineering/workflow-skills.md`, `.agents/rules/011-spec-driven-development.rule.md` and `.audit/workflow-skills.audit.sh`.

PR #22 merged the implementation at `811427fb08b56880a4ece06e2acc18690c613210`; CI run `33787881077` passed on that exact `main`. The narrow closure PR records its own exact-head CI and review submissions because adding those identifiers here would itself invalidate the reviewed head.

## Further Notes

PR #22 was merged while its prepared closure commit had not yet entered the branch. This follow-up reconciles status, evidence and catalog state without changing runtime behavior. `SPEC-028` remains reserved at priority 010 for the approved Elo CLI modernization.
