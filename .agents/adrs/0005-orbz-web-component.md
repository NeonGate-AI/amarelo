---
id: ADR-0005
title: Integrate Orbz as a silent native Web Component
status: accepted
date: 2026-08-25
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0005: Integrate Orbz as a silent native Web Component

## Context

Orbz removed its React adapter and exposes a strict SSR-safe Custom Element. Amarelo needs the visual states but must not allow the Orbz package's voice flow to speak on current web surfaces.

## Decision

Amarelo pins Orbz `0.3.1`, imports `react-types` for JSX augmentation and `browser` for registration, and renders `<orb-z>` directly on web surfaces.

Amarelo uses supported presets, does not pass `className` or custom palette properties, and does not configure `voiceEngine` or call `startTalking()`. Visual `listening` and `speaking` states do not imply audible speech.

Orbz is the renderer and technical package name. `Elo` is the user-facing Amarelo name for the rendered presence and its Ana, Nico, or Isa identity. Each participant gets an account-local Elo instance; the visual component itself carries no cross-account memory or authorization.

Current preset mapping is Ana=`peach`, Nico=`periwinkle`, Isa=`magenta`.

At the time this decision was accepted, the former React Native implementation did not embed Orbz and used a static Orb image. ADR-0006 subsequently replaced that surface with the React/Vite PWA described under Evolution.

## Alternatives considered

- **Restore the React adapter:** rejected because it no longer belongs to the package contract.
- **Maintain an Amarelo color API:** rejected by the owner in favor of presets.
- **Install a silent fake voice engine:** unnecessary in `0.3.1`, where speech is opt-in.

## Consequences

Layout styling wraps the element. State, speed, size, reduced motion, and preset stay typed through the package. Audible product voice must be implemented by Amarelo explicitly if later approved.

## Evolution

On 2026-08-27, ADR-0006 replaced the React Native mobile implementation with a React/Vite PWA. The mobile surface now follows this ADR's native, silent Web Component contract through `@repo/react`; ADR-0005 itself remains accepted.

## Compliance and verification

The shared wrapper must contain no React Orbz import, voice-engine assignment, `startTalking()` call, `className`, or custom color contract. Typecheck and build must use the installed `0.3.1` definitions.

## Links

- Implementation: `elos/packages/react/src/ui/agent-orb/agent-orb.tsx`
- Presets: `elos/packages/react/src/ui/agent-orb/presets.ts`
- Landing Hero: `elos/apps/landing/app/section/hero/agent-showcase.tsx`
- Mobile evolution: `.agents/decisions/0006-mobile-react-vite-pwa.md`
