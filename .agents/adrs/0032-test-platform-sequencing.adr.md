# ADR 0032: Sequence automated testing with Vitest before critical Cypress scenarios

## Status

Superseded on 2026-09-04 by ADR-0035, after the owner approved the first
Fastify/Vitest slice and the integration-test boundary.

## Context

Amarelo has deterministic evals and a Kubernetes Cypress runtime smoke Job, but no product-wide automated test platform policy. Adding broad browser coverage before concrete critical journeys are selected would create expensive, low-signal maintenance. Conversely, waiting to establish any boundary would leave the Fastify health seam, runtime orchestration, and future tests without a shared direction.

## Decision

Vitest is the first general-purpose test platform for Node/Fastify behavior and shared TypeScript logic. Cypress remains the browser/runtime end-to-end runner and is limited to selected critical interface journeys plus explicit runtime availability checks.

The initial API liveness seam is `GET /health`. `elo runtime e2e` must bring the runtime up, wait for its Kubernetes checks, and then run Cypress headlessly against the running containers. A database test seed, test data lifecycle, exact Vitest suites, and critical interface scenarios require a later approved delivery spec before implementation or CI gating.

## Consequences

- Unit/integration behavior has a designated first runner without claiming that broad coverage already exists.
- Cypress remains high-value and sparse rather than becoming a substitute for every UI assertion.
- Existing runtime Cypress smoke behavior can evolve around health/readiness without deciding product journey coverage prematurely.
- No Vitest dependency, test suite, seed mechanism, or new CI gate is introduced solely by this ADR.
