# Amarelo spec-driven workflow

This document is the canonical end-to-end delivery lifecycle for bounded repository changes. Local skills support individual phases; they do not replace or redefine this workflow.

## Canonical local procedures

| Procedure | Role in this lifecycle |
|---|---|
| [`to-spec`](../skills/to-spec/SKILL.md) | Synthesize an owner-approved contract from repository reality. |
| [`to-tickets`](../skills/to-tickets/SKILL.md) | Decompose one ready spec into vertical GitHub issues with blocking edges. |
| [`implement`](../skills/implement/SKILL.md) | Execute the unblocked work through evidence and merge readiness. |
| [`tdd`](../skills/tdd/SKILL.md) | Drive one observable behavior at a declared seam from red to green. |
| [`code-review`](../skills/code-review/SKILL.md) | Review the exact final head independently for Standards and Spec fidelity. |
| [`domain-modeling`](../skills/domain-modeling/SKILL.md) | Sharpen vocabulary, ownership and consequential decisions. |
| [`writing-for-agents`](../skills/writing-for-agents/SKILL.md) | Structure durable agent-facing context with explicit pointers and completion criteria. |

These repository-local files are the normative procedures. An external repository may be cited for attribution or historical provenance, but it is not an executable source of truth for current delivery.

## Vocabulary

**Numbered spec**  
A durable `SPEC-###` contract stored in a flat `NNN-lowercase-slug.spec.md` file. Its numeric filename prefix expresses mutable priority; its frontmatter ID is the durable identity.

**Retrospective spec**  
A numbered spec reconstructed from existing code and evidence after implementation. It documents observed capability without pretending the earlier work followed this workflow.

**Active spec**  
A prospective numbered spec with status `ready` or `in-progress`. Only one active spec owns the same behavioral seam at a time.

**Ticket graph**  
Vertical implementation slices derived from one ready spec. GitHub issues are execution units, not alternative product truth.

**Evidence**  
Reproducible output showing what was verified. Temporary output lives in `.audit/`; stable references and conclusions are recorded in the numbered spec and PR.

**Promotion**  
Moving a proven durable conclusion to the correct context, rule, ADR, spec or mechanical check without duplicating ownership.

**Integration**
Merging an implemented and reviewed delivery branch into `staging`, the repository's default branch and the base for subsequent work.

**Production promotion**
Merging `staging` into `main` through a dedicated pull request after the integrated head passes the required release gates.

## Catalog layout

`.agents/specs/` is flat and contains:

- `readme.md`, `template.md` and `workflow.md` as unnumbered support files;
- numbered specs named `001-lowercase-slug.spec.md` through `099-lowercase-slug.spec.md`.

The filename prefix is a unique mutable catalog-priority rank, not another spec ID. The dependency-ordered execution queue in `readme.md` determines which retained contract can run next; implemented history or an owner-blocked draft does not block an otherwise executable later rank. Reserved ranks must be named in `readme.md`. A priority or semantic-suffix change updates every repository reference atomically. Retrospective mode is metadata, not a subdirectory.

## Sources of truth

```text
owner decision + repository reality
                ↓
         numbered SPEC-###
                ↓
       vertical ticket graph
                ↓
     implementation + evidence
                ↓
 context / rules / ADRs / checks
```

A handoff, chat, issue, branch name or temporary plan may supply evidence, but cannot replace the numbered spec. GitHub Issues are the default ticket tracker and must link the canonical `.spec.md` path.

## Lifecycle

### 1. Discover

Load `AGENTS.md`, every applicable `alwaysApply` rule, scoped context, current product contracts, accepted ADRs and the implementation. Use [`domain-modeling`](../skills/domain-modeling/SKILL.md) only when vocabulary or ownership itself is changing.

Completion: every affected public boundary and durable constraint is identified.

For an owner-requested grill-me interview, use [grill-me](../skills/grill-me/SKILL.md) and its required [grilling](../skills/grilling/SKILL.md) engine before synthesis. Follow decision-frontier rounds and obtain explicit shared-understanding confirmation before implementing the resulting decisions.

### 2. Synthesize

Use [`to-spec`](../skills/to-spec/SKILL.md) and `template.md` to create or revise the next durable spec. Prefer the highest observable test seam and record unresolved questions only when they materially block execution.

Completion: solution, actors, scope, constraints, testing decisions, acceptance criteria, failure behavior, exclusions and promotion plan are checkable.

### 3. Approve

A prospective spec becomes `ready` only after the owner accepts its behavioral contract and consequential decisions.

Completion: no unresolved decision blocks the first slice.

### 4. Decompose

Use [`to-tickets`](../skills/to-tickets/SKILL.md) to publish tracer-bullet GitHub issues. Each ticket cuts a narrow complete path, names its public seam, declares blocking edges and maps to spec criteria. Wide mechanical changes may use expand–migrate–contract.

