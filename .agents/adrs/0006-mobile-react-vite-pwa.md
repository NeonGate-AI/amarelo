---
id: ADR-0006
title: Replace the Expo mobile surface with a React Vite PWA
status: accepted
date: 2026-08-27
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0006: Replace the Expo mobile surface with a React Vite PWA

## Context

The approved mobile slice is a deterministic, one-screen presentation mock built from browser-compatible design-system components and the Orbz Web Component. The Expo and React Native implementation could not reuse Orbz or the shared browser UI directly and required a parallel native component package, static Orb image, and native-specific styling and build stack.

This slice needs installable standalone behavior, iPhone-safe layout, offline access to its public static shell, shared SmoothUI controls, Orbz visual states, ordered synthetic transcript presentation, and atomic local state. It does not need native device APIs, server rendering, search indexing, routing, remote data, audio, or external integrations.

## Decision

Keep the `mobile` workspace under `elos/apps/mobile` but replace its implementation with a client-only React, TypeScript, Vite, and Tailwind CSS PWA.

- Use Jotai source, derived, and write-only action atoms for shared local UI state.
- Start the local presentation in `speaking`, render five ordered synthetic utterances with the shared `@repo/react/ui/scroll-reveal-paragraph` component, and keep each displayed utterance complete for assistive technology.
- Keep the Orb and transcript in one visual group. Muting the coherent mock-audio presentation or setting volume to zero maps Orbz to `idle`; restoring audio maps it to `listening`.
- Use `vite-plugin-pwa` with Workbox `generateSW`, a web app manifest, standalone display, and a prompt-based update flow.
- Precache only the public application shell and versioned static build assets. Do not add runtime caching for APIs, audio, transcripts, conversations, memory, or user-generated content.
- Use the silent native Orbz `0.3.1` Custom Element through the shared browser package.
- Rename the shared browser package from `elos/packages/react-web` / `@repo/react-web` to `elos/packages/react` / `@repo/react` and remove `elos/packages/react-mobile` because this monorepo no longer has an active native consumer.
- Keep all mock conversation state and PWA lifecycle integration inside `elos/apps/mobile`; shared packages own reusable presentation components, not product state.
- Keep the layout portrait-first without locking orientation. Landscape remains a supported layout under the WCAG 2.2 AA target.
- Do not add microphone capture, audio playback, speech APIs, backend calls, MCP calls, push notifications, background sync, share targets, file handlers, protocol handlers, telemetry, or install analytics in this slice.

## Alternatives considered

- **Continue with Expo and React Native:** rejected because the approved surface is entirely browser-compatible and direct reuse of SmoothUI and Orbz is a primary requirement.
- **Use Expo Web or React Native Web:** rejected because they preserve native abstractions without providing value for this browser-first surface and do not make the native Orbz Custom Element a first-class shared component.
- **Use Next.js:** rejected because this authenticated-style, one-screen local mock needs neither server rendering nor search indexing; Vite provides the smaller client build and direct PWA integration required here.
- **Wrap the PWA with Capacitor or a trusted web activity now:** rejected because store packaging and native bridges are outside the approved scope.

## Consequences

### Benefits

- Mobile, landing, console, and onboarding can share the browser design system and Orbz integration.
- The mock can be installed and launched in standalone display while remaining a standard web deployment.
- One browser UI package replaces parallel web and native packages.
- Local state and offline behavior remain inspectable, deterministic, and isolated from private product data.
- The Orb and ordered transcript remain perceptually grouped across supported viewport sizes and orientations.

### Costs and risks

- Browser and installed-PWA lifecycle behavior differs across iOS and Chromium and requires device-level verification.
- Capabilities that later require native APIs may need a new decision rather than being assumed available.
- Service-worker updates and caches can make stale builds visible if the prompt and cleanup lifecycle are implemented incorrectly.
- Vite and Tailwind CSS v4 establish a modern-browser baseline, including Safari 16.4 or later unless a later compatibility decision expands it.

## Compliance and verification

- `elos/apps/mobile` has no Expo, React Native, NativeWind, gluestack, Reanimated, or Worklets dependencies or active source.
- Active workspace manifests and imports use `@repo/react`; `elos/packages/react-mobile` and `@repo/react-web` are absent.
- Orbz remains pinned to `0.3.1`, native, preset-based, and silent.
- Only the theme and volume preference allowlist persists. Conversation and PWA lifecycle state are ephemeral.
- The generated service worker contains no API, audio, transcript, conversation, memory, or user-content runtime cache.
- The default state is `speaking`; five ordered local utterances are rendered through `@repo/react/ui/scroll-reveal-paragraph`; zero or muted mock audio produces Orbz `idle`; restoring audio produces Orbz `listening`.
- The manifest does not lock orientation, and the Orb/transcript group remains usable in portrait and landscape.
- A fresh root `pnpm build` precedes production preview or start. The repository-supported lint and build checks pass, the mobile preview reaches readiness, and the canonical visual states are manually inspected.

Automated tests remain deferred by repository policy.

## Links

- Architecture: `.agents/ARCHITECTURE.md`
- Mobile specification: `.agents/specs/103-mobile-voice-experience.md`
- Orbz decision: `.agents/decisions/0005-orbz-web-component.md`
- React and PWA rules: `.agents/rules/react-and-next.md`
- Mobile implementation: `elos/apps/mobile`
