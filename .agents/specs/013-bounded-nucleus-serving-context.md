---
id: SPEC-011
title: Inject bounded Memory Nucleus context into Conversation serving
type: experiment
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/ai/orchestrator/conversation
  - workspaces/apps/conversation-api
  - workspaces/packages/memory-sdk
  - Memory serving assurance
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/ai/conversation.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/context-engineering.md
  - .agents/rules/memory-nucleus.md
  - .agents/rules/product-safety-and-privacy.md
  - .agents/rules/spec-driven-development.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.md
  - .agents/adrs/0003-authorization-before-retrieval.md
  - .agents/adrs/0008-cost-first-background-memory-curation.md
  - .agents/adrs/0011-memory-platform-and-sdk.md
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/tdd
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/code-review
evidence:
  - pending
---

# SPEC-011: Inject bounded Memory Nucleus context into Conversation serving

## Problem Statement

A real Ana turn without longitudinal context proves transport and agent execution but does not prove the Memory Nucleus serving thesis. Replaying transcripts or growing chat history would make input cost increase with user history and would bypass the Nucleus authorization, policy, provenance and token-budget boundaries.

Conversation already has a `MemoryContextProvider`, and `@repo/memory-sdk` already defines a structured projection with a 600-token maximum and diagnostics that require zero model, vector and web calls for the MVP retrieval path. These pieces are not yet part of a real model invocation.

## Solution

Before Ana is invoked, Conversation deterministically selects a cognitive lane and memory budget, requests an authorized Memory Nucleus projection through `@repo/memory-sdk`, and injects only the returned structured untrusted context into the model input.

The PWA remains unaware of raw memory records. The Fastify application resolves tenant, subject, actor and purpose from a server-owned experiment identity boundary, composes the Memory client, and returns only redacted diagnostics needed to evaluate context use.

The same synthetic turn is evaluated against two serving modes: baseline bounded conversation context and Nucleus-projected context. The comparison measures tokens and quality without presenting projected savings as production ROI.

## User Stories

1. As a returning user, I want Ana to recall an authorized relevant fact from a prior synthetic record, so that the conversation demonstrates continuity without replaying the transcript.
2. As a user, I want irrelevant or expired memory omitted, so that old context does not distort the current conversation.
3. As a privacy reviewer, I want authorization resolved before repository access and exposure, so that identity cannot be inferred from a client-supplied memory query alone.
4. As a support-network user, I want a purpose-specific projection, so that patient-private memory is not automatically shared across roles.
5. As a cost engineer, I want a hard memory token budget, so that longitudinal history does not create proportional prompt growth.
6. As an AI maintainer, I want memory treated as untrusted data, so that retrieved text cannot become system instructions.
7. As a runtime maintainer, I want deterministic routing to decide whether memory is requested, so that retrieval does not require another reasoning call.
8. As an operator, I want request IDs, used memory tokens and omission diagnostics, so that retrieval behavior is auditable without logging sensitive content.
9. As a user, I want the conversation to continue safely when optional retrieval infrastructure is unavailable, so that a transient memory outage does not fabricate context.
10. As a governance reviewer, I want denied authorization to fail closed, so that availability never overrides privacy.
11. As an evaluator, I want a baseline-versus-Nucleus comparison on synthetic fixtures, so that token savings and answer quality can be measured together.
12. As a product owner, I want no production ROI claim until provider pricing, usage and infrastructure cost are measured from real operation.

## Scope

This experiment owns:

- deterministic implementation of the existing Conversation routing contract;
- memory search input construction from server-owned identity, purpose and lane budget;
- invocation of `MemoryContextProvider` before Ana model execution when the route permits it;
- a stable structured formatting boundary for untrusted memory projections;
- server composition for an approved Memory client implementation;
- redacted retrieval and serving usage telemetry;
- synthetic retrieval fixtures covering semantic and episodic memory;
- baseline and Nucleus serving evaluations for token usage and behavioral quality;
- safe behavior for authorization denial, empty retrieval and technical unavailability;
- harness promotion after successful validation.

## Implementation Decisions

