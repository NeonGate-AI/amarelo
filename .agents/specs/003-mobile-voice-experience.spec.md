---
id: SPEC-021
title: Preserve the Mobile PWA voice-state experience
type: feature
status: implemented
mode: retrospective
created: 2026-08-27
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/mobile
  - workspaces/packages/react/src/ui/agent-orb
  - Mobile PWA voice-state presentation
context:
  - .agents/context/workflows/mobile.md
  - .agents/context/product/overview.md
rules:
  - .agents/rules/product-safety-and-privacy.rule.md
  - .agents/rules/react-and-next.rule.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.adr.md
  - .agents/adrs/0005-orbz-web-component.adr.md
  - .agents/adrs/0006-mobile-react-vite-pwa.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/pwa-development/SKILL.md
  - .agents/skills/accessibility/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/apps/mobile deterministic Jotai state and one-screen PWA implementation
  - workspaces/packages/react AgentOrb and ScrollRevealParagraph public boundaries
  - Mobile typecheck, build, generated manifest and service-worker validation in repository CI
---

# SPEC-021: Preserve the Mobile PWA voice-state experience

## Problem Statement

Amarelo needs an installable portrait-first PWA that communicates the approved Ana voice experience before real microphone, speech, model and Memory infrastructure are connected. The interface must remain truthful: visual speaking/listening states are deterministic presentation fixtures and cannot imply that real audio, transcription, API, agent or memory behavior already exists. The legacy contract contained the required detail but used an obsolete spec format and stale harness paths.

## Solution

Preserve the implemented one-screen React/Vite PWA and its deterministic state model. The default experience renders Ana through Orbz, presents synthetic captions and maps local controls to `speaking`, `listening`, `muted` and `ended` states. It remains usable in portrait and landscape, installable as a PWA and accessible under WCAG 2.2 Level AA while making no production voice or AI claim.

## User Stories

1. As a participant, I want a calm installable mobile surface that visibly distinguishes when Ana is speaking, listening, muted or ended, so that the intended interaction model is understandable.
2. As a keyboard, screen-reader or reduced-motion user, I want every state and complete utterance available without relying on animation or color, so that the mock remains operable and understandable.
3. As a reviewer, I want the local demo to state its boundaries truthfully, so that synthetic captions and Orb animation cannot be mistaken for real audio, model output or stored conversation history.
4. As a maintainer, I want one atomic Jotai state model and one PWA shell, so that controls cannot create contradictory mute, volume, phase or lifecycle state.

## Scope

### Purpose and boundary

The PWA is a presentation-only slice. It does not capture microphone input, play or synthesize speech, transcribe, call a product API or MCP server, invoke Ana as a model-backed agent, read or write longitudinal memory, authenticate, upload or synchronize data.

### Experience layout

- Render a real full-viewport application rather than a phone hardware frame. Do not reproduce an iPhone frame, notch, status bar, camera or side buttons.
- The active surface contains top-left theme control, top-right end control, centered `Ana` identity and state label, one central Orb/transcript group and a bottom dock with microphone, volume range and speaker controls.
- Orb and transcript share one layout group with an explicit stable gap; free height may surround the group but may not create an expanding row between them.
- Use `100dvh`, `viewport-fit=cover` and safe-area insets.
- Center identity/status in the region between the top safe-area edge and Orb stage while corner controls remain independently anchored.
- The light canvas uses the approved `#F9F8F2` ivory foundation with a subtle `yellow-50` gradient and must read as warm rather than white, gray or saturated yellow.
- Wider screens use a constrained centered column without drawing a fake device shell. Both themes use existing tokens and Satoshi typography.

### Canonical experience states

| Experience state | Status | Transcript presentation | Orbz state | Control presentation |
|---|---|---|---|---|
| `speaking` | `Ana está falando` | Five ordered synthetic local utterances through `ScrollRevealParagraph` | `speaking` | Default state; output volume above zero |
| `listening` | `Ana está ouvindo você` | One complete synthetic listening prompt | `listening` | Mock conversation audio restored after mute/zero volume |
| `muted` | `Conversa silenciada` | One complete synthetic explanation without implying real audio | `idle` | Mock audio muted or volume zero |
| `ended` | `Conversa encerrada` | Short synthetic local-end explanation | no active Orb | Calm end state with `Reiniciar demonstração` |

Default boot initializes `speaking`, clears mute presentation and restores `lastAudibleVolumeAtom`. A valid `?state=` preview may override it. The five speaking utterances are fixed local fixtures in deterministic order and are not recordings, generated output, transcription or durable history.

