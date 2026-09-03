---
name: pwa-development
description: Build and review Amarelo's React/Vite PWA manifest, service worker, standalone lifecycle, static-shell offline behavior, and safe update flow.
when-to-use: When changing apps/mobile PWA behavior, VitePWA configuration, manifest metadata, icons, offline shell behavior, installation, or service-worker updates.
user-invocable: false
paths:
  - "apps/mobile/index.html"
  - "apps/mobile/vite.config.*"
  - "apps/mobile/src/components/pwa-lifecycle.tsx"
  - "apps/mobile/src/state/conversation-atoms.ts"
  - "apps/mobile/public/icons/**"
  - "apps/mobile/public/favicon.*"
effort: medium
---

# Amarelo PWA development

## Purpose

Use this workflow for the installable `apps/mobile` React/Vite surface. It narrows generic PWA advice to Amarelo's current static mock and repository policy.

This skill is implementation guidance, not product authority. Before changing behavior, read:

1. `AGENTS.md`;
2. `.agents/specs/003-mobile-voice-experience.spec.md`;
3. `.agents/decisions/0006-mobile-react-vite-pwa.md`;
4. `.agents/rules/react-and-next.rule.md`;
5. the current `apps/mobile` source and configuration.

If those sources conflict, report the conflict. Do not fill gaps by adding a remote feature or broader cache.

## Approved boundary

The current mobile PWA is a deterministic local presentation mock.

- Use React, TypeScript, Vite, Tailwind CSS, Jotai, and `vite-plugin-pwa`.
- Use a generated Workbox service worker through `VitePWA` with `generateSW`.
- Use a prompt-based update flow; do not silently reload an active surface.
- Make the public application shell available offline.
- Cache only versioned public build assets: HTML, CSS, JavaScript, fonts, icons, and static visual assets.
- Do not runtime-cache APIs, audio, transcripts, conversation content, memory, personalized content, or user-generated content.
- Do not add push notifications, background sync, share targets, file handlers, protocol handlers, install analytics, or external telemetry.
- Do not add microphone, speech, backend, MCP, or other external interactions as PWA infrastructure.
- Do not add or run automated tests while the repository verification policy defers them.
- Do not run Lighthouse, browser automation, synthetic performance suites, or automated accessibility tooling. Review source statically and inspect rendered behavior manually when available.
- Treat WCAG 2.2 Level AA as normative. Use 24 by 24 CSS pixels as the WCAG minimum where its exceptions do not apply and 44 by 44 CSS pixels as Amarelo's practical interactive-target goal.

## Toolchain

Use the workspace's pinned package manager and existing versions:

```bash
pnpm --filter mobile add jotai
pnpm --filter mobile add -D vite-plugin-pwa
```

These commands are examples only when the dependencies are missing. Do not upgrade unrelated packages.

The package name is `vite-plugin-pwa`. Import it as:

```ts
import { VitePWA } from "vite-plugin-pwa";
```

Do not use the nonexistent `@vite-pwa/vite-plugin` package, `next-pwa`, Create React App templates, or a handwritten service worker for this slice.

## VitePWA baseline

Configure against the app's actual deployment base. Do not assume `/` if the app is deployed under a path prefix.

```ts
VitePWA({
  strategies: "generateSW",
  registerType: "prompt",
  injectRegister: null,
  includeManifestIcons: false,
  manifest: {
    name: "Amarelo",
    short_name: "Amarelo",
    description: "Conversa por voz com seu Elo",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F9F8F2",
    theme_color: "#F9F8F2",
    icons: [
      {
        src: "/icons/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ["**/*.{html,js,css,woff2,png,svg,ico}"],
    navigateFallback: "index.html",
    runtimeCaching: [],
  },
});
```

Adapt `start_url`, `scope`, and `navigateFallback` together when the deployment base is not `/`. Keep `runtimeCaching` empty for the approved mock.

`includeManifestIcons: false` avoids a second generated inclusion path. The
approved `globPatterns` already precache the public PNG, SVG, and ICO files,
including the manifest icons and Apple touch icon. If the glob boundary changes,
inspect the generated precache list before retaining this setting.

## Manifest and icons

Required manifest behavior:

- `name` and `short_name` identify Amarelo;
- `lang` is `pt-BR`;
- `display` is `standalone`;
- the layout is portrait-first but the manifest does not lock orientation; landscape remains supported under WCAG 2.2 criterion 1.3.4;
- `start_url` and `scope` match the real deployment path;
- background and initial theme colors are `#F9F8F2` and match the initial light surface;
- 192-pixel, 512-pixel, maskable 512-pixel, and Apple touch icons exist and are readable at small sizes.

Maskable artwork must keep important content inside its safe center and use an opaque background. Do not rename a non-maskable image and claim it is maskable.

In `index.html`:

- use `viewport-fit=cover`;
- link the Apple touch icon;
- set an appropriate initial `theme-color`;
- opt into standalone-capable Apple metadata where it remains useful;
- preserve PT-BR document language and a meaningful title.

## Registration and update lifecycle

When the application imports `virtual:pwa-register/react`, keep registration in one narrow PWA bridge. Add the corresponding client type declaration if TypeScript needs it.

Use the hook's reactive `offlineReady` and `needRefresh` values to update the Jotai lifecycle atoms defined by the mobile spec. Keep callback references stable. Expose a deliberate user action that calls `updateServiceWorker(true)` when an update is available.

