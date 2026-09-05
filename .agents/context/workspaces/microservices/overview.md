# Microservices workspace

`workspaces/microservices/` is the structural parent for independently deployable network services. It owns no `package.json`, `tsconfig.json`, or `src/`; each child is a direct workspace discovered by `workspaces/microservices/*`.

Chatterbox is the first service at `workspaces/microservices/chatterbox/`. It is the Node/Fastify transport and provider-composition boundary for Conversation. It exposes a process liveness endpoint at `GET /health`, preserves safe HTTP contracts, and composes server-only dependencies. It does not own AI routing, Ana behavior, browser UI, browser-safe SDK contracts, or Memory Nucleus internals.

Every Microservices child launched by the Kubernetes runtime owns its Dockerfile and `.env.template`. Current ownership and trade-offs are recorded in `.agents/adrs/0030-microservices-chatterbox-boundary.adr.md` and `.agents/adrs/0031-project-owned-container-images.adr.md`.

Chatterbox tests route behavior with Vitest through Fastify `app.inject()`.
`GET /health` is process liveness only and therefore contacts no provider or
infrastructure dependency. Testcontainers is reserved for a concrete external
adapter; Cypress owns only full-runtime checks and critical browser journeys.

For any request, session, provider or personal-context change, load `.agents/rules/008-product-safety-and-privacy.rule.md` before implementation. SPEC-047 owns the bounded authenticated/observed text seam; SPEC-016 later binds the public Memory SDK at this server composition root. Memory consent and private scope remain separately authorized.

## Authenticated composition

Production composition verifies onboarding's existing WorkOS sealed HttpOnly session with the locked Node SDK. The caller's signed subject, authentication session and organization determine server identity; no client-supplied tenant/subject, impersonation or trusted proxy header supplies authority. Missing configuration, an expired/invalid identity or uncertain resolver outcome fails closed. Browser POST requests require an exact configured Origin. The existing Realtime paid-provider endpoint uses the same guard.

`POST /v1/conversation/session` issues an opaque conversation ID and expiry. A bounded process-local registry binds it to the verified owner and authentication session; a restart or expiry loses that session. `POST /v1/conversation/turn` validates the SDK contract and rechecks ownership before provider work. Chatterbox derives `purpose: conversation.support` and `asOf` from its server clock, exposing `AuthenticatedConversationContext` only at its composition root. SPEC-016 will bind a request-scoped Memory SDK adapter there; it does not inherit permission to treat client history as canonical evidence.

Session count, authenticated request rate, authentication work and provider concurrency are bounded locally. These are development limits, not distributed entitlement or production-abuse guarantees. For precise keys, defaults and local login instructions, read `workspaces/microservices/chatterbox/.env.template`, `workspaces/microservices/chatterbox/src/configuration/chatterbox-environment.validate.ts` and `workspaces/apps/mobile/readme.md`.

## Observation boundary

The production composition supplies a structured sink through `@repo/observability`; the application factory may inject a synthetic sink for tests. A closed schema permits only the request operation/outcome, server-generated trace ID, latency, lane, Memory status/failure and nullable usage. Content, identity IDs, IPs, headers/cookies, SDP and raw exceptions are excluded; automatic request/error logging stays disabled. Sink delivery is bounded and falls back only to a fixed content-free telemetry-failure diagnostic. Telemetry failure does not alter authorization or recursively log errors.

Fastify injection, SDK/identity/model doubles and captured sentinel-free observations provide deterministic evidence. Live WorkOS login, provider usage, browser journeys and deployment remain separate unexecuted gates unless an explicit run records them.

Non-health responses expose the opaque server correlation ID in `x-chatterbox-trace-id`, matching the structured event. Incoming correlation headers cannot choose that ID; the body retains the caller's separately validated `requestId` for SDK matching.
