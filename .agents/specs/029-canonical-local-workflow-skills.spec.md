---
id: SPEC-029
title: Canonicalize the local engineering workflow skill set
type: governance
status: ready
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
  - AGENTS.md
  - repository Markdown skill references
context:
  - AGENTS.md
  - .agents/skills/readme.md
  - .agents/specs/readme.md
  - .agents/specs/workflow.md
rules:
  - .agents/rules/context-engineering.rule.md
  - .agents/rules/markdown.rule.md
  - .agents/rules/spec-driven-development.rule.md
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
  - pending
---

# SPEC-029: Canonicalize the local engineering workflow skill set

## Problem Statement

Amarelo copied a broad set of Matt Pocock engineering skills into `.agents/skills/`, including the import recorded by commit `a50757b5c1bba3455a6098a26d06c01028cf9b46`. The repository's canonical delivery workflow, however, actually depends on only seven of those upstream procedures: `to-spec`, `to-tickets`, `implement`, `tdd`, `code-review`, `domain-modeling` and `writing-for-agents`.

Keeping the rest of the imported workflow catalog creates unnecessary routing choices, stale setup assumptions and contradictory process guidance. It also makes the local harness look as if it implements the complete upstream methodology when Amarelo already owns a narrower, repository-specific spec-driven lifecycle.

The reference model is also inconsistent. Some Markdown documents identify a workflow skill through a remote GitHub location such as the upstream Matt Pocock repository or `NeonGate-AI/skills`, even though the skill is vendored locally under `.agents/skills/`. That bypasses the repository's reviewed local copy, makes offline/revision-stable loading weaker and allows a remote branch to become an accidental procedural source of truth.

## Solution

Make Amarelo's local harness authoritative for engineering workflow procedures.

Retain exactly these seven Matt-Pocock-derived workflow skills:

1. `.agents/skills/to-spec/`
2. `.agents/skills/to-tickets/`
3. `.agents/skills/implement/`
4. `.agents/skills/tdd/`
5. `.agents/skills/code-review/`
6. `.agents/skills/domain-modeling/`
7. `.agents/skills/writing-for-agents/`

Delete every other skill directory that belongs to the Matt Pocock import lineage, while preserving all project-native, Amarelo-specific, LangChain/LangGraph, memory, frontend, quality and other independently sourced skills already present in `.agents/skills/`.

Update the harness so `.agents/specs/workflow.md` describes the seven retained skills as local reusable procedures and links to their local `SKILL.md` files. The workflow remains the owner of the Amarelo delivery lifecycle; the skills support individual phases and do not supersede the workflow.

Normalize active harness Markdown and spec metadata so a skill that exists locally is referenced by its repository path, not by a remote GitHub URL. Remote upstream links may remain only as explicit attribution or historical evidence, never as the normative procedure an engineering agent is instructed to load.

## User Stories

1. As an engineering agent, I want one small canonical workflow-skill set, so that I do not choose between upstream flows Amarelo does not use.
2. As a maintainer, I want local skill files to be the procedural source of truth, so that the exact reviewed repository revision controls agent behavior.
3. As the workflow owner, I want `workflow.md` to state how the seven local skills compose with Amarelo's lifecycle, so that imported upstream methodology cannot silently redefine delivery.
4. As a project maintainer, I want unrelated project-native skills preserved, so that pruning Pocock workflow material does not remove product or platform expertise.

## Scope

This change owns:

- identifying the Matt Pocock skill-import lineage from repository history, including commit `a50757b5c1bba3455a6098a26d06c01028cf9b46` and any later direct follow-up imports from the same upstream catalog;
- retaining the seven workflow skills named by this spec;
- deleting all other top-level skill directories that are part of that Pocock-derived import set;
- preserving every skill outside that provenance set;
- auditing each retained skill for dependencies on deleted Pocock router/setup/utility skills and adapting those dependencies to the Amarelo harness where necessary;
- updating `.agents/specs/workflow.md` to point to the seven local skill files and remove remote-repository workflow ownership language;
- updating `.agents/specs/template.md` so `skills:` examples use repository-local paths;
- updating `.agents/skills/readme.md` to distinguish the canonical workflow skills from project/domain skills and list the resulting local inventory accurately;
- updating `AGENTS.md`, rules, context, numbered specs, templates and other repository Markdown when they use a remote URL as the normative reference for a locally vendored skill;
- adding or extending mechanical harness checks so the retained set and local-reference invariant cannot silently regress.

## Implementation Decisions

- The canonical retained Pocock-derived set is exactly `to-spec`, `to-tickets`, `implement`, `tdd`, `code-review`, `domain-modeling` and `writing-for-agents`.
- Provenance, not directory naming alone, determines deletion. A skill is removed only when repository history shows it came from the Matt Pocock import lineage and it is not one of the seven retained skills.
- Project-native and independently sourced skills are not candidates for deletion under this spec, even when they overlap conceptually with a retained workflow skill.
- `.agents/specs/workflow.md` remains the single owner of the end-to-end delivery lifecycle. Local `SKILL.md` files are reusable procedures invoked by that lifecycle.
- A locally vendored skill is referenced normatively with a repository-local path such as `.agents/skills/to-spec/SKILL.md`. Active harness documents must not instruct agents to load the corresponding procedure from `github.com/mattpocock/skills`, `github.com/NeonGate-AI/skills` or another remote mirror.
- Remote links are allowed only when clearly used for attribution, license/source provenance or immutable historical evidence. They cannot appear as the executable/normative value of `skills:` metadata when the local skill exists.
- Retained skills must be self-contained against the resulting harness. References to deleted Pocock-only prerequisites such as router/setup flows must be removed or replaced with existing Amarelo entry points, rules, workflow, tracker conventions or local retained skills.
- No deleted workflow skill is replaced with a new wrapper merely to preserve its old name.
- The implementation must not change product/runtime behavior.