Completion: the dependency graph has an unblocked frontier and no orphaned criterion.

### 5. Execute

Start a spec-named branch from `staging` unless the active spec defines an explicit emergency or migration exception. The first implementation commit changes status to `in-progress`. Use [`implement`](../skills/implement/SKILL.md) and [`tdd`](../skills/tdd/SKILL.md) at the agreed seams. Work only from the unblocked frontier.

Do not weaken acceptance criteria to match an implementation result. A material contract change returns to owner approval before work continues.

Completion: every ticket is complete and scoped validation is green.

### 6. Capture evidence

Store transient logs and reports in `.audit/`; use synthetic fixtures unless an approved privacy rule authorizes another class. Every checked criterion points to a reproducible test, trace, diff or reviewed procedure.

Completion: no checked criterion relies on assertion alone.

### 7. Promote

Use [`writing-for-agents`](../skills/writing-for-agents/SKILL.md) when changing agent-facing documents. Promote vocabulary to context, permanent constraints to rules, consequential tradeoffs to ADRs and executable invariants to tests/checkers. A changed product contract receives a new or superseding spec rather than rewriting history.

Completion: the resulting system is understandable without the delivery conversation.

### 8. Close the spec

Set status to `implemented`, replace pending evidence with stable references and check every acceptance criterion only after the implementation is reproducible. Remove transient artifacts that no longer serve review.

Completion: implementation, evidence and promoted harness state agree.

### 9. Validate and review

Run the complete repository CI. Then use [`code-review`](../skills/code-review/SKILL.md) against the fixed merge base on two independent axes:

- **Standards**: rules, context, accepted ADRs, architecture, privacy and code quality.
- **Spec fidelity**: missing requirements, wrong behavior, unsupported evidence and scope creep.

Both reviews and CI apply to the exact same final head. Any head change invalidates all three and requires repetition.

Completion: CI is fully green and both axes have zero unresolved blocking findings.

### 10. Integrate into staging

Confirm the branch is current with `staging`, conflict-free and free of generated or prohibited artifacts. Complete `.github/pull_request_template.md` with the merge base, reviewed head, CI run, reviews, safety/privacy applicability, Memory ROI applicability and promotion record. Merge using the exact expected head SHA.

Completion: the merge result and spec evidence agree, and dependent work can begin from the resulting `staging`.

### 11. Promote staging to main

Open a dedicated pull request whose base is `main` and whose source is exactly `staging`. Do not promote an ordinary feature, fix, migration, refactor, governance or chore branch directly to `main`.

The promotion pull request must run the complete CI and the `Main accepts only staging` guard on its exact head. Use a merge commit for `staging -> main` so the production branch retains `staging` ancestry; squash or rebase promotion would make later release diffs ambiguous. Repository branch settings must reject direct writes, force pushes and deletion while still permitting gated pull-request merges.

Completion: the exact reviewed `staging` head is reachable from `main`, all required checks pass, and `staging` remains the base for subsequent work.

## Status model

```text
draft → ready → in-progress → implemented
                    ├────────→ superseded
                    └────────→ retired
```

- `draft`: decisions or acceptance boundaries remain open.
- `ready`: owner-approved and executable.
- `in-progress`: implementation has started.
- `implemented`: accepted and evidenced.
- `superseded`: replaced by a newer contract.
- `retired`: intentionally abandoned without replacement.

## Branch and PR conventions

Branches use `<type>/spec-###-short-slug`. PR titles and bodies reference the same durable ID. Conventional commits include `Spec: SPEC-###` when the relationship is not otherwise obvious.

`staging` is the default branch and ordinary pull-request base. Delivery branches start from `staging` and integrate back into `staging`. `main` is the production-ready branch and accepts only `staging -> main` promotion pull requests. The literal GitHub `Lock branch` option is not used because it would prevent normal promotion merges; branch protection and required checks provide the write boundary.

The PR is the merge record, not a substitute for the spec. A green run or review from an older head never authorizes merge.

## Retrospective reconstruction

A retrospective spec uses `mode: retrospective`, `status: implemented`, checked criteria, stable evidence and a substantive `Retrospective Integrity` section. It distinguishes observed code from reported historical validation and cannot be used to bypass prospective specification for new work.

## Emergency changes

Urgent work still begins with a minimal owner-approved `type: fix` spec. It names the failing behavior, public seam, rollback and acceptance check before code changes begin. A production hotfix that must start from `main` is an explicit exception: after promotion, its result must be reconciled into `staging` before unrelated delivery continues.

## Workflow evolution

The staging-first branch model is owned by [SPEC-044](044-staging-delivery-flow.spec.md). Changing this lifecycle requires its own numbered governance spec and, when the tradeoff is consequential, an ADR. Mechanical checks validate document contracts but do not replace owner approval or semantic review.
