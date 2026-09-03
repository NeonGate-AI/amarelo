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

## Catalog layout

`.agents/specs/` is flat and contains:

- `readme.md`, `template.md` and `workflow.md` as unnumbered support files;
- numbered specs named `001-lowercase-slug.spec.md` through `099-lowercase-slug.spec.md`.

The filename prefix is a unique mutable priority rank. Reserved ranks must be named in `readme.md`. A priority or semantic-suffix change updates every repository reference atomically. Retrospective mode is metadata, not a subdirectory.

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

Start a spec-named branch from the required base. The first implementation commit changes status to `in-progress`. Use [`implement`](../skills/implement/SKILL.md) and [`tdd`](../skills/tdd/SKILL.md) at the agreed seams. Work only from the unblocked frontier.

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

### 10. Merge

Confirm the branch is current with its base, conflict-free and free of generated or prohibited artifacts. Complete `.github/pull_request_template.md` with the merge base, reviewed head, CI run, reviews, safety/privacy applicability, Memory ROI applicability and promotion record. Merge using the exact expected head SHA.

Completion: the merge result and spec evidence agree, and dependent work can begin from the resulting `main`.

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

The PR is the merge record, not a substitute for the spec. A green run or review from an older head never authorizes merge.

## Retrospective reconstruction

A retrospective spec uses `mode: retrospective`, `status: implemented`, checked criteria, stable evidence and a substantive `Retrospective Integrity` section. It distinguishes observed code from reported historical validation and cannot be used to bypass prospective specification for new work.

## Emergency changes

Urgent work still begins with a minimal owner-approved `type: fix` spec. It names the failing behavior, public seam, rollback and acceptance check before code changes begin.

## Workflow evolution

Changing this lifecycle requires its own numbered governance spec and, when the tradeoff is consequential, an ADR. Mechanical checks validate document contracts but do not replace owner approval or semantic review.