## Testing Decisions

### Primary seam

The primary seam is `./cli/elo check all`. It must validate the resulting harness inventory and reference contract strongly enough that a missing retained workflow skill, a reintroduced prohibited remote normative reference or a broken retained-skill dependency fails before merge.

### Secondary seams

- repository-tree comparison against the Pocock import provenance;
- Markdown/reference scan across `AGENTS.md`, `.agents/`, `.github/` and other governance documentation;
- dependency/reference scan inside the seven retained skill directories;
- explicit inventory comparison proving project-native skills present before the migration remain present after it;
- review of `.agents/specs/workflow.md`, `.agents/specs/template.md` and `.agents/skills/readme.md` as the human-readable workflow surfaces.

### Fixtures and privacy

This is repository-governance work only. It uses repository paths, synthetic checker fixtures and Git history. No personal, production, credential or health data is required.

### Required validation

- `./cli/elo doctor --ci`;
- `./cli/elo check all`;
- full repository CI on the exact final head;
- verify all seven retained workflow directories and their `SKILL.md` entry points exist;
- verify every non-retained Pocock-derived skill directory is absent;
- verify the pre-change project-native/non-Pocock skill inventory is preserved;
- scan active harness Markdown for normative `github.com/mattpocock/skills` and `github.com/NeonGate-AI/skills` skill references;
- verify `workflow.md` and `template.md` use local skill paths;
- verify retained skills contain no unresolved dependency on a deleted skill;
- independent Standards and Spec-fidelity reviews on the final implementation head.

## Acceptance Criteria

- [ ] The only Matt-Pocock-derived workflow skills remaining are `to-spec`, `to-tickets`, `implement`, `tdd`, `code-review`, `domain-modeling` and `writing-for-agents`.
- [ ] Every other skill from the Matt Pocock import lineage is removed from `.agents/skills/`.
- [ ] Project-native and independently sourced skills that existed before this migration are preserved.
- [ ] Each retained workflow skill is usable without depending on a deleted Pocock skill, router, setup procedure or document.
- [ ] `.agents/specs/workflow.md` identifies and links the seven local skills and clearly states that the Amarelo workflow owns the lifecycle.
- [ ] `.agents/specs/template.md` uses local `.agents/skills/.../SKILL.md` examples instead of a remote GitHub skill URL.
- [ ] `.agents/skills/readme.md` accurately documents the resulting inventory and separates workflow procedures from domain/project skills.
- [ ] `AGENTS.md` and active harness Markdown use local paths for normative references to locally vendored skills.
- [ ] No active `skills:` metadata points to `github.com/mattpocock/skills`, `github.com/NeonGate-AI/skills` or another remote copy when the referenced skill exists locally.
- [ ] Mechanical checks reject a missing retained skill and prohibited remote normative workflow-skill references.
- [ ] Full repository validation passes on the exact final implementation head.
- [ ] Both Standards and Spec-fidelity reviews pass with no unresolved blocking findings.

## Failure Behavior

The implementation fails closed if provenance cannot distinguish a candidate skill from project-native content: the ambiguous directory is preserved until ownership is resolved rather than deleted speculatively.

A retained skill that still references a removed prerequisite blocks completion. A remote link found during scanning is not automatically deleted when it is genuine attribution or historical evidence; it must be classified. Any remote link that tells an agent which procedure to load is converted to the local canonical path.

If pruning breaks a harness check or workflow dependency, the deleted skill is not reintroduced as a shortcut. The dependency is either removed because Amarelo does not use it or replaced by the appropriate existing local workflow/rule/context source.

## Out of Scope

- Deleting or redesigning project-native, LangChain/LangGraph, Memory Nucleus, frontend, accessibility, performance, SEO or other non-Pocock skills.
- Adding new workflow skills beyond the seven retained by this spec.
- Replacing `.agents/specs/workflow.md` with an upstream router such as `ask-matt`.
- Adopting the full Matt Pocock workflow, setup model, issue-triage model or session-management model.
- Changing product behavior, AI runtime behavior, Memory Nucleus behavior or application architecture.
- Rewriting historical evidence solely to erase attribution to an upstream source.
- Merging the spec-only pull request that introduces this contract as part of this authoring action.

## Evidence and Promotion

Implementation evidence must include the before/after Pocock-provenance inventory, the preserved non-Pocock inventory, the final local-reference scan, retained-skill dependency scan, Elo checks, exact-head CI and two-axis reviews.

Durable results are promoted into `.agents/specs/workflow.md`, `.agents/specs/template.md`, `.agents/skills/readme.md`, applicable agent entry-point/rule documentation and the mechanical harness checks. The implementation spec is then closed with stable evidence; transient scan output remains outside canonical context.

## Further Notes

`SPEC-028` remains reserved for the previously approved Elo CLI modernization. This governance contract therefore uses durable ID `SPEC-029` and priority `029`, avoiding the Memory validation priorities being reconciled by `SPEC-015` / PR #19.

This PR is intentionally specification-only. The owner requested that the implementation not be performed and that the pull request remain open for later execution.