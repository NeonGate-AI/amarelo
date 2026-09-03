---
id: SPEC-029
title: Canonicalize the local engineering workflow skill set
type: governance
status: in-progress
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
  - .agents/rules/spec-driven-development.rule.md
  - .audit/specs.audit.sh
  - AGENTS.md
  - repository Markdown skill references
context:
  - AGENTS.md
  - .agents/context/engineering/workflow-skills.md
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

Amarelo imported a broad Matt Pocock engineering-skill catalog in commit `a50757b5c1bba3455a6098a26d06c01028cf9b46`, while the repository's canonical delivery workflow actually depends on seven procedures: `to-spec`, `to-tickets`, `implement`, `tdd`, `code-review`, `domain-modeling` and `writing-for-agents`.

Keeping the rest of that imported workflow catalog creates unnecessary routing choices, stale setup assumptions and contradictory process guidance. Some active harness documents also point to remote GitHub copies even though reviewed local copies exist under `.agents/skills/`. That allows an external branch to become an accidental procedural source of truth.

## Solution

Make the local harness authoritative for engineering workflow procedures. Retain exactly these seven Matt-Pocock-derived workflow skills:

1. `.agents/skills/to-spec/`
2. `.agents/skills/to-tickets/`
3. `.agents/skills/implement/`
4. `.agents/skills/tdd/`
5. `.agents/skills/code-review/`
6. `.agents/skills/domain-modeling/`
7. `.agents/skills/writing-for-agents/`

Delete every other top-level skill directory proven to belong to that import lineage. Preserve every independently sourced Amarelo, Memory, LangChain/LangGraph, frontend, accessibility, quality and platform skill.

Update the harness so `.agents/specs/workflow.md` owns the end-to-end lifecycle and links to the seven local reusable procedures. Active normative references use local `.agents/skills/.../SKILL.md` paths. Remote links may remain only as explicit attribution, provenance or immutable historical evidence.

## User Stories

1. As an engineering agent, I want one small canonical workflow-skill set, so that I do not choose among flows Amarelo does not use.
2. As a maintainer, I want reviewed local skill files to be authoritative, so that agent behavior is revision-stable and available offline.
3. As the workflow owner, I want the seven local procedures composed explicitly with Amarelo's lifecycle, so that imported methodology cannot silently redefine delivery.
4. As a project maintainer, I want unrelated project-native skills preserved, so that workflow pruning cannot remove product or platform expertise.

## Scope

- Use repository history, including commit `a50757b5c1bba3455a6098a26d06c01028cf9b46`, to identify the Matt Pocock import lineage.
- Retain the seven named workflow skills and remove every other top-level directory from that lineage.
- Preserve every skill outside that provenance set.
- Remove retained-skill dependencies on deleted routers, setup flows, trackers or vocabulary helpers.
- Update `workflow.md`, `template.md`, the skills index, `AGENTS.md`, scoped context, the spec-driven rule and active spec metadata.
- Extend `.audit/specs.audit.sh` so the inventory, local-reference and retained-skill self-containment contracts fail closed.
- Preserve semantic harness suffixes and the absence of `pnpm-lock.yaml`.

## Implementation Decisions

- Provenance, not directory naming or conceptual overlap, determines deletion.
- The retained set is exactly `to-spec`, `to-tickets`, `implement`, `tdd`, `code-review`, `domain-modeling` and `writing-for-agents`.
- `.agents/specs/workflow.md` remains the single owner of the delivery lifecycle; skills are phase-level procedures.
- A locally vendored skill is referenced normatively through its repository-local path.
- Remote skill links are allowed only when clearly classified as attribution, source provenance or historical evidence.
- Retained skills must be self-contained against the Amarelo harness and cannot depend on deleted router/setup procedures.
- No deleted workflow skill receives a compatibility wrapper.
- Context documents and `SKILL.md` keep ordinary filenames; specs, rules, ADRs and audit checkers retain their semantic suffixes.
- No product, runtime, Memory Nucleus or application behavior changes.

## Testing Decisions

### Primary seam

`./cli/elo check all` validates the final skill inventory, local-reference contract, retained-skill self-containment and suffix-aware harness.

### Secondary seams

- Before/after tree comparison against the import commit.
- Active frontmatter and Markdown reference scan.
- Retained-skill dependency scan.
- Explicit preservation check for the project-native inventory.
- Human review of `AGENTS.md`, workflow, template, context and skills index.

### Fixtures and privacy

Repository paths and synthetic checker fixtures only. No personal, production, credential or health data is involved.

### Required validation

Run `./cli/elo doctor --ci`, `./cli/elo check all`, full repository CI on the exact final head, and independent Standards and Spec-fidelity reviews. Verify that `pnpm-lock.yaml` remains absent.

## Acceptance Criteria

- [ ] The only Matt-Pocock-derived workflow skills remaining are the seven named by this spec.
- [ ] Every other skill from that import lineage is absent.
- [ ] Project-native and independently sourced skills are preserved.
- [ ] Every retained workflow skill is usable without a deleted prerequisite.
- [ ] `workflow.md` links the seven local procedures and remains lifecycle owner.
- [ ] `template.md` uses a local skill-path example.
- [ ] The skills index separates workflow procedures from project/domain skills and matches the tree.
- [ ] `AGENTS.md`, context and active harness metadata use local normative skill references.
- [ ] Mechanical checks reject missing retained skills, reintroduced imported directories, prohibited remote normative references and deleted-skill dependencies.
- [ ] Semantic suffixes remain intact and `pnpm-lock.yaml` remains absent.
- [ ] Full CI passes on the exact final implementation head.
- [ ] Both independent review axes pass with no unresolved blocking findings.

## Failure Behavior

Ambiguous provenance fails closed by preserving the directory until ownership is established. A retained skill that references a deleted prerequisite blocks completion. Remote links are classified rather than deleted blindly: attribution and historical evidence remain; executable or normative pointers become local paths. Any suffix regression, generated lockfile, broken harness check or missing project-native skill blocks merge.

## Out of Scope

- Redesigning project-native, LangChain/LangGraph, Memory Nucleus, frontend, accessibility, performance, SEO or other non-Pocock skills.
- Adding workflow procedures beyond the retained seven.
- Replacing the Amarelo workflow with a router such as `ask-matt`.
- Adopting the complete upstream setup, triage or session-management model.
- Changing product/runtime behavior or erasing legitimate provenance.

## Evidence and Promotion

Final evidence must include the provenance inventory, preserved non-Pocock inventory, local-reference and dependency scans, Elo checks, exact-head CI and both reviews. Durable ownership is promoted to `workflow.md`, `template.md`, the skills index, scoped context, `AGENTS.md`, the spec-driven rule and the mechanical checker.

## Further Notes

`SPEC-028` remains reserved at priority 010 for the approved Elo CLI modernization. `SPEC-029` remains at priority 029 after the Memory validation roadmap. The owner subsequently authorized implementation and merge of PR #22, superseding its original spec-only hold instruction.