### Orbz contract

- Use `@neongate-ai/orbz` exactly at `0.3.1` through the shared `AgentOrb` exported by `@repo/react`.
- Ana uses the supported `peach` preset.
- Map audible restored output to `listening`, speaking phase to `speaking`, muted/zero volume to `idle`, and ended to no Orb.
- Do not configure `voiceEngine`, call `startTalking()`, add a fake speech engine, import a removed React adapter, pass `className` to `<orb-z>` or recreate a custom-palette API.
- Orbz animation is visual only and never proves audible output.

### Controls and transcript

- Use the existing SmoothUI `SmoothButton` and Phosphor icons rather than adding another UI or icon library.
- Theme changes presentation without mutating conversation phase or audio-control state. System preference may initialize the first load; an explicit choice may persist.
- Microphone and speaker controls toggle one coherent mock-audio state. Muting either sets `microphoneMuted`, sets volume to zero, presents both controls as muted and yields Orbz `idle`.
- The native visible range accepts integer `0..100`. Zero synchronizes mute and `idle`; a nonzero restoration updates `lastAudibleVolumeAtom`, clears mute and yields `listening`.
- The X ends only the local demonstration. It never closes the browser, dismisses an OS surface, calls a backend, claims persistence or opens a confirmation dialog.
- Restart returns to `speaking`, clears microphone mute, restores last audible volume and retains theme preference.
- Controls target at least 44 by 44 CSS pixels whenever no WCAG exception applies.
- Keep exactly five synthetic speaking utterances in deterministic order. Complete text remains in the DOM and is exposed as one programmatically available value with `aria-live="polite"` and `aria-atomic="true"`.
- Reduced motion shows stable complete text without delayed, removed or reordered utterances.
- Do not use ellipsis as the accessible replacement and do not add a text field, keyboard conversation path or transcript-history surface.

### Atomic state model

Jotai is the only shared application-state mechanism. Component-local visual details remain local; React Context, Redux, Zustand or a second global store are not introduced.

Source atoms:

| Atom | Type or domain | Persistence |
|---|---|---|
| `themePreferenceAtom` | `system | light | dark` | allowed |
| `systemThemeAtom` | `light | dark` from `matchMedia` | ephemeral |
| `volumeAtom` | integer `0..100` | allowed |
| `lastAudibleVolumeAtom` | integer `1..100` | allowed |
| `microphoneMutedAtom` | boolean | ephemeral |
| `conversationPhaseAtom` | `listening | speaking | ended`, initially `speaking` | ephemeral |
| `captionIndexAtom` | index into five speaking fixtures | ephemeral |
| `onlineAtom` | browser online hint | ephemeral |
| `standaloneAtom` | installed-display signal | ephemeral |
| `pwaOfflineReadyAtom` | service-worker readiness | ephemeral |
| `pwaUpdateAvailableAtom` | service-worker update signal | ephemeral |

`navigator.onLine` remains only a browser hint and cannot prove an external service is reachable.

Derived atoms:

| Atom | Rule |
|---|---|
| `resolvedThemeAtom` | explicit preference, otherwise system theme |
| `speakerMutedAtom` | `volume === 0` |
| `sessionOpenAtom` | `conversationPhase !== ended` |
| `experienceStateAtom` | ended wins; then muted when mute presentation is active or volume is zero; otherwise current phase |
| `statusLabelAtom` | exact PT-BR status for derived state |
| `captionAtom` | complete fixture for derived state |
| `orbStateAtom` | `listening`, `speaking`, `idle` or absent according to the state table |

Do not store separate `muted` or `sessionOpen` source atoms. Write-only actions own theme toggle, coherent mock-audio toggle, clamped volume change, fixture advance, end, restart, preview initialization and PWA lifecycle events. Every nonzero volume updates `lastAudibleVolumeAtom`; zero-to-audible restoration clears mute and sets `listening`. The same preview action initializes the default store before the first React paint. Supported deterministic previews are `?state=listening`, `speaking`, `muted` and `ended`.

### PWA delivery boundary

