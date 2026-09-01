---
version: 2
name: Rules Index
description: Purpose and lifecycle of durable repository rules.
alwaysApply: true
priority: high
tags:
  - harness
  - rules
---

# Rules

Rules are durable constraints that implementations and engineering agents must obey. Prefer small rules with one clear concern. When a rule can be checked mechanically, the repository harness should enforce it.

Do not store temporary task instructions here. Complex architectural changes must consider an ADR, spec, contract and mechanical invariant in the same cycle.
