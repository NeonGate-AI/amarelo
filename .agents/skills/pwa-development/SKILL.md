---
name: pwa-development
description: Build or review Amarelo Mobile installation, manifest, static-shell caching and safe service-worker updates.
user-invocable: false
---

# Amarelo PWA development

Applies to `workspaces/apps/mobile`. Read `.agents/context/workflows/mobile.md`, the active spec, `.agents/adrs/0006-mobile-react-vite-pwa.adr.md` and `.agents/rules/008-product-safety-and-privacy.rule.md`.

## Delivery boundary

- Preserve React/Vite, Jotai and the existing `vite-plugin-pwa` generated Workbox service worker.
- Use `generateSW`, `registerType: "prompt"` and one registration bridge. An update requires a deliberate user action; avoid reloading an active conversation.
- Align Vite base, manifest scope/start URL and navigation fallback with the deployment path.
- Preserve PT-BR metadata, standalone display, readable 192/512px icons, maskable artwork and Apple touch icon.
- Keep portrait-first layout usable in landscape. Use dynamic viewport height and safe-area insets, visible focus and reduced-motion support.
- Installation detection combines display-mode and the narrow iOS standalone property. Connectivity events are hints, not proof that Chatterbox is reachable; clean up subscriptions.
- `beforeinstallprompt` is not the only installation path. Normal browser installation must remain usable.

## Cache and privacy

The worker caches only the public shell and versioned static build assets. Keep Workbox runtime caching empty. API/RPC responses, session tokens, captured audio, transcripts, conversations, Memory and personal account data are never cache entries or background-sync payloads.

Only theme and volume preferences may be persisted by approved application state. Connected text and Realtime behavior are owned by their specs, not by PWA infrastructure. Do not add push, background sync, file/share/protocol handlers or new telemetry merely while changing installation.

An offline shell can reopen; it cannot imply that Ana is connected, a turn was delivered, audio was captured, or Memory was saved. Gate external actions on their real service/session state.

## Verification

Run the Mobile focused evals/tests, typecheck and build specified by the active contract. Inspect the generated manifest, referenced icons and exact precache set. Follow `.agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md` for automated seams.

When browser/device access is available, verify online→offline→online behavior, update prompt, standalone display, safe areas, orientation and accessible controls. Record unavailable device checks rather than claiming them. A build proves compilation, not installation or voice behavior.

For interactive accessibility, load `../accessibility/SKILL.md`.