- Use React, TypeScript, Vite, Tailwind CSS, Jotai and `vite-plugin-pwa`; do not use Next.js, Expo Web, React Native Web, Capacitor or a router for this one-screen slice.
- Provide a PT-BR manifest with `display: standalone`, no orientation lock, correct scope/start URL, `#F9F8F2` initial background/theme metadata, 192 and 512 icons, maskable icon and Apple touch icon under `icons/`.
- Generate Workbox service worker through `vite-plugin-pwa` with prompt-based updates; never silently reload an active surface.
- Precache only public shell, fonts, icons and versioned static visual assets. Add no runtime caching for APIs, audio, runtime captions, conversation data, memory or user-generated content.
- Do not add push, background sync, share targets, file/protocol handlers, install analytics, external telemetry or a custom install prompt.
- Detect standalone display with `matchMedia('(display-mode: standalone)')` and the iOS standalone property rather than depending on `beforeinstallprompt`.
- The precached static shell may open offline but must not simulate a working voice or AI service.

### Motion and accessibility

Meet WCAG 2.2 Level AA with semantic HTML, logical focus, visible focus, contrast, reflow, orientation support and state communicated by text/accessibility properties rather than color or animation alone. Clean up browser, media-query and service-worker listeners.

## Implementation Decisions

- The product remains voice-first; the text shown here is synthetic presentation, not a second conversation transport.
- One derived state model prevents contradictory phase, mute and volume values.
- The mock is deterministic and locally resettable.
- PWA caching excludes sensitive or runtime-generated data.
- Accessibility and reduced motion are normative, not optional polish.
- The current presentation does not claim production microphone, speech, model, persistence or memory behavior.

## Testing Decisions

### Primary seam

The built Mobile PWA and its public state/actions are the primary seam. Reviewers observe default boot, explicit previews, control transitions, complete captions, Orbz mapping, end/restart and PWA metadata.

### Secondary seams

Source/type checks localize state-model and package-boundary failures; generated manifest/service-worker inspection localizes PWA boundary failures; manual keyboard, screen-reader, reduced-motion, portrait and landscape checks cover presentation not fully represented by static type validation.

### Fixtures and privacy

All utterances and identities are synthetic local fixtures. No microphone capture, generated response, account data, longitudinal memory or private health/family content is stored, cached or emitted.

### Required validation

Run repository lint and typecheck, a fresh root build, Mobile build/PWA generation, supported package/source audits and manual checks for all canonical states, themes, orientation, range keyboard behavior, safe areas, complete accessible utterances and reduced motion. Historical instructions that broadly deferred automation are not carried forward as a prohibition against current repository CI.

## Acceptance Criteria

- [x] The PWA renders a full-viewport device-independent experience with the approved layout and warm light foundation.
- [x] Default boot and `?state=` previews deterministically produce speaking, listening, muted and ended states.
- [x] Microphone, speaker and range controls maintain one coherent mute/volume/phase model.
- [x] Orbz uses the approved package, `peach` preset and exact state mapping without a fake voice engine.
- [x] Five ordered synthetic speaking utterances remain complete and programmatically available.
- [x] Jotai is the only shared state mechanism and duplicated derived source state is absent.
- [x] Manifest, icons, standalone behavior and prompt-based service-worker update flow are configured.
- [x] Runtime caching excludes APIs, audio, conversation data, memory and user-generated content.
- [x] WCAG 2.2 AA, visible focus, orientation support and reduced-motion behavior are normative.
- [x] Mobile typecheck, build and PWA generation are included in the repository validation path.

## Failure Behavior

Invalid preview values fall back to the canonical default. Zero volume always resolves to muted/idle. Aborted or ended local state cannot claim a saved conversation. Offline shell availability cannot claim service reachability. Missing PWA updates remain user-prompted rather than silently reloading. Listener cleanup prevents stale lifecycle updates after unmount.

## Out of Scope

Production microphone capture, STT, TTS, interruption, latency, permissions, model/provider integration, backend protocol, authentication, durable conversation history, Memory Nucleus access and deployment-path decisions beyond the static PWA remain separate work.

## Evidence and Promotion

The current Mobile source, Jotai state model, shared Orbz/ScrollReveal boundaries, generated PWA artifacts and repository build provide retrospective evidence. Stable framework, cache, accessibility and truthfulness boundaries are promoted to Mobile context and React/privacy rules.

## Further Notes

This file replaces `103-mobile-voice-experience.md`. Its stale `.agents/PRODUCT.md`, `.agents/MEMORY.md` and `.agents/decisions` links were replaced with the current context/rules/ADR taxonomy.

## Retrospective Integrity

This spec was reconstructed after the visual PWA and its state model had already been implemented. It preserves the legacy contract's detailed product boundaries and current observable behavior, but it does not claim that the original work followed today's spec-driven process or that the mock proves real voice, model, API or longitudinal-memory operation.
