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

- Every bounded repository change starts from a numbered delivery spec that follows `.agents/specs/workflow.md`.
- Implementation starts only when a prospective spec is `ready`; the first implementation change moves it to `in-progress`.
- The delivery spec is the behavioral source of truth. Branches, issues, handoffs, chats and temporary plans only point to it.
- Derived tickets are vertical tracer bullets with explicit blocking edges and independently demonstrable outcomes.
- Tests are designed at pre-agreed public seams. Prefer the highest seam that can verify behavior without coupling to implementation details.
- Acceptance criteria may change only through an explicit spec revision that records the rationale before affected implementation continues.
- Temporary logs and experiment output live in `.audit/`. Proven conclusions are promoted to the appropriate behavior spec, context, rule, ADR or mechanical check.
- Final review evaluates repository standards and spec fidelity as separate axes. Both must pass.
- Implemented delivery specs retain their acceptance evidence as historical records. Later behavior changes use a new spec ID.
- Retrospective specs describe only pre-workflow work, cite evidence and disclose that they were reconstructed after implementation. They never claim unproven original intent or validation.
- Urgent work uses a minimal ready fix spec rather than bypassing the workflow.
