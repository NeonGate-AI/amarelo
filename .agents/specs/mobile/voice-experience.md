---
id: SPEC-MOBILE-VOICE-001
title: Mobile PWA voice-state mock
status: approved-current-direction
owner: product-owner
last-reviewed: 2026-08-27
related-decisions:
  - ADR-0001
  - ADR-0005
  - ADR-0006
---

# SPEC-MOBILE-VOICE-001: Mobile PWA voice-state mock

## Purpose and boundary

Provide an installable, portrait-first React PWA that reproduces the approved Ana mockups and demonstrates deterministic component-state changes while remaining fully usable in landscape. This slice is presentation only. It does not capture microphone input, play audio, synthesize speech, transcribe, call an API or MCP server, invoke a product agent, read or write longitudinal memory, authenticate, upload, or synchronize anything.

The canonical product and privacy boundaries remain in `.agents/PRODUCT.md`, `.agents/MEMORY.md`, and `.agents/rules/product-safety-and-privacy.md`. ADR-0006 owns the framework decision; ADR-0005 owns the Orbz integration contract.

## Experience layout

Render a real full-viewport application, not the phone hardware shown around the references. Do not reproduce the iPhone frame, notch, status bar, camera, or side buttons.

The active surface contains, from top to bottom:

1. theme control at the top-left and end control at the top-right;
2. centered `Ana` heading and state label;
3. one central conversation group containing a large Ana Elo rendered by Orbz and its transcript directly below it;
4. a bottom control dock with microphone, volume range, and speaker controls.

The Orb and transcript must share one layout group with an explicit, stable gap. Free viewport height may be distributed around that group, but it must not create an expanding row between the Orb and transcript. Use `100dvh`, `viewport-fit=cover`, and `env(safe-area-inset-*)`. Keep the content calm and balanced on narrow devices. On wider screens, center the experience in a constrained column without drawing a fake device shell. The approved light and dark themes use the existing design tokens and Satoshi typography.

Vertically center the `Ana` heading and current status in the region between the top safe-area content edge and the top of the Orb stage. The corner controls remain anchored at the start of that same region and must not push the identity/status block upward. The light canvas uses the approved `#F9F8F2` ivory foundation with a subtle `yellow-50` gradient; it must read as gently warm rather than white, gray, or saturated yellow.

## Canonical experience states

| Experience state | Status | Transcript presentation | Orbz state | Control presentation |
|---|---|---|---|---|
| `speaking` | `Ana está falando` | Five ordered synthetic local utterances rendered with `ScrollRevealParagraph` | `speaking` | Default state; output volume above zero |
| `listening` | `Ana está ouvindo você` | One complete synthetic listening prompt | `listening` | Mock conversation audio was restored after mute/zero volume |
| `muted` | `Conversa silenciada` | One complete synthetic muted-state explanation without implying real audio | `idle` | Mock conversation audio is muted or volume is zero |
| `ended` | `Conversa encerrada` | A short synthetic explanation that the local demonstration ended | No active Orb | Replace the active surface with a calm local end state and a `Reiniciar demonstração` action |

The default app boot always initializes the local demonstration in `speaking`, clears the mute presentation, and restores `lastAudibleVolumeAtom`. This is a deliberate mock reset, even when the previous session persisted volume zero. An explicit `?state=` preview overrides that default. The five utterances are fixed local fixtures shown in a deterministic order. They are not recordings, microphone input, generated output, or durable conversation history. No transcript in this slice proves real audio or transcription.

Zeroing the volume or activating either audio icon control produces one coherent local muted presentation: both icon controls appear muted, volume becomes zero, and Orbz becomes `idle`. Restoring audio through either icon control restores the last audible volume, clears both mute presentations, and transitions the local phase to `listening`. These controls are deterministic UI fixtures; they do not simulate microphone capture or real audio routing.

## Orbz contract

- Use `@neongate-ai/orbz` exactly at `0.3.1` through the shared `AgentOrb` exported by `@repo/react`.
- Ana uses the supported `peach` preset.
- Default to Orbz `speaking`. Map restored audible output to Orbz `listening`, zero or muted output to Orbz `idle`, and the ended state to no active Orb.
- The ended state contains no active Orb.
- Do not configure `voiceEngine`, call `startTalking()`, add a fake speech engine, import a removed React adapter, pass `className` to `<orb-z>`, or recreate a custom-palette API.
- Orbz animation state is visual only. It never implies audible output.

