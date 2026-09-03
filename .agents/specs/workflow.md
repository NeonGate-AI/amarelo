# Amarelo spec-driven workflow

This document is the canonical delivery workflow for bounded repository changes.

It adapts the stable practices from the `NeonGate-AI/skills` repository:

- `to-spec`: synthesize an implementation-ready contract from owner conversation, repository context and existing decisions.
- `to-tickets`: decompose the spec into vertical tracer bullets with explicit blocking edges.
- `implement`: execute only the unlocked work, using test-driven development at agreed seams.
- `tdd`: verify behavior through public interfaces, one red-to-green slice at a time.
- `code-review`: review the completed diff independently against repository standards and against the originating spec.
- `domain-modeling`: keep glossary and ADR decisions separate from implementation specifications.
- `writing-for-agents`: use progressive disclosure, explicit completion criteria and one source of truth.

Those upstream skills are authoring references. This document owns the Amarelo workflow and does not depend on a beta orchestration skill at runtime.

## Vocabulary

**Behavior spec**  
A living contract for current product or system behavior. Existing area specs remain behavior specs and are updated when that behavior changes.

**Delivery spec**  
A durable `SPEC-###` contract for one bounded change. It is stored in a flat `NNN-lowercase-slug.md` file whose numeric prefix expresses mutable priority, and records the problem, desired behavior, decisions, test seams, acceptance criteria and promotion plan.

**Retrospective spec**  
A delivery spec reconstructed after implementation from code, commits, pull requests and durable harness evidence. It documents observed capability without pretending the earlier work followed this workflow.

**Active spec**  
A prospective delivery spec with status `ready` or `in-progress`. Only one active spec should own the same behavioral seam at a time.

**Ticket graph**  
The vertical implementation slices derived from one delivery spec. Tickets are execution units, not alternative sources of product truth.

**Evidence**  
Reproducible outputs showing what was verified. Temporary outputs live in `.audit/`; stable links and conclusions are recorded in the delivery spec.

**Promotion**  
The final step that moves proven durable knowledge into the correct behavior spec, context, rule, ADR or mechanical check.

## Catalog layout

`.agents/specs/` is flat. It contains only:

- `readme.md`, `template.md` and `workflow.md` as unnumbered support documents;
- delivery specs named `001-lowercase-slug.md` through `099-lowercase-slug.md`;
- behavior specs named `101-lowercase-slug.md` through `199-lowercase-slug.md`.

The filename prefix is a unique, mutable priority rank. It is not the durable spec ID. Reserved delivery ranks are allowed only when named in `readme.md`. A priority change updates the index and every repository path reference atomically. No spec subdirectory, including a history directory, is permitted. Retrospective mode is metadata, not a location.

## Sources of truth

The repository uses this hierarchy:

```text
owner decision and repository reality
                 |
                 v
        numbered delivery spec
                 |
                 v
     vertical ticket dependency graph
                 |
                 v
       implementation and evidence
                 |
                 v
 durable behavior specs / context / rules / ADRs / checks
```

A handoff, chat transcript, branch name, issue or temporary plan is not the source of truth. It may provide authoring evidence, but the numbered delivery spec controls scope and acceptance.

GitHub Issues are the default ticket tracker. Every derived issue must link the `SPEC-###` file, describe one demonstrable vertical slice and declare what blocks it. The issue tracker never replaces the spec.

## Lifecycle

### 1. Discover

Load `AGENTS.md`, all `alwaysApply` rules, the relevant workspace context, current behavior specs and applicable ADRs. Inspect the implementation before describing a change.

Completion criterion: every affected public boundary and every applicable durable constraint is named in the draft spec.

### 2. Synthesize

Create the next durable delivery spec from the owner decision and repository evidence, then assign its filename priority in the flat catalog. Follow `template.md`. Do not reopen questions already settled by the owner or codebase. Record unresolved questions only when they materially block a decision.

Prefer the highest existing observable test seam. The ideal spec has one primary seam and only the secondary seams required for failures that the primary seam cannot localize.

Completion criterion: the spec contains an observable solution, user stories, explicit scope, implementation decisions, testing decisions, acceptance criteria, failure behavior, exclusions and a promotion plan.

### 3. Approve

A draft becomes `ready` only after the owner accepts its scope and consequential decisions. Approval does not mean every implementation detail is frozen. It means the behavioral contract and acceptance boundary are stable enough to execute.

