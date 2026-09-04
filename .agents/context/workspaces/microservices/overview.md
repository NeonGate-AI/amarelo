# Microservices workspace

`workspaces/microservices/` is the structural parent for independently deployable network services. It owns no `package.json`, `tsconfig.json`, or `src/`; each child is a direct workspace discovered by `workspaces/microservices/*`.

Chatterbox is the first service at `workspaces/microservices/chatterbox/`. It is the Node/Fastify transport and provider-composition boundary for Conversation. It exposes a process liveness endpoint at `GET /health`, preserves safe HTTP contracts, and composes server-only dependencies. It does not own AI routing, Ana behavior, browser UI, browser-safe SDK contracts, or Memory Nucleus internals.

Every Microservices child launched by the Kubernetes runtime owns its Dockerfile and `.env.template`. Current ownership and trade-offs are recorded in `.agents/adrs/0030-microservices-chatterbox-boundary.adr.md` and `.agents/adrs/0031-project-owned-container-images.adr.md`.

Chatterbox tests route behavior with Vitest through Fastify `app.inject()`.
`GET /health` is process liveness only and therefore contacts no provider or
infrastructure dependency. Testcontainers is reserved for a concrete external
adapter; Cypress owns only full-runtime checks and critical browser journeys.
