---
name: frontend-ui-engineering
description: Build or review Amarelo application UI, Jotai state and accessible responsive interactions within the existing design system.
---

# Frontend UI engineering

Start from the owning workflow under `.agents/context/workflows/`, the active spec, `.agents/rules/009-react-and-next.rule.md` and `.agents/rules/010-source-organization.rule.md`. Product state contracts remain in specs, not in this skill.

## Implementation

- Reuse `@repo/ds` and approved `@repo/react` components. Preserve the Amarelo visual language and PT-BR copy.
- Keep each presentation, state, action, hook and transport concern in its semantic module and public directory boundary.
- In `workspaces/apps/mobile`, Jotai source atoms own mutable facts; derived atoms own projections; write-only action atoms own transitions. Read only the atom value or setter needed.
- Keep browser subscriptions and cleanup in narrow effects. Server credentials and provider/Memory implementation remain outside browser bundles.
- Persist only the approved theme and volume allowlist. Conversation, captions, authenticated-session material and errors remain transient.
- Model pending, failed, unavailable, expired and empty states explicitly. A cancelled or superseded response must not render as the current turn.
- The default synthetic voice presentation, the gated text driver and the gated Realtime experiment are distinct surfaces. Follow the active spec instead of applying mock-state defaults to connected flows.
- Keep Orb and readable transcript in one visual group. A visual fade must preserve the complete accessible text.

## Verification

Follow `.agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md` and the active spec's public test seams. Run focused evals/tests, typecheck and build; use the existing browser runner only when a browser seam is required. Adding an unrelated framework is not implied.

Load `../accessibility/SKILL.md` for interactive UI changes and `../pwa-development/SKILL.md` for install/cache/update behavior. Inspect keyboard focus, reduced motion, themes, responsive reflow and safe areas when a rendered page is available.

Report source assertions, executed tests and observed browser/device behavior separately. Compilation or an automated score alone does not prove accessibility conformance or measured performance.
