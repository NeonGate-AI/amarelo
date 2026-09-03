---
id: SPEC-024
title: Preserve the public Amarelo product narrative
type: feature
status: implemented
mode: retrospective
created: 2026-08-26
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/landing
  - public product narrative
context:
  - .agents/context/product/overview.md
  - .agents/context/product/strategy.md
  - .agents/context/workflows/landing.md
rules:
  - .agents/rules/product-safety-and-privacy.rule.md
  - .agents/rules/react-and-next.rule.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.adr.md
  - .agents/adrs/0002-elos-as-contextual-agents.adr.md
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/frontend-ui-engineering/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/apps/landing product story, agent presentation and dashboard imagery
  - workspaces/apps/landing production build and repository validation
---

# SPEC-024: Preserve the public Amarelo product narrative

## Problem Statement

Amarelo must explain voice conversation, longitudinal memory and permission-aware support without presenting future clinical, consent or production capabilities as already delivered. The legacy landing contract was detailed but used an obsolete spec shape and stale harness links.

## Solution

Maintain a truthful public narrative: people converse with Amarelo by voice, each participant has a private account and account-local Elo, and the person controls a longitudinal memory that may improve continuity with trusted people and qualified professionals.

## User Stories

1. As a visitor, I want to understand the difference between the voice app and the web control surface, so that the product proposition is clear.
2. As a person considering Amarelo, I want privacy and sharing described precisely, so that I do not mistake a relationship or Elo for automatic data access.
3. As a reviewer, I want future capabilities labeled as direction or work in progress, so that public copy does not overclaim implementation or clinical outcomes.

## Scope

- The hero presents voice conversation and uses `Entrar` as its only account action; account creation remains inside that flow.
- `Elo` names the Orbz presence and its Ana, Nico or Isa identity. `IA` names artificial-intelligence processing, reasoning, inference or memory organization.
- Choosing the same Elo never joins conversations, shares memory or grants access.
- Product roles—person, friends/family and qualified professionals—are explained in useful prose.
- Public authored copy uses `memória`, not `contexto`, for longitudinal memory.
- The product story is separated into `APP = VOICE CONVERSATION` and `WEB = MEMORY + CONTROL`.
- App copy explains that each person speaks privately from their own account; contributions may become source-provenanced candidates for one person's memory, while private conversations remain private.
- App visuals preserve native aspect ratio and show live Orbz states: `listening`, `speaking` and `idle` for muted presentation.
- Dashboard copy explains explicit, granular and revocable sharing that may enrich appointments but never replaces professional judgment.
- Owner-provided dashboard device composites retain intrinsic aspect ratio and alpha; only the permitted localized address-field blur may alter pixels.
- The later invitation leads with `Diga o que está sentindo hoje. Desabafe.` or equivalent, and removes only `autismo` from the concern list unless the owner directs broader copy changes.

## Implementation Decisions

- The product narrative distinguishes current product direction from shipped production infrastructure.
- Support-network membership, payment and Elo identity never imply data authorization.
- Orbz is a visual presence; its animation state is not proof of real voice transport.
- Essential privacy meaning must be present in text rather than carried only by imagery.
- Device composites are owner-provided assets, not CSS reconstructions.

## Testing Decisions

### Primary seam

The rendered Landing at mobile and desktop widths is the primary seam for hierarchy, terminology, truthful capability framing and asset presentation.

### Secondary seams

Source searches cover forbidden user-facing `contexto` and asset replacement; image dimensions/alt text and production build localize visual regressions.

### Fixtures and privacy

Landing copy and screenshots use approved public or synthetic content only. No private conversation, memory, health or family data may enter assets or source.

### Required validation

Run supported Landing lint, typecheck, production build, responsive/manual asset inspection, architecture/import/spec audits and full repository CI.

## Acceptance Criteria

- [x] Public authored copy outside supplied screenshot fixtures contains no user-facing `contexto` for longitudinal memory.
- [x] Hero and product-story hierarchy distinguish voice conversation from web memory/control at mobile and desktop widths.
- [x] Elo and IA terminology follow their separate product meanings.
- [x] Mobile and dashboard imagery have meaningful alt text and do not carry essential privacy meaning absent from prose.
- [x] MacBook and iPad composites remain fully visible with intrinsic aspect ratios and no non-uniform scaling.
- [x] Copy does not claim production memory, professional access, consent propagation, compliance or clinical outcomes as shipped.
- [x] The supported Landing lint and build commands are part of repository validation.

## Failure Behavior

Unavailable product capabilities are described as direction or work in progress. Missing imagery retains meaningful textual explanation. A relationship, account action or Elo choice cannot be presented as authorization. Asset regressions fail build or manual acceptance rather than being silently replaced.

## Out of Scope

This contract does not implement voice transport, longitudinal-memory serving, professional dashboards, consent workflows, billing, compliance certification or clinical efficacy.

## Evidence and Promotion

The current Landing source, public copy, approved product assets and production build provide the retrospective evidence. Stable terminology and truthfulness boundaries are promoted to product context and safety/privacy rules.

## Further Notes

This file replaces `106-product-narrative.md` and updates retired `.agents/PRODUCT.md`, `.agents/MEMORY.md` and `.agents/decisions` links to the current harness taxonomy.

## Retrospective Integrity

This spec was reconstructed after the Landing experience had already been implemented. It documents observable current presentation and current repository validation; it does not claim that every original design decision was made through this workflow or that the future product capabilities described by the narrative are operational.
