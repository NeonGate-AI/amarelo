---
id: SPEC-014
title: Enforce spec-driven pull request evidence
type: governance
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - .github/pull_request_template.md
  - .agents/specs/workflow.md
  - .audit/specs.audit.sh
context:
  - .agents/specs/readme.md
  - .agents/specs/workflow.md
rules:
  - .agents/rules/context-engineering.rule.md
  - .agents/rules/markdown.rule.md
  - .agents/rules/product-safety-and-privacy.rule.md
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
  - .github/pull_request_template.md
  - .audit/specs.audit.sh template-contract enforcement
  - GitHub Actions CI on the final pull-request head
---

# SPEC-014: Enforce spec-driven pull request evidence

## Problem Statement

The repository contains only a placeholder at `.github/pr_template.md`. That filename is not one of GitHub's automatically discovered pull request template locations, and its content does not carry the repository's spec-driven workflow into the merge boundary.

As a result, a PR can omit its durable spec, exact reviewed head, acceptance evidence, independent Standards and Spec-fidelity results, dependency order, safety/privacy impact, Memory ROI applicability and promotion record. CI may be green while the evidence belongs to an older head or the behavioral contract remains incomplete.

## Solution

Replace the placeholder with the canonical GitHub-discovered file `.github/pull_request_template.md`. The template keeps the delivery spec as the source of truth and makes the PR a concise execution, evidence, review and merge record.

The template requires a spec link, observable outcome, scope, dependency order, acceptance-evidence table, exact CI/review SHAs, independent review results, conditional safety/privacy and Memory ROI gates, promotion record and final merge checklist. Non-applicable sections require a concrete reason instead of silent deletion.

Update the workflow and structural checker so the recognized template path and critical section contract cannot regress.

## User Stories

1. As an implementer, I want every PR to link its delivery spec, so that scope and acceptance remain unambiguous.
2. As a reviewer, I want Standards and Spec-fidelity results recorded separately on the same head, so that one axis cannot mask the other.
3. As a merger, I want CI, conflict and review evidence tied to the final head, so that stale certification cannot authorize a merge.
4. As a privacy reviewer, I want applicable data and authorization boundaries explicit, so that sensitive changes cannot pass as generic implementation work.
5. As a cost owner, I want AI and memory changes to compare quality, context tokens, model/tool cost and latency, so that the Memory Nucleus thesis remains measurable.
6. As a maintainer, I want GitHub to load the template automatically, so that the workflow appears without manual copying.

## Scope

This change owns:

- replacing `.github/pr_template.md` with `.github/pull_request_template.md`;
- a concise delivery-contract and outcome header;
- explicit included/excluded scope and rollback;
- dependency, blocker and merge-order fields;
- acceptance evidence mapped to spec criteria;
- exact merge-base, reviewed head and CI run fields;
- separate Standards and Spec-fidelity review records;
- conditional safety/privacy and Memory ROI sections;
- promotion and transient-evidence cleanup fields;
- a final merge gate that requires implemented spec, green CI, no conflicts and both reviews on the final head;
- workflow documentation and mechanical template-presence/section checks.

## Implementation Decisions

- Use the repository-level default template path `.github/pull_request_template.md`.
- Remove the unrecognized `.github/pr_template.md` placeholder.
- The PR body points to the delivery spec and never duplicates its normative acceptance contract.
- Evidence rows map acceptance criteria to reproducible tests, checks, traces, diffs or reviewed procedures.
- Both review axes record the fixed merge-base and reviewed head.
- Safety/privacy and Memory ROI are conditional but cannot be omitted silently; use `not applicable — <reason>`.
- Memory ROI applies to memory, retrieval, serving-context, routing, model, tool or AI-cost changes.
- The merge gate requires CI and both reviews on the exact final head after all fixes.
- The template remains Markdown-only and contains no workflow automation or privileged action.
- The existing spec checker validates the recognized filename, rejects the legacy placeholder and requires critical headings/checklist phrases.

## Testing Decisions

### Primary seam

The primary seam is `./cli/elo check all`, which must fail when the canonical template is missing, the legacy placeholder returns, or a critical spec/review/CI/merge section is removed.

### Secondary seams

- direct GitHub-compatible path inspection;
- Markdown formatting and link review;
- a synthetic checker mutation for one missing required section where practical;
- manual review against the repository spec-driven skills.

### Fixtures and privacy

The template contains placeholders only and no production, personal or credential data. Example evidence is synthetic.

### Required validation

- `./cli/elo doctor --ci`;
- `./cli/elo check all`;
- full repository CI;
- verification that `.github/pr_template.md` is absent;
- verification that `.github/pull_request_template.md` is present;
- independent Standards and Spec-fidelity reviews on the final head.

## Acceptance Criteria

- [x] GitHub's recognized `.github/pull_request_template.md` exists.
- [x] The legacy `.github/pr_template.md` placeholder is removed.
- [x] The template links the durable spec without duplicating it.
- [x] Outcome, scope, rollback, dependencies and merge order are explicit.
- [x] Acceptance criteria map to reproducible evidence.
- [x] CI, merge-base and reviewed head are recorded.
- [x] Standards and Spec-fidelity reviews are independent and separately recorded.
- [x] Safety/privacy applicability requires evidence or a concrete non-applicability reason.
- [x] Memory ROI applicability records quality, context tokens, cost and latency.
- [x] Promotion and temporary evidence cleanup are explicit.
- [x] The final merge checklist requires implemented spec, green CI, no conflicts and reviews on the final head.
- [x] The workflow and checker enforce the durable template contract.
- [x] Full CI and both review axes pass.

## Failure Behavior

The checker fails closed if the recognized template is missing, the legacy placeholder returns or a required contract/review/evidence/merge section disappears. A PR author may mark a conditional section not applicable only with a concrete rationale. Missing exact-head evidence blocks merge rather than being inferred from an older run or review.

## Out of Scope

- GitHub branch protection or organization rulesets.
- Automatic merging or approval.
- Issue templates.
- CODEOWNERS.
- Duplicating full spec acceptance text in each PR.
- Claiming production Memory ROI from template placeholders.
- Rewriting product specs or implementing product behavior.

## Evidence and Promotion

Planned evidence includes the canonical template diff, automatic-path verification, checker enforcement, full CI and independent reviews. The recognized path and merge evidence contract are promoted to `workflow.md` and the structural checker. No temporary evidence is retained in the harness.

## Further Notes

The template is intentionally explicit at the merge boundary and terse elsewhere. It follows the repository's new spec-driven skills: specify before planning, decompose vertical slices, implement at public seams, review Standards and Spec fidelity independently, capture evidence, promote durable knowledge and merge only the exact certified head.
