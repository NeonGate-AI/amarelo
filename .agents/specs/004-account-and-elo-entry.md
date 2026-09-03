---
id: SPEC-ONBOARDING-ENTRY-001
title: Private account and Elo entry
status: approved-current-direction
owner: product-owner
last-reviewed: 2026-08-26
related-decisions:
  - ADR-0001
  - ADR-0003
  - ADR-0005
---

# SPEC-ONBOARDING-ENTRY-001: Private account and Elo entry

## Purpose

Create one private participant account, verify it, and let that participant choose an account-local Elo before entering Amarelo.

## Required behavior

- Signup asks for e-mail, password, password confirmation, essential terms, and the currently available plan. Password equality is validated at the server boundary before WorkOS is called.
- Signup contains only the plan and credential flow. It does not contain the removed voice-explainer card.
- Voice onboarding asks for the participant's preferred name, chosen Elo, initial memory theme, conversation pace, and support-network preference, then presents a review step.
- Ana, Nico, and Isa are Elos. The chosen Elo is saved only as an account preference. Choosing the same Elo as another participant never joins conversations, memory, permissions, or access.
- Use `IA` only for artificial-intelligence processing. Use `memória`, not `contexto`, in authored product copy.
- The product conversation remains voice-only. Text fields and selection controls in onboarding are accessible form alternatives, not a second conversation channel.
- Only non-sensitive onboarding preferences are written to WorkOS metadata. Sensitive answers are not written to the identity profile.
- Components use Tailwind utilities only; `app/globals.css` is the sole Tailwind entrypoint and global token/base layer.

## Acceptance evidence

- The signup form exposes an accessible password-confirmation error for empty or mismatched confirmation.
- The selected Elo is required and included in the completion action.
- No CSS Module or component stylesheet exists in `workspaces/apps/onboarding`.
- Biome, TypeScript, and the onboarding production build pass.

## Links

- Product: `.agents/PRODUCT.md`
- Memory: `.agents/MEMORY.md`
- Rules: `.agents/rules/react-and-next.md`
- Implementation: `workspaces/apps/onboarding`
