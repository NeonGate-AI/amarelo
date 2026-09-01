---
id: SPEC-LANDING-NARRATIVE-001
title: Public product narrative
status: approved-current-direction
owner: product-owner
last-reviewed: 2026-08-26
related-decisions:
  - ADR-0001
  - ADR-0003
---

# SPEC-LANDING-NARRATIVE-001: Public product narrative

## Purpose

Position Amarelo as a voice-only way to express lived experience and build one permission-aware longitudinal memory that can improve continuity with trusted people and qualified professionals.

## Narrative requirements

- The hero says people converse with Amarelo by voice. `Entrar` is its only account action; account creation remains inside that flow. A separate in-page explanation link may remain. Do not show hero actions for `Criar conta` or `Rede de apoio`.
- `Elo` is the public name for the Orbz presence and its Ana, Nico, or Isa identity. Every support-network participant chooses their own Elo inside their own private account; choosing the same identity never joins conversations, shares memory, or grants access. Use `IA` whenever the copy refers to the underlying artificial intelligence, reasoning, inference, or memory processing; do not use `Elo` as a euphemism for AI.
- Explain each role—person, friends or family, and qualified professionals—with useful prose, without numbered cards. A support-network icon must communicate people or trusted relationships rather than generic sharing.
- Explain what longitudinal memory is and how AI organizes and memorizes what was said to help treatment conversations. Public copy uses `memória`, never `contexto`.
- Separate the product story into `APP = VOICE CONVERSATION` and `WEB = MEMORY + CONTROL` sections.
- In the app section, explain that each person speaks privately from their own app/account. Contributions may inform one person's longitudinal memory with provenance; private conversations are not exposed and a relationship never grants access. Present the approved phone experience at its native aspect ratio with compact controls and a live Orbz instance for each tab: `listening` while Ana listens, `speaking` while Ana speaks, and `idle` when the conversation controls are muted because Orbz has no `muted` state. The separate Elo beside the explanatory copy also renders a live Orbz instance in `listening`. The phone surface follows the landing's light or dark theme instead of assigning a theme to an individual tab.
- In the dashboard section, explain that the person reviews what is happening and decides what a therapist or psychiatrist may see. Sharing is explicit, granular, and revocable; it may enrich appointments but does not replace professional judgment.
- Present the dashboard with the owner-provided, precomposited transparent PNGs `Macbook-Air-console.amarelo.life.png` and `iPad-Air-4-console.amarelo.life.png`. Preserve their intrinsic aspect ratios and alpha channel. The only permitted pixel edit is a localized blur over `console.amarelo.life` in each Safari address field. Do not rebuild the device frames in CSS, crop the screenshots, stretch either asset, or replace their embedded console captures.
- The later invitation should lead with `Diga o que está sentindo hoje. Desabafe.` or equivalent. Remove only the word `autismo` from the existing concern list unless the owner requests broader copy changes.

## Truthfulness boundary

Describe the mobile and dashboard as the current product direction or work in progress where needed. Do not imply that production longitudinal memory, professional access, consent lifecycle, revocation propagation, compliance, or clinical outcomes are already implemented.

## Acceptance evidence

- Public copy outside the owner-provided console screenshot fixtures contains no user-facing use of `contexto`; the supplied device composites remain unedited.
- Hero and section hierarchy match the requirements above at mobile and desktop widths.
- Mobile imagery and dashboard imagery have meaningful alt text and do not carry essential privacy information that is absent from text.
- The MacBook visual is the primary desktop presentation and the iPad visual is prioritized on narrow layouts; both remain fully visible without non-uniform scaling.
- The repository's supported landing lint and build commands pass.

## Links

- Product: `.agents/PRODUCT.md`
- Memory: `.agents/MEMORY.md`
- Authorization decision: `.agents/decisions/0003-authorization-before-retrieval.md`
- Landing implementation: `workspaces/apps/landing`
