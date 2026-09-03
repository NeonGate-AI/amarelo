---
id: SPEC-003
title: Establish the product application foundations
type: feature
status: implemented
mode: retrospective
created: 2026-09-02
updated: 2026-09-02
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/landing
  - workspaces/apps/onboarding
  - workspaces/apps/console
  - workspaces/apps/mobile
  - shared product UI packages
context:
  - .agents/context/apps/
  - .agents/context/product/
rules:
  - .agents/rules/react-and-next.md
  - .agents/rules/product-safety.md
  - .agents/rules/package-ownership.md
adrs:
  - .agents/adrs/
skills:
  - .agents/skills/
evidence:
  - https://github.com/NeonGate-AI/amarelo-v2/pull/1
  - .agents/specs/landing/product-narrative.md
  - .agents/specs/onboarding/account-and-elo-entry.md
  - .agents/specs/console/memory-control.md
  - .agents/specs/mobile/voice-experience.md
  - workspaces/apps/
---

# SPEC-003: Establish the product application foundations

## Problem Statement

The Amarelo product concept requires distinct surfaces for public explanation, account entry, patient/support interaction and operational visibility. A single undifferentiated application would mix deployment, security, audience and interaction concerns.

Before a real agentic backend existed, the product also needed an inspectable voice-first PWA prototype and shared visual primitives so that the conversational experience could be evaluated independently of model integration.

## Solution

Create four deployable application boundaries:

- Landing for the public product narrative.
- Onboarding for authentication and account entry.
- Console for support and operational interfaces.
- Mobile for the installable patient/support PWA experience.

Use shared design-system and React packages for reusable visual primitives, including the Agent Orb. Keep the current Mobile experience presentation-only and driven by local state until a later spec authorizes real backend, microphone, speech and agent integration.

## User Stories

1. As a visitor, I want a clear public explanation of Amarelo, so that I can understand its purpose before creating an account.
2. As a new user, I want a separate onboarding flow, so that authentication concerns do not leak into the public landing surface.
3. As a patient or support-network member, I want an installable focused PWA, so that the conversational interface feels like a standalone product.
4. As a user, I want the Orb and captions to communicate interaction state, so that the voice-first experience remains understandable.
5. As an operator, I want a separate Console surface, so that support and memory-control concepts do not clutter the patient interface.
6. As a frontend maintainer, I want shared product primitives consumed through public package APIs, so that applications do not duplicate or deep-import UI internals.
7. As a user with accessibility needs, I want keyboard, reduced-motion, theme and caption behavior represented in the interface, so that the prototype is not visual-only.

## Scope

The reconstructed foundation includes:

- separate Landing, Onboarding, Console and Mobile workspaces;
- shared design-system and React UI boundaries;
- Agent Orb consumption through a public package barrel;
- Mobile PWA manifest, service-worker generation and lifecycle UI;
- local conversation-state simulation, captions, theme, volume and end/restart behavior;
- current behavior specs for the four product areas;
- Tailwind source wiring and build repairs recorded in the merged repository state.

## Implementation Decisions

- Product surfaces remain separate application workspaces rather than routes inside one application.
- Mobile is a Vite/React PWA and is not a React Native application.
- The patient-facing prototype is voice-first; text input is not currently a product feature.
- Current Mobile conversation behavior is local simulation, not a real AI, API, microphone, STT or TTS integration.
- Shared UI is consumed through declared package exports.
- The Agent Orb represents presentation state but does not own conversation orchestration.
- Application-specific server/client boundaries remain explicit, especially in Onboarding.
- PWA assets may be cached, but future sensitive API responses, transcripts and personal memory must not be runtime-cached by the service worker.

## Testing Decisions

### Primary seam

The highest observed seam is the production build and manual application behavior of each deployable workspace.

### Secondary seams

- TypeScript compilation.
- Vite PWA generation and precache output.
- Tailwind source resolution audit.
- Public shared-package import boundaries.
- Keyboard focus, theme and reduced-motion behavior in the committed components.

### Fixtures and privacy

The current interfaces use static copy and local synthetic state. No real patient transcript, model response or longitudinal memory is required.

### Required validation

Pull request #1 reports successful repository-wide typecheck and builds for Mobile, Landing, Console and Onboarding after source/import and visual-regression repairs.

## Acceptance Criteria

- [x] Landing, Onboarding, Console and Mobile exist as separate workspaces.
- [x] Shared product UI is available through declared package boundaries.
- [x] Mobile builds as a Vite PWA and emits service-worker/precache output.
- [x] Mobile presents Ana, Orb state, captions, theme, volume and conversation end/restart behavior.
- [x] Mobile is explicitly presentation-only and does not claim a real model or voice backend.
- [x] Onboarding preserves client-safe and server-only boundaries.
- [x] Tailwind sources resolve after the workspace source migration.
- [x] Application builds participate in the root Turbo task graph.
- [x] Existing behavior specs describe the current product surfaces.

## Failure Behavior

- A failed app typecheck or production build blocks repository validation.
- An unresolved Tailwind source path fails the architecture audit.
- A shared-package private alias or undeclared deep import fails import validation or consumer compilation.
- Server-only dependencies exposed through a client barrel are treated as a boundary failure.
- PWA update/offline lifecycle failures remain visible through the local lifecycle UI rather than silently claiming full offline product support.

## Out of Scope

- Real LLM conversation.
- Fastify or other product backend.
- Microphone capture, STT, TTS and interruption.
- Memory retrieval or background curation from the PWA.
- Production SSO completion.
- Finished Console workflows.
- Clinical claims or treatment replacement.
- Production traffic, retention or conversion metrics.

## Evidence and Promotion

Primary evidence is the current application workspaces, living area specs and pull request #1. The pull request also records repairs to Tailwind sources, onboarding transition visuals, Console behavior and Mobile package-public boundaries.

Durable behavior is represented in area specs and application context. Build and import expectations are promoted into repository rules and mechanical checks.

## Further Notes

The future first agentic conversation should reuse this PWA and its Orb state model rather than replace the interface. A development-only textual driver may be specified as a test harness without changing the voice-first product decision.

## Retrospective Integrity

This spec was reconstructed after the applications and shared UI already existed. It records what the current repository can support and the limitations visible in code and existing behavior specs.

It does not claim that every surface is complete, that the applications have been independently deployed and smoke-tested, or that the original development was driven by this exact bounded spec.
