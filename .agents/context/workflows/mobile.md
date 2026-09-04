# Mobile workflow context

Mobile is the installable React/Vite PWA and the future voice-first integration surface for Conversation and Memory Nucleus economics.

The default product path remains the local voice-first presentation. SPEC-009 adds one bounded development/test text seam only when `VITE_AMARELO_TEXT_DRIVER` is exactly `true`. Without that explicit flag, the text form is not rendered and the existing product surface is unchanged.

When enabled, Mobile constructs the browser-safe `@repo/conversation-sdk` client and sends a synthetic text turn to `conversation-api`. `ConversationSessionService` owns request lifecycle and emits only pending, succeeded, failed, or aborted events. A new submission aborts the previous request; late or superseded responses cannot render. Safe API failures may be displayed, while raw provider/internal errors are replaced with generic PT-BR copy.

Conversation IDs, messages, responses, captions, request state, and failures remain in memory only. The bounded driver does not add them to local storage, session storage, Cache Storage, Workbox runtime caching, or durable history. Theme and volume remain the only approved persisted preferences. The local Vite `/api` proxy exists only for development and does not move credentials into the browser.

Deterministic Mobile evals cover configuration gating, success, safe failure, cancellation, overlapping requests, stale-result rejection, and persistence/cache absence without binding a network port.