## Controls

- Use the existing SmoothUI `SmoothButton` from `@repo/react` for icon buttons. Use the existing Phosphor icon dependency rather than adding another icon library.
- Theme toggles between the approved light and dark presentations without changing the conversation phase or audio-control state. First load may resolve the system preference; an explicit choice becomes the persisted preference.
- The microphone and speaker icon controls both toggle the same coherent mock-audio presentation. Muting through either control sets `microphoneMuted`, sets volume to `0`, presents both controls as muted, and yields Orbz `idle`.
- The visible native range control sets volume from `0` through `100`. Setting it to `0` synchronizes the muted presentation and yields Orbz `idle`; restoring it above `0` updates the last audible value, clears both mute presentations, and yields `listening`.
- Restoring through either icon control clears `microphoneMuted`, restores `lastAudibleVolumeAtom`, and yields `listening`.
- The X ends only this local demonstration. It must not attempt to close the browser, dismiss an OS surface, call a backend, claim that a conversation was saved, or show a confirmation dialog.
- Restart returns to the default `speaking` state, unmutes the microphone, and restores the last audible volume while retaining the theme preference.
- WCAG 2.2 Level AA is normative. WCAG 2.5.8 permits a 24 by 24 CSS-pixel minimum with defined exceptions; Amarelo targets at least 44 by 44 CSS pixels for practical controls whenever an exception does not apply.

## Transcript behavior

- Define exactly five synthetic local utterances in a deterministic order without making their literal copy part of this architectural contract.
- Render the ordered fixtures through `@repo/react/ui/scroll-reveal-paragraph`, implemented at `workspaces/packages/react/src/vendors/smoothui/scroll-reveal-paragraph/scroll-reveal-paragraph.tsx`.
- The reveal and final-line fade are decorative presentation only. Keep the five complete fixtures in deterministic source order. For each displayed utterance, keep its complete text in the DOM and expose it as one programmatically available value with `aria-live="polite"` and `aria-atomic="true"`.
- Under `prefers-reduced-motion: reduce`, show the stable transcript presentation without reveal animation; reduced motion must not delay, remove, or reorder any utterance.
- Do not use ellipsis as the accessible replacement and do not create a text field, keyboard input, transcript history, or second written-conversation path.

## Atomic state model

Jotai is the only shared application-state mechanism for this PWA. Keep component-local visual details local; do not add React Context, Redux, Zustand, or a second global store.

### Source atoms

| Atom | Type or domain | Persistence |
|---|---|---|
| `themePreferenceAtom` | `system | light | dark` | Allowed |
| `systemThemeAtom` | `light | dark` from `matchMedia` | Ephemeral |
| `volumeAtom` | integer `0..100` | Allowed |
| `lastAudibleVolumeAtom` | integer `1..100` | Allowed |
| `microphoneMutedAtom` | boolean | Ephemeral |
| `conversationPhaseAtom` | `listening | speaking | ended`, initially `speaking` | Ephemeral |
| `captionIndexAtom` | integer index into the five speaking fixtures | Ephemeral |
| `onlineAtom` | browser online signal | Ephemeral |
| `standaloneAtom` | installed-display signal | Ephemeral |
| `pwaOfflineReadyAtom` | service-worker readiness signal | Ephemeral |
| `pwaUpdateAvailableAtom` | service-worker update signal | Ephemeral |

`navigator.onLine` is only a browser connectivity hint; the UI must not claim that an external service is reachable. The current slice has no external service.

### Derived atoms

| Atom | Rule |
|---|---|
| `resolvedThemeAtom` | explicit preference, otherwise current system theme |
| `speakerMutedAtom` | `volume === 0` |
| `sessionOpenAtom` | `conversationPhase !== ended` |
| `experienceStateAtom` | `ended` wins; then `muted` when either mute presentation is active or volume is zero; otherwise the current phase |
| `statusLabelAtom` | exact PT-BR status for the derived experience state |
| `captionAtom` | current complete synthetic utterance for the derived experience state |
| `orbStateAtom` | `listening`, `speaking`, `idle`, or absent according to the state table |

