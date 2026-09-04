# Mobile

Installable React/Vite PWA for Amarelo's voice-first product experience. The default surface remains voice-first and persists only the approved theme and volume preferences.

SPEC-009 provides a bounded synthetic text driver for engineering validation. It is rendered only when `VITE_AMARELO_TEXT_DRIVER=true`; local development may route `VITE_CONVERSATION_API_URL=/api` through the Vite proxy to `conversation-api`. Messages, responses, request state, and errors remain ephemeral and are excluded from service-worker runtime caches.

```sh
pnpm --filter mobile typecheck
pnpm --filter mobile test
pnpm exec turbo run build --filter=mobile
```

Canonical product behavior remains in `.agents/specs/003-mobile-voice-experience.spec.md`; the bounded integration contract is `.agents/specs/023-first-ana-pwa-conversation-baseline.spec.md`.
