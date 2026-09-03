---
id: SPEC-CONSOLE-MEMORY-001
title: Longitudinal-memory review and control
status: approved-current-direction
owner: product-owner
last-reviewed: 2026-08-26
related-decisions:
  - ADR-0001
  - ADR-0003
  - ADR-0005
---

# SPEC-CONSOLE-MEMORY-001: Longitudinal-memory review and control

## Purpose

Give the person a web surface to review longitudinal memory, example autorrelatos, sharing state, permissions, and their account-local Elo.

## Required behavior

- Authored copy says `memória` or `memória longitudinal`, never `contexto`.
- Ana, Nico, and Isa are Elos. Use `IA` when describing artificial-intelligence organization or inference.
- The Elo selector changes only the local presentation. It never implies shared memory, permission, access, or a diagnosis.
- Example records remain explicitly labeled as example data and never use real private health or family history.
- Sharing is described as explicit and controlled by the person; a support or professional relationship never grants automatic access.
- Components use Tailwind utilities only; `app/globals.css` is the sole Tailwind entrypoint and global token/base layer.

## Acceptance evidence

- The code and accessible names use Elo terminology; technical `AgentOrb` identifiers may remain at the shared rendering boundary.
- No CSS Module or separate theme stylesheet exists in `workspaces/apps/console`.
- Biome, TypeScript, and the console production build pass.

## Links

- Product: `.agents/PRODUCT.md`
- Memory: `.agents/MEMORY.md`
- Rules: `.agents/rules/react-and-next.md`
- Implementation: `workspaces/apps/console`
