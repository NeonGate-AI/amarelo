---
id: SPEC-000
title: <bounded change title>
type: feature
status: draft
mode: prospective
created: YYYY-MM-DD
updated: YYYY-MM-DD
owners:
  - <owner>
targets:
  - <workspace or repository area>
context:
  - <relevant .agents/context path>
rules:
  - <relevant .agents/rules path>
adrs:
  - <relevant .agents/adrs path or none>
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
evidence:
  - pending
---

# SPEC-000: <bounded change title>

## Problem Statement

Describe the observable problem, affected actors and why the current behavior is insufficient.

## Solution

Describe the desired capability and its public boundary without turning the spec into a file-by-file implementation plan.

## User Stories

1. As a <specific actor>, I want <capability>, so that <observable value>.
2. As a <specific actor>, I want <failure or recovery behavior>, so that <risk is controlled>.

## Scope

State the behaviors, data boundaries and repository areas owned by this change.

## Implementation Decisions

Record decisions that materially constrain implementation. Prefer interfaces, ownership and invariants over incidental code structure.

## Testing Decisions

### Primary seam

Name the highest existing public seam and the behaviors observed through it.

### Secondary seams

List only seams needed for failures the primary seam cannot localize.

### Fixtures and privacy

Define synthetic fixtures, authorization assumptions and prohibited data.

### Required validation

List relevant tests, evals, typechecks, builds, audits and reproducible manual checks.

## Acceptance Criteria

- [ ] A checkable user-visible or system-visible outcome.
- [ ] Failure behavior is verified.
- [ ] Required repository validation passes.
- [ ] Durable conclusions are promoted to the correct harness source.

## Failure Behavior

Define validation failures, unavailable dependencies, retries, rollback and fail-open or fail-closed behavior.

## Out of Scope

List adjacent work that this spec intentionally does not own.

## Evidence and Promotion

While the spec is active, list planned evidence and expected harness destinations. At completion, replace `pending` evidence with stable references and explain what was promoted.

## Further Notes

Record non-normative context that helps execution without duplicating rules or ADRs.

## Retrospective Integrity

Include this section only when `mode: retrospective`. State that the spec was reconstructed after implementation, identify the evidence hierarchy and disclose unsupported original intent or missing validation.