Do not configure `autoUpdate`, force `skipWaiting`, or reload on `controllerchange` without a user decision. An automatic reload can discard an active local surface and makes update behavior harder to inspect.

Service-worker readiness means the public shell can open offline. It does not mean an external service is online or that a conversation can continue.

## Standalone and connectivity signals

Standalone detection uses both:

```ts
window.matchMedia("(display-mode: standalone)").matches;
window.navigator.standalone === true;
```

The second property requires a narrow TypeScript augmentation for iOS. Subscribe to media-query changes and clean up the listener.

`navigator.onLine` and the `online`/`offline` events are connectivity hints only. Never label them as proof that a backend is available. Clean up all browser listeners.

Do not depend on `beforeinstallprompt`. It is not available across all relevant browsers, including the normal iOS installation flow. Installation guidance, if shown, must be platform-appropriate and must not block the mock.

## Cache policy

The service worker is a delivery cache, not application storage.

Allowed precache:

- the Vite HTML entry;
- hashed JavaScript and CSS bundles;
- local fonts;
- PWA icons and favicon;
- static, synthetic visual assets required by the mock.

Prohibited cache or queue:

- every API or RPC response, regardless of strategy;
- audio or media captured from a person;
- transcripts, captions produced at runtime, and conversation state;
- longitudinal-memory artifacts or private account content;
- POST requests or mutation queues;
- analytics, telemetry, notification subscriptions, and install identifiers.

Do not copy generic `NetworkFirst`, `StaleWhileRevalidate`, background-sync, push, or share-target examples into Amarelo. A future remote feature requires its own approved data and cache decision.

## Offline behavior

The already-loaded static mock must reopen from the generated shell offline. It may continue deterministic local UI transitions because those have no external meaning.

Offline UI must not claim:

- that audio is being captured or delivered;
- that Ana is connected to an external runtime;
- that a conversation was saved or synchronized;
- that memory was created;
- that an external endpoint is reachable.

Do not add a second hand-authored `offline.html` unless a real uncached navigation requirement proves it necessary. The one-screen Vite shell is the approved fallback.

## Mobile layout requirements

- Use `100dvh`, not a fixed mockup height.
- Apply `env(safe-area-inset-top)`, `right`, `bottom`, and `left` around edge controls.
- Keep practical touch targets and visible keyboard focus.
- Honor `prefers-reduced-motion`.
- Verify both normal browser display and installed standalone display.
- Design portrait-first, but preserve the complete experience and controls in landscape; do not lock orientation in the manifest or application code.
- Keep the Orb and transcript in one visual group so free viewport height cannot push the transcript away from the Orb.
- Default the local presentation to `speaking`. Render five ordered synthetic utterances with `@repo/react/ui/scroll-reveal-paragraph`, and keep all five available to assistive technology.
- Map zero or muted audio to Orbz `idle`; restoring audible volume maps Orbz to `listening`.
- Do not render phone hardware, a notch, or a fake status bar.

## Verification workflow

Follow repository policy and stop if a command reveals an unrelated destructive change.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
pnpm --filter mobile preview
```

Run the root `pnpm build` immediately before previewing or starting the production surface; do not rely on a pre-existing `apps/mobile/dist`. `preview` is a long-running readiness check; stop it after the server is ready and inspection is complete.

Inspect manually:

1. generated manifest fields and every referenced icon;
2. service-worker registration and update prompt behavior;
3. precache contents, confirming that no runtime API/content cache exists;
4. first load online, reload offline, and return online;
5. standalone detection and safe areas on iOS-sized viewports;
6. light and dark themes;
7. default `speaking`, the five ordered synthetic utterances, and `?state=listening`, `speaking`, `muted`, and `ended`;
8. zero/muted audio to `idle`, restored audio to `listening`, and keyboard/screen-reader semantics for controls and the complete ordered transcript, including its decorative fade;
9. portrait and landscape layout, with the transcript kept directly below the Orb;
10. no unexpected network calls or console errors.

Do not add or run Lighthouse automation, unit tests, integration tests, smoke tests, browser automation suites, Playwright, or Cypress under the current verification policy. A production build proves compilation, not correct installation or visual behavior.

## Common failure modes

| Failure | Required correction |
|---|---|
| Wrong package such as `@vite-pwa/vite-plugin` | Use `vite-plugin-pwa` |
| `autoUpdate` reloads an active surface | Use `registerType: "prompt"` and an explicit action |
| API/content `runtimeCaching` copied from a template | Remove it; keep static precache only |
| App works offline but implies a remote conversation | Label the experience as a local synthetic mock |
| `beforeinstallprompt` is the only install path | Support normal browser installation; do not depend on the event |
| State is persisted in service-worker caches | Keep approved preferences in Jotai storage only |
| Manifest paths fail under a deployment prefix | Align Vite base, scope, start URL, and navigation fallback |
| Full transcript disappears under the visual fade | Keep all five utterances in source order as one complete accessible value |
| PWA feature introduces push or background sync | Remove it; it is outside the approved slice |

## Completion report

Report separately:

- what changed;
- which checks passed;
- which manual PWA behaviors were inspected;
- any browser/device limitation;
- what remains intentionally unimplemented.

Never describe this mock as proof of production voice, persistence, synchronization, or external-service behavior.