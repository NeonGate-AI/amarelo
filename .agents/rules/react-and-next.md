---
title: React, Vite, and Next.js rules
scope: web applications and packages
authority: repository policy
---

# React, Vite, and Next.js rules

- Style React web components with Tailwind utility classes by default. Do not create CSS Modules, component stylesheets, styled-JSX, CSS-in-JS, or JavaScript objects that recreate a stylesheet.
- Each app may keep one global Tailwind entrypoint for framework imports, design tokens, `@theme`, and genuinely global base behavior. It may also contain narrowly scoped CSS required for native-control pseudo-elements, third-party Custom Element hosts, safe-area primitives, or browser compatibility that cannot be expressed reliably in component markup. Keep each exception colocated in that entrypoint and scoped to the owning primitive; do not use it for ordinary component layout, typography, color, or spacing, and do not split it into theme or component CSS files.
- In Next.js, use Server Components by default and add `'use client'` at the smallest boundary that needs state, effects, browser APIs, or event handlers. In Vite, keep browser-only integrations behind narrow components or hooks instead of spreading platform checks through presentation components.
- Keep state minimal and derive values during render. Do not mirror props or server data into effects without a concrete synchronization need.
- In `workspaces/apps/mobile`, use Jotai for shared PWA control state. Separate source atoms, derived atoms, and write-only action atoms; do not store a value that can be derived. Prefer `useAtomValue` and `useSetAtom` when a component needs only one side of an atom.
- Persist only the approved theme and volume preferences. Conversation phase, mute state, captions, connectivity, standalone detection, and service-worker lifecycle state remain ephemeral.
- Use effects only for external systems and always clean up subscriptions, timers, and listeners.
- Treat WCAG 2.2 Level AA as the normative accessibility target. Preserve semantic HTML, logical programmatic order, keyboard operation, accessible names and states, focus behavior, reduced-motion preferences, readable contrast, reflow, and visible error states.
- WCAG 2.5.8 sets a 24 by 24 CSS-pixel minimum with defined exceptions. Amarelo targets at least 44 by 44 CSS pixels for practical interactive targets whenever the control is not an inline-text or user-agent exception.
- Avoid request waterfalls: start independent work together, keep data access near its owner, and stream only where the user benefits.
- Use framework primitives for routing, metadata, fonts, images, and scripts when they provide the correct behavior.
- Import shared packages through their declared exports. Do not reach into another workspace's private source.
- Treat third-party Custom Elements as native elements. Use their documented properties and events; do not recreate a removed framework adapter.
- For Orbz, render `<orb-z>`, use preset/state/size/speed, keep speech opt-in and unconfigured, and style layout through an outer element.
- Keep PWA registration and browser lifecycle signals in a narrow bridge. Use `vite-plugin-pwa` with a prompt-based update flow; never use a service worker as a product-agent runtime or private-data store.
- Review edited TSX for hydration risks, unstable values, unnecessary client boundaries, accessibility regressions, and avoidable re-renders.
