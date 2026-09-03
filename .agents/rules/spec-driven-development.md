---
version: 1
name: Spec-Driven Development
description: Required numbered-spec lifecycle, vertical task decomposition, evidence and review boundaries.
alwaysApply: true
priority: high
tags:
  - specs
  - delivery
  - testing
  - review
---

# Spec-driven development rules

- Every bounded repository change starts from a durable `SPEC-###` delivery spec that follows `.agents/specs/workflow.md` and lives in the flat priority catalog.
- Implementation starts only when a prospective spec is `ready`; the first implementation change moves it to `in-progress`.
- The delivery spec is the behavioral source of truth. Branches, issues, handoffs, chats and temporary plans only point to it.
- Derived tickets are vertical tracer bullets with explicit blocking edges and independently demonstrable outcomes.
- Tests are designed at pre-agreed public seams. Prefer the highest seam that can verify behavior without coupling to implementation details.
- Acceptance criteria may change only through an explicit spec revision that records the rationale before affected implementation continues.
- Temporary logs and experiment output live in `.audit/`. Proven conclusions are promoted to the appropriate behavior spec, context, rule, ADR or mechanical check.
- Final review evaluates repository standards and spec fidelity as separate axes. Both must pass.
- Implemented delivery specs retain their acceptance evidence. Their flat filename priority may change through an explicit catalog reorder, but later behavior changes use a new durable spec ID.
- Retrospective specs describe only pre-workflow work, cite evidence and disclose reconstruction limits. They remain flat with every other spec; no history subdirectory is allowed.
- Urgent work uses a minimal ready fix spec rather than bypassing the workflow.

- Every spec document is a direct child of `.agents/specs/` named `NNN-lowercase-kebab-case.md`; only `readme.md`, `template.md` and `workflow.md` are unnumbered.
- Filename priority and durable spec identity are separate. Priority ranks are unique, and reserved delivery ranks must be declared in the catalog index.