- Memory Nucleus remains the sole longitudinal personal-memory authority.
- Conversation consumes it only through `@repo/memory-sdk`.
- Authorization precedes repository retrieval and context exposure.
- The route selects a memory budget at or below the SDK maximum of 600 estimated tokens.
- Retrieval itself performs no LLM, vector or web call in this experiment.
- Memory data is serialized into a delimited, typed context block that explicitly cannot override system or agent instructions.
- Ana does not receive repository entities, consent ledgers or authorization internals.
- Identity, actor, tenant, subject and purpose are resolved on the server; the browser cannot claim arbitrary memory scope.
- An authorization denial is a fail-closed error.
- An empty authorized result is normal and invokes Ana without longitudinal context.
- A technical retrieval outage may fail soft only when policy classifies memory as optional for the selected lane; the response records degraded context without fabricating memory.
- Telemetry records counts, budgets, timing, IDs and hashes, not raw memory content.
- Baseline comparison uses a bounded representative context fixture rather than an unbounded transcript dump.

## Testing Decisions

### Primary seam

The primary seam is the public Conversation runtime invoked with synthetic authorized Memory clients and a deterministic fake chat model. Tests observe the final model input and normalized result without reaching into Memory Nucleus internals.

### Secondary seams

- Fastify identity/purpose mapping and redacted diagnostics.
- `@repo/memory-sdk` projection and token-budget assurance.
- deterministic routing policy table.
- baseline-versus-Nucleus evaluation runner.
- deny, empty and unavailable retrieval branches.

### Fixtures and privacy

All fixtures are synthetic and must include distinct tenants, subjects, actors and purposes to test isolation. No production transcript or personal memory is permitted. Logs and snapshots must redact content by default.

### Required validation

- red-first tests at the Conversation public seam;
- SDK and Memory Nucleus existing evals;
- authorization and cross-subject isolation tests;
- token-budget and prompt-injection-resistance tests;
- baseline/Nucleus token and quality evaluation;
- Fastify and Mobile integration regression tests;
- full audits, typecheck, tests, evals and build;
- Standards and Spec review.

## Acceptance Criteria

- [ ] A real Ana turn can use an authorized relevant synthetic Memory Nucleus projection.
- [ ] The model receives no raw transcript replay as longitudinal memory.
- [ ] Memory context never exceeds the selected budget or the 600-token SDK maximum.
- [ ] Retrieval diagnostics report zero model, vector and web calls for the experiment path.
- [ ] Authorization is resolved before repository access/exposure and cross-subject access is rejected.
- [ ] Purpose-specific views prevent unauthorized support-network exposure.
- [ ] Retrieved memory is marked and handled as untrusted data.
- [ ] Empty retrieval invokes Ana normally without fabricated context.
- [ ] Authorization denial fails closed; optional technical outage follows explicit degraded behavior.
- [ ] Telemetry contains no raw memory content.
- [ ] Baseline and Nucleus modes report comparable serving input, memory tokens, quality outcome and request correlation.
- [ ] Results are labeled experimental and do not claim production ROI.
- [ ] Full repository CI and both review axes pass.
- [ ] Durable serving behavior is promoted to the harness.

## Failure Behavior

- Invalid or client-controlled identity scope is rejected before Memory access.
- Denied, expired or malformed authorization prevents model invocation when protected memory was requested.
- Memory projection validation failure discards the projection and records a safe error; it is never appended as unchecked prompt text.
- Technical unavailability either returns a normalized failure or invokes a declared degraded no-memory path according to lane policy.
- A budget overrun fails the test and prevents release rather than silently truncating outside the SDK contract.
- Suspected instruction text inside a memory item remains data and cannot alter system/tool policy.

## Out of Scope

- Forming new memory from the live conversation.
- Queues, Redis and worker deployment.
- Vector retrieval or reranking.
- Unbounded thread history.
- Support-network product UI.
- Authentication and production authorization provider integration.
- Voice transport.
- Production cost, latency or clinical claims.

## Evidence and Promotion

Planned evidence:

- Conversation tests that inspect the fake model input;
- Memory SDK budget and authorization evals;
- synthetic baseline/Nucleus experiment output;
- redacted request traces;
- full CI and independent review axes.

After success, promote serving responsibilities to Conversation context and behavior specs, Memory boundary guarantees to the existing Memory spec/rules only where new behavior is proven, and measurable checks to assurance or mechanical validation.

## Further Notes

This spec is blocked by `SPEC-009`. Its branch remains contract-only until the first real conversation is accepted. The experiment tests the serving half of Memory Nucleus; it does not yet create memory from a completed PWA conversation.
