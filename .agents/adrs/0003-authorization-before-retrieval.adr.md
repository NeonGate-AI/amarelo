---
id: ADR-0003
title: Authorize before retrieving private context
status: accepted
date: 2026-08-25
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0003: Authorize before retrieving private context

## Context

Filtering sensitive information after retrieval exposes data to application and model context before permission is established. That violates Amarelo's private-by-default authority model and increases disclosure risk.

## Decision

Identity, relationship, consent, purpose, recipient, scope, expiry, and revocation must be evaluated before any private memory query. Retrieval is then constrained to the eligible categories and time windows and minimized for the current purpose.

Prompts and agent reasoning may not replace deterministic authorization.

## Alternatives considered

- **Retrieve broadly, then filter:** rejected because unauthorized data has already crossed the boundary.
- **Prompt-only access instructions:** rejected because a model cannot enforce its own permissions reliably.
- **Relationship-based permanent access:** rejected because a relationship is not consent and access must remain scoped and revocable.

## Consequences

Authorization and retrieval interfaces must be designed together. Caches, embeddings, derived artifacts, and audit logs must respect revocation and lifecycle changes.

## Compliance and verification

Every sensitive read path must demonstrate an authorization decision before a data query and preserve enough audit information to explain the resulting context.

## Links

- Memory contract: `.agents/rules/006-memory-nucleus.rule.md`
- Safety rule: `.agents/rules/008-product-safety-and-privacy.rule.md`
- Runtime memory design: `.agents/context/workspaces/memory-nucleus/overview.md`
- Memory Nucleus boundary: `.agents/adrs/0012-memory-nucleus-layout.adr.md`
