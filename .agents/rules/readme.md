---
version: 3
name: Rules Index
description: Stable identities, catalog, and lifecycle of durable repository rules.
alwaysApply: true
priority: high
tags:
  - harness
  - rules
---

# Rules

Rules are durable constraints that implementations and engineering agents must obey. Every canonical rule is a direct child named `NNN-lowercase-kebab-case.rule.md`; this `readme.md` is the only unnumbered support document in the boundary.

The three-digit prefix is a stable catalog identity and never defines enforcement order or precedence. Existing rule metadata and authored policy remain authoritative. Existing identities are never reassigned, compacted, or reused after retirement. A new rule receives one greater than the highest allocated identity and must update this index, exact references, and executable checks in the same change.

Prefer small rules with one clear concern. When a rule can be checked mechanically, the repository harness should enforce it. Do not store temporary task instructions here. Complex architectural changes must consider an ADR, spec, contract, and mechanical invariant in the same cycle.

## Catalog

| ID | Canonical rule |
|---:|---|
| 001 | [Architecture](001-architecture.rule.md) |
| 002 | [Code style](002-code-style.rule.md) |
| 003 | [Context engineering](003-context-engineering.rule.md) |
| 004 | [Import boundaries](004-import-boundaries.rule.md) |
| 005 | [Markdown](005-markdown.rule.md) |
| 006 | [Memory Nucleus](006-memory-nucleus.rule.md) |
| 007 | [Package ownership](007-package-ownership.rule.md) |
| 008 | [Product safety and privacy](008-product-safety-and-privacy.rule.md) |
| 009 | [React and Next.js](009-react-and-next.rule.md) |
| 010 | [Source organization](010-source-organization.rule.md) |
| 011 | [Spec-driven development](011-spec-driven-development.rule.md) |
| 012 | [Container ownership](012-container-ownership.rule.md) |