Do not store a separate `muted` or `sessionOpen` source atom. They are derived facts, and duplicating them would permit contradictory states.

### Action atoms

Implement write-only actions for theme toggle, coherent mock-audio toggle, volume change, speaking-fixture advance, conversation end, demonstration restart, preview initialization, and PWA lifecycle events. Clamp volume input. Whenever a non-zero volume is selected, update `lastAudibleVolumeAtom`. A transition from zero to an audible volume also clears the muted presentation and sets the local phase to `listening`. Restart sets the default phase to `speaking` and resets the fixture index.

Initialize the default store with the same write-only preview action using `speaking`, so the first React paint already has the canonical state and restored audible volume. Support deterministic overrides with `?state=listening`, `?state=speaking`, `?state=muted`, and `?state=ended`. These parameters set local atoms only; they do not represent navigation or an external protocol.

## PWA delivery boundary

- Use React, TypeScript, Vite, Tailwind CSS, Jotai, and `vite-plugin-pwa`; do not use Next.js, Expo Web, React Native Web, Capacitor, or a router for this one-screen slice.
- Provide a PT-BR manifest with `display: standalone`, no orientation lock, correct scope/start URL for the deployed app, `#F9F8F2` initial background/theme metadata, a 192-pixel icon, a 512-pixel icon, a maskable icon, and an Apple touch icon under `icons/`.
- Generate the service worker with Workbox through `vite-plugin-pwa` and use a prompt-based update flow. Do not silently reload an active surface.
- Precache only the public HTML/CSS/JavaScript shell, fonts, icons, and versioned static visual assets produced by the build.
- Do not add runtime caching for APIs, audio, transcripts, captions produced at runtime, conversation data, memory, or user-generated content.
- Do not add push notifications, background sync, share targets, file handlers, protocol handlers, install analytics, external telemetry, or a custom install prompt.
- Detect standalone display with `matchMedia('(display-mode: standalone)')` and the iOS standalone property. Do not depend on `beforeinstallprompt`, which is not a universal installation mechanism.
- The static mock must still open from its precached shell while offline. Offline operation does not simulate a working voice or AI service.

## Motion and accessibility

- Meet WCAG 2.2 Level AA. Preserve semantic HTML, logical focus order, readable contrast, reflow, orientation support, and visible focus in both themes.
- Respect `prefers-reduced-motion`; reduce decorative transitions without hiding the current state.
- State is communicated by text and accessible properties, never color or animation alone.
- Browser listeners, media-query listeners, and service-worker subscriptions must be cleaned up.

## Acceptance evidence

- `pnpm install --frozen-lockfile`
- residue search confirms no Expo, React Native, NativeWind, gluestack, Reanimated, Worklets, `@repo/react-web`, or `@repo/react-mobile` references remain in active manifests and source;
- `pnpm lint`;
- a fresh root `pnpm build` immediately before production preview or start;
- `pnpm --filter mobile preview` reaches readiness;
- built manifest, service-worker registration, precache boundary, icons, and standalone metadata are inspected;
- default `speaking`, five ordered synthetic utterances, zero/muted mock audio to `idle`, restored audio to `listening`, all query-initialized states, both themes, range keyboard behavior, safe areas, portrait and landscape, reduced motion, and each complete screen-reader utterance value are manually inspected.

Automated tests and audits remain deferred by repository policy. Do not add or run Lighthouse, axe automation, browser automation, unit, integration, end-to-end, smoke, Playwright, Cypress, or evaluation suites.

## Open decisions

- Production microphone capture, speech input/output, interruption, latency, failure, and permission flows.
- Backend protocol and integration with the separately owned conversation domain.
- Authentication, lifecycle, and deployment-path decisions beyond this static mock.

## Links

- Product: `.agents/PRODUCT.md`
- Memory: `.agents/MEMORY.md`
- Safety and privacy: `.agents/rules/product-safety-and-privacy.md`
- React and PWA rules: `.agents/rules/react-and-next.md`
- PWA decision: `.agents/decisions/0006-mobile-react-vite-pwa.md`
- Mobile implementation: `workspaces/apps/mobile`
