---
id: SPEC-023
title: Preserve longitudinal-memory review and control behavior
type: feature
status: implemented
mode: retrospective
created: 2026-08-26
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/console
  - longitudinal-memory review and control
context:
  - .agents/context/workflows/console.md
  - .agents/context/product/overview.md
rules:
  - .agents/rules/product-safety-and-privacy.md
  - .agents/rules/react-and-next.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.md
  - .agents/adrs/0002-elos-as-contextual-agents.md
  - .agents/adrs/0003-authorization-before-retrieval.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/frontend-ui-engineering/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/apps/console memory, activity, sharing and Elo presentation
  - workspaces/apps/console production build and repository validation
---

# SPEC-023: Preserve longitudinal-memory review and control behavior

## Problem Statement

The person needs a web surface that explains longitudinal memory, sharing and permissions without implying that an Elo, relationship or dashboard selection grants private-data access. The legacy contract captured the presentation boundary but did not use the current specification template.

## Solution

Maintain the Console as the person's review-and-control surface, using synthetic example records and explicit language about permission, provenance and revocability.

## User Stories

1. As a person, I want to review longitudinal memory and example autorrelatos, so that I understand what the product is intended to organize.
2. As a person, I want sharing shown as explicit and revocable, so that relationships never appear to grant automatic access.
3. As a reviewer, I want all displayed sensitive-looking records to be clearly synthetic, so that demos cannot be confused with real private history.

## Scope

- Product copy says `memória` or `memória longitudinal`, never user-facing `contexto`.
- Ana, Nico and Isa are Elos; `IA` describes artificial-intelligence organization or inference.
- The Elo selector changes local presentation only.
- Example records are explicitly labeled as examples and contain no real private health or family history.
- Sharing is explicit, person-controlled and revocable; support or professional relationships grant no automatic access.
- Components use Tailwind utilities and `app/globals.css` remains the single Tailwind entrypoint/global layer.

## Implementation Decisions

- Elo selection is presentation state, not identity federation or authorization.
- Technical `AgentOrb` naming may remain at the shared rendering boundary while user-facing names use Elo.
- Dashboard fixtures must remain synthetic and truthfully labeled.
- No clinical diagnosis, professional judgment or production access guarantee is inferred from the mock.

## Testing Decisions

### Primary seam

The Console production surface is the primary seam for copy, accessible names, example-data labeling and permission presentation.

### Secondary seams

Source audits cover styling boundaries and forbidden terminology; build/typecheck cover application integrity.

### Fixtures and privacy

Only synthetic memory, activity, relationship and professional examples are allowed. No real health, family, conversation or account data may be committed.

### Required validation

Run Biome, TypeScript, Console build, applicable source audits, architecture/import/spec checks and full repository CI.

## Acceptance Criteria

- [x] User-facing code and accessible names use Elo terminology while technical shared-rendering identifiers may remain.
- [x] Example memory and activity records are clearly synthetic.
- [x] Sharing language remains explicit, granular and person-controlled.
- [x] Elo, seat or relationship selection grants no implied memory access.
- [x] No CSS Module or separate theme stylesheet exists in `workspaces/apps/console`.
- [x] Biome, TypeScript and the Console production build are included in repository validation.

## Failure Behavior

Missing or ambiguous authorization state must be presented as unavailable rather than shared. Demo-data loading failure cannot fall back to real records. UI selection never mutates permissions without a separately authorized server action.

## Out of Scope

Production Memory Nucleus transport, professional invitation workflow, consent mutation, billing, diagnosis and clinical outcomes are not implemented by this presentation contract.

## Evidence and Promotion

The Console source tree and production build provide the retrospective evidence. Stable terminology, synthetic-data and authorization boundaries are promoted to product safety and privacy rules.

## Further Notes

This file replaces `105-memory-control.md` and removes stale links to retired `.agents/PRODUCT.md` and `.agents/MEMORY.md` documents.

## Retrospective Integrity

This spec was reconstructed from the existing Console implementation and current repository checks. It records the presentation behavior that can be observed today and does not claim that the mock dashboard is already connected to production longitudinal memory or professional-access infrastructure.
