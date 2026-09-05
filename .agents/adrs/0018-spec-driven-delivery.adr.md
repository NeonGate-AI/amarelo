---
id: ADR-0018
title: Use numbered delivery specs as the unit of engineering change
status: accepted
date: 2026-09-02
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0018: Use numbered delivery specs as the unit of engineering change

## Status

Accepted on 2026-09-02.

## Context

Amarelo previously coordinated large work cycles through handoff documents, chat context and broad branch goals. That approach preserved useful intent but mixed scope, execution order, evidence and durable architecture in one artifact. It also made it difficult to determine which requirements controlled a change, whether acceptance was complete and which conclusions belonged in the long-lived harness.

The repository already had behavior specs, rules, context, ADRs and an audit evidence plane, but it did not define a complete lifecycle from owner decision to implementation, review, evidence and promotion.

The `NeonGate-AI/skills` repository provides compatible practices through `to-spec`, `to-tickets`, `implement`, `tdd` and `code-review`. Its beta orchestration skills are useful research, but making them a repository dependency would couple Amarelo governance to an unstable external execution mechanism.

## Decision

Amarelo will use numbered `SPEC-###` delivery specs as the canonical unit for every bounded repository change.

A delivery spec is synthesized from owner decisions and repository evidence, approved as `ready`, decomposed into vertical tracer-bullet tickets, implemented at agreed public test seams, reviewed independently against standards and spec fidelity, evidenced, promoted to the durable harness and closed as `implemented`.

GitHub Issues are the default derived ticket graph. Issues, branches and pull requests reference the spec but do not replace it.

Behavior specs remain living current-state contracts. Implemented delivery specs become immutable historical records. Work implemented before this decision is documented through explicitly retrospective specs that cannot claim the earlier work followed this process.

Handoff 4 establishes this workflow only. There is no Handoff 4.5. Subsequent product and architecture work starts from the next prospective numbered spec.

The repository adopts the stable method from the external skills but does not depend on beta `implement-spec` automation. Amarelo owns its workflow in `.agents/specs/workflow.md`.

## Consequences

- New implementation cannot begin from an unapproved chat request or broad handoff alone.
- Scope, test seams, failure behavior and acceptance become inspectable before code is written.
- Ticket graphs can be parallelized without splitting product truth across issues.
- Review can distinguish code-quality compliance from implementing the wrong behavior.
- Temporary evidence remains outside the canonical harness until conclusions are proven.
- Workflow documentation and structural validation add maintenance cost.
- Small urgent changes still require a minimal fix spec.
- Historical reconstruction requires explicit uncertainty and cannot fabricate prior intent.
- Future changes to this delivery model require another numbered spec and may require a new ADR.
