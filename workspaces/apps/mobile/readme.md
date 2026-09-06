# Mobile

Installable React/Vite PWA for Amarelo's voice-first product experience. The default surface remains voice-first and persists only the approved theme and volume preferences.

SPEC-047 adds authenticated, observable development text to the SPEC-009 baseline. It is rendered only when `VITE_AMARELO_TEXT_DRIVER=true`. The browser-facing `VITE_CHATTERBOX_URL=/api` uses the same-origin Vite proxy, while server-only `CHATTERBOX_URL` selects Chatterbox. The SDK obtains an owned server session before sending a turn. Messages, responses, identifiers and errors remain in memory and are excluded from service-worker runtime caches.

## Run the authenticated text slice

Use an authorized development WorkOS account and synthetic conversation content. No development login bypass or browser API key exists. Start from an installed repository; no Memory database, Redis, MinIO or Kubernetes cluster is needed for this path.

Create the following ignored local files from their owning templates if the files do not already exist. Preserve any existing local values.

| Local file | Template | Required configuration |
|---|---|---|
| `workspaces/apps/onboarding/.env.local` | `workspaces/apps/onboarding/.env.template` | Existing WorkOS API key/client ID and a cookie password of at least 32 characters. Set `NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3002/api/auth/callback`. |
| `workspaces/microservices/chatterbox/.env` | `workspaces/microservices/chatterbox/.env.template` | The same WorkOS key/client ID/cookie password and cookie name as onboarding; `CHATTERBOX_ALLOWED_ORIGINS=http://localhost:3003`; configured `OPENAI_API_KEY` and `AI_CONVERSATION_MODEL`. |
| `workspaces/apps/mobile/.env.local` | `workspaces/apps/mobile/.env.template` | `VITE_AMARELO_TEXT_DRIVER=true`, `VITE_AMARELO_REALTIME_VOICE=false`, `VITE_CHATTERBOX_URL=/api`, `CHATTERBOX_URL=http://127.0.0.1:3004`. |

For this local driver only, also set `NEXT_PUBLIC_CONSOLE_URL=http://localhost:3003` in onboarding's `.env.local` so its existing post-login redirect opens Mobile. This development redirect does not change the Console workspace. Leave `WORKOS_COOKIE_DOMAIN` empty for host-only local cookies; if you customize `WORKOS_COOKIE_NAME`, configure the same name on both servers. Register the exact callback URL above in the existing development WorkOS application when using the callback flow.

All WorkOS secrets and provider credentials belong only in the server files. Mobile receives the existing sealed HttpOnly cookie automatically; never copy its value into JavaScript, `VITE_*`, logs or storage. The origin allowlist accepts exact HTTP(S) origins without a trailing slash or wildcard; an empty list fails closed.

From the repository root:

```sh
pnpm dev:text
```

Open `http://localhost:3002/sign-in`, complete the existing login, and open `http://localhost:3003` in the same browser. Keep `localhost` for both browser addresses: cookies are hostname-bound, so switching one address to `127.0.0.1` loses this session. The proxy's internal `127.0.0.1:3004` target is server-to-server and does not change the browser hostname.

Send one synthetic turn. On authentication expiry, log in again through onboarding. A server restart or conversation expiry invalidates the ephemeral conversation; submit again after the safe failure to obtain a new session. Client cancellation and late-response rejection protect the UI, but do not promise cancellation of provider work already running on the server.

## Opt-in Realtime experiment

SPEC-032's WebRTC experiment uses the same login, origin allowlist and server credentials above; SPEC-047 also protects `/api/v1/realtime/session`. In Mobile's local configuration, disable `VITE_AMARELO_TEXT_DRIVER` and enable `VITE_AMARELO_REALTIME_VOICE`, then restart the same development command:

```sh
pnpm dev:text
```

After signing in, open `http://localhost:3003`, choose **Iniciar voz**, and allow microphone access. The synthetic `check_calendar` tool does not read a real calendar. `AI_CONVERSATION_MODEL` remains required by the shared provider composition even though the Realtime model is configured separately in the server adapter. Audio, SDP and Realtime events are transient, not runtime-cached. This experiment is not the voice-to-core or Memory bridge.

## Limits and observations

Chatterbox owns short-lived conversations, principal/session ownership, exact-origin checks, request limits and a content-free structured observation sink. Limits are process-local development protection, not distributed entitlements or production abuse prevention. Browser history is bounded untrusted context, not canonical evidence or a Memory write. No personal Memory retrieval or persistence is enabled; SPEC-016 owns that next bridge.

The SDK sends same-origin credentials and disables response caching/redirects. The PWA resets local session/history after safe authentication or ownership failures. On the server, observations use server-generated correlation IDs and allowlisted outcomes, latency, routing, Memory diagnostics and nullable usage; missing usage is unknown, never zero. Request content, cookies and raw exceptions are excluded.

Automated tests use synthetic identity/model seams. A live WorkOS login, paid provider request, browser journey or deployed PWA must be verified separately with authorized development credentials; the local test suite does not claim those gates passed.

## Validate

```sh
pnpm --filter mobile typecheck
pnpm --filter mobile test
pnpm --filter @repo/conversation-sdk test
pnpm --filter chatterbox test
pnpm exec turbo run build --filter=mobile
```

Canonical product behavior remains in `.agents/specs/003-mobile-voice-experience.spec.md`. Current authentication and observation behavior belongs to `.agents/specs/047-vertical-slice-textual-autenticado-observavel.spec.md`; `.agents/specs/023-first-ana-pwa-conversation-baseline.spec.md` preserves the pre-Memory baseline and `.agents/specs/032-realtime-2-webrtc-voice-agent.spec.md` records the Realtime experiment.
