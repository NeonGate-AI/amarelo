# Mobile workflow context

Mobile is the installable React/Vite PWA and the future voice-first integration surface for Conversation and Memory Nucleus economics.

The default product path remains the local voice-first presentation. SPEC-047 succeeds SPEC-009's bounded development/test text seam only when `VITE_AMARELO_TEXT_DRIVER` is exactly `true`. Without that explicit flag, the text form is not rendered and the existing product surface is unchanged.

When enabled, Mobile constructs the browser-safe `@repo/conversation-sdk` client, requests a server-issued session, then sends a synthetic text turn to Chatterbox. `ConversationSessionService` retains the session and bounded untrusted history in memory. Expiry causes a new session; safe authentication/ownership failures clear the local session and history. Only the server establishes ownership, purpose and current time. The browser sends neither tenant/subject authority nor purpose/asOf.

`ConversationSessionService` emits pending, succeeded, failed or aborted events. A new submission aborts the previous request; late or superseded responses cannot render, including session acquisition races. SDK cancellation includes response-body consumption. Safe API failures may be displayed, while unknown provider/internal errors are replaced with generic PT-BR copy. UI cancellation does not guarantee termination of provider work already in flight.

Conversation IDs, messages, responses, captions, request state and failures remain in memory only. The bounded driver does not add them to local storage, session storage, Cache Storage, Workbox runtime caching or durable history. Theme and volume remain the only approved persisted preferences. `/api` uses same-origin credentials through Vite's development/preview proxy; API paths are excluded from navigation fallback and runtime caching. The browser never imports or reads a WorkOS/provider secret.

For local login, environment files, shared-hostname cookies, text startup and Realtime setup, follow `workspaces/apps/mobile/readme.md`. Both experiments require onboarding's existing WorkOS session and Chatterbox's exact-origin allowlist. `pnpm dev:text` runs the three local processes without the optional Memory infrastructure. The same hostname requirement concerns browser URLs, not the proxy's internal target.

Deterministic Mobile evals cover configuration gating, server session reuse/reset, safe failure, cancellation, overlapping requests, stale-result rejection and persistence/cache absence without binding a network port. They do not establish live WorkOS/provider/browser readiness. SPEC-016 owns the later Memory bridge; the present text path writes no Memory.

## Scoped engineering procedures

For interface/state changes, load `.agents/skills/frontend-ui-engineering/SKILL.md` and `.agents/skills/accessibility/SKILL.md`. For manifest, installation, shell caching or updates, load `.agents/skills/pwa-development/SKILL.md`. Automated seams follow `.agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md`; the former static-only test prohibition is retired.