Completion criterion: status is `ready`, acceptance criteria are checkable and no unresolved item blocks the first slice.

### 4. Decompose

Convert the ready spec into tracer-bullet tickets. Each ticket must:

- cut a narrow but complete path through the necessary layers;
- produce behavior that can be demonstrated independently;
- fit within one focused implementation context;
- identify the public seam it changes or verifies;
- declare blocking and blocked-by relationships;
- avoid horizontal technology-only work unless it is a required prefactor.

For broad migrations, use expand, migrate and contract stages while keeping each stage independently safe.

Completion criterion: the dependency graph has at least one unlocked frontier ticket and no acceptance criterion is orphaned.

### 5. Execute

Create or use a spec-named branch. The first implementation commit changes the spec from `ready` to `in-progress`. Work only from the unlocked frontier.

At each agreed seam:

1. write one failing behavior test;
2. implement the minimum change that makes it pass;
3. run the relevant typecheck and test;
4. continue with the next vertical slice.

Do not weaken acceptance criteria to match an implementation result. A material contract change returns to the owner and updates the spec with rationale before execution continues.

Completion criterion: every ticket is complete, the full repository validation passes and the implementation remains within the approved scope.

### 6. Review

Pin the merge-base and review the final diff on two independent axes:

- **Standards**: repository rules, context, ADRs, architecture and code quality.
- **Spec**: missing requirements, incorrect behavior and scope creep against the numbered delivery spec.

One axis must not mask the other. Findings are resolved or explicitly accepted before completion.

Completion criterion: both review axes have no unresolved blocking finding.

### 7. Capture evidence

Store transient logs, reports and experiment output in `.audit/`. Record stable evidence references in the delivery spec. Use synthetic fixtures unless the spec and privacy rules explicitly authorize another class of data.

Completion criterion: every checked acceptance criterion points to a reproducible test, check, diff, trace or reviewed manual procedure.

### 8. Promote

Move only proven durable conclusions to their proper source:

- current behavior -> behavior spec;
- system vocabulary -> context;
- permanent constraint -> rule;
- consequential tradeoff -> ADR;
- mechanically enforceable invariant -> checker or test.

Do not duplicate the same rule or decision across categories. Evidence stays evidence.

Completion criterion: the harness describes the resulting system without relying on the delivery conversation or temporary audit files.

### 9. Close

Set the delivery spec to `implemented`, record final evidence and merge through a pull request that references its durable ID. Its acceptance contract is not rewritten to describe later behavior, but its filename priority may change through an explicit catalog reordering. A later behavior change receives a new ID and may supersede it.

Completion criterion: implementation, evidence and promoted harness state agree, and temporary execution artifacts are removed.

## Status model

```text
draft -> ready -> in-progress -> implemented
                    |
                    +-> superseded
                    |
                    +-> retired
```

- `draft`: still being authored; implementation is blocked.
- `ready`: owner-approved and executable.
- `in-progress`: implementation has started.
- `implemented`: accepted and evidenced.
- `superseded`: replaced before or after implementation by a newer delivery spec.
- `retired`: intentionally abandoned without a replacement.

## Branch and pull request conventions

New work after this bootstrap uses a spec-based identifier:

```text
<type>/spec-###-short-slug
```

The pull request title and body reference `SPEC-###`. Commit messages remain conventional commits and include `Spec: SPEC-###` in the body when the relationship is not obvious from the branch and pull request.

The Handoff 4 branch is a one-time transition artifact. There is no Handoff 4.5 and future work is not planned through numbered handoff documents.

## Retrospective reconstruction

The retrospective bootstrap groups prior commits into coherent capabilities rather than producing one spec per commit.

A retrospective spec must:

- use `mode: retrospective`;
- use `status: implemented`;
- state the evidence used to reconstruct it;
- distinguish current code from reported historical validation;
- state missing proof and current limitations;
- include a `Retrospective Integrity` section;
- avoid claiming that the original work was test-first, spec-driven or planned exactly as reconstructed.

Retrospective mode is limited to work that predates this workflow. It cannot be used to bypass prospective specification for new work.

## Emergency changes

An urgent fix still starts from a minimal `type: fix` delivery spec marked `ready`. The spec may be short, but it must name the failing behavior, the public seam, rollback behavior and acceptance check before code changes begin.

## Workflow evolution

A change to this workflow requires its own numbered delivery spec and, when the tradeoff is consequential, an ADR. The structural checker validates document contracts but does not replace owner approval or semantic review.
