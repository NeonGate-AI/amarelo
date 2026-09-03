---
id: SPEC-022
title: Preserve private account and Elo entry behavior
type: feature
status: implemented
mode: retrospective
created: 2026-08-26
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/onboarding
  - private account and Elo entry
context:
  - .agents/context/workflows/onboarding.md
  - .agents/context/product/overview.md
rules:
  - .agents/rules/product-safety-and-privacy.rule.md
  - .agents/rules/react-and-next.rule.md
adrs:
  - .agents/adrs/0002-elos-as-contextual-agents.adr.md
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0005-orbz-web-component.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/frontend-ui-engineering/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/apps/onboarding account, verification and onboarding flows
  - workspaces/apps/onboarding production build and repository validation
---

# SPEC-022: Preserve private account and Elo entry behavior

## Problem Statement

A participant needs one private account and an account-local Elo selection before entering Amarelo. The selection must never imply shared conversations, memory access or relationship authorization. The legacy contract defined this behavior in an obsolete document shape.

## Solution

Maintain the current signup, verification and onboarding sequence, keeping identity metadata minimal and separating product presentation from private-data authorization.

## User Stories

1. As a participant, I want to create and verify my private account, so that only I control my entry into Amarelo.
2. As a participant, I want to choose Ana, Nico or Isa as my Elo, so that the experience reflects my preference without joining me to another person's data.
3. As a privacy reviewer, I want sensitive onboarding answers kept out of identity metadata, so that WorkOS stores only necessary non-sensitive preferences.

## Scope

- Signup asks for e-mail, password, password confirmation, essential terms and the currently available plan.
- Password equality is validated at the server boundary before WorkOS is called.
- Signup contains only the plan and credential flow; the removed voice-explainer card does not return.
- Onboarding asks for preferred name, chosen Elo, initial memory theme, conversation pace and support-network preference, followed by review.
- Ana, Nico and Isa are Elos; the choice is an account preference only.
- Product copy uses `IA` for artificial-intelligence processing and `memória`, not `contexto`, for longitudinal memory.
- Text fields and selection controls are accessible onboarding alternatives, not a second product conversation channel.
- Only non-sensitive onboarding preferences may enter WorkOS metadata.
- Components use Tailwind utilities; `app/globals.css` remains the single Tailwind entrypoint and global token/base layer.

## Implementation Decisions

- Choosing the same Elo as another participant never joins conversations, memory, permissions or access.
- Relationship, plan and Elo preference are not authorization grants.
- Sensitive onboarding answers remain outside identity-provider metadata.
- Server validation owns credential equality and normalized failures.

## Testing Decisions

### Primary seam

The public onboarding actions and production application flow verify signup, verification and completion behavior.

### Secondary seams

Accessible form-state checks cover password confirmation and Elo selection; build and source audits cover styling boundaries.

### Fixtures and privacy

Use synthetic accounts and non-sensitive onboarding values only. Never use real health, family or support-network information in fixtures.

### Required validation

Run Biome, TypeScript, onboarding build, auth/action tests where present, architecture/import/spec audits and full repository CI.

## Acceptance Criteria

- [x] Signup exposes an accessible error for empty or mismatched password confirmation.
- [x] The selected Elo is required and included in onboarding completion.
- [x] Elo selection remains account-local and grants no conversation, memory or permission access.
- [x] Only non-sensitive preferences are eligible for identity metadata.
- [x] No CSS Module or component stylesheet exists in `workspaces/apps/onboarding`.
- [x] Biome, TypeScript and the onboarding production build are part of repository validation.

## Failure Behavior

Invalid credentials or mismatched confirmation fail before external identity calls. Missing Elo selection blocks completion. Identity-provider failure returns a bounded user-safe error. Sensitive answers are never used as a fallback metadata channel.

## Out of Scope

Production conversation serving, voice transport, Memory Nucleus retrieval, support-network invitations, billing enforcement and professional access are not owned here.

## Evidence and Promotion

The implemented onboarding actions, forms, account-local Elo data and production build provide the retrospective evidence. Stable privacy and terminology constraints are promoted to product and React/privacy rules.

## Further Notes

This file replaces `104-account-and-elo-entry.md` and updates obsolete links to the current `.agents/context`, `.agents/rules` and ADR taxonomy.

## Retrospective Integrity

This contract was reconstructed after the onboarding interface and server actions already existed. Current code and repository validation support the checked outcomes, but the spec does not claim that the original work followed the present delivery workflow or that downstream conversation and memory capabilities are shipped.
