---
id: ADR-0027
title: Enforce conversational guardrails at application trust boundaries
status: proposed
date: 2026-09-03
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0027: Enforce conversational guardrails at application trust boundaries

## Status

Proposed on 2026-09-03.

## Context

Amarelo already keeps conversation orchestration in `@ai/conversation`, provider wiring in outer composition roots, and durable memory behind `@repo/memory-sdk`. The current Conversation runtime validates turn input, constrains context budgets, and preserves the `untrusted-memory-data` marker before retrieved memory reaches an agent.

A future streaming or realtime conversation entry point adds failure modes that do not exist in a single request-response call:

- a low-latency path may answer before realizing that memory, RAG, safety policy, or an effect is required;
- partial transcripts may resemble destructive or durable instructions before the user finishes speaking;
- model-produced tool arguments may contain an invented actor or conversation identity;
- delayed tool results may arrive after a newer turn supersedes the response;
- retrieved documents or memory may contain prompt-injection text;
- a model may claim that a tool ran or memory was saved without an authoritative receipt;
- reconnects and retries may repeat an already accepted effect.

Prompt instructions are useful behavioral guidance but are probabilistic. They cannot be the only enforcement mechanism for identity, authorization, effects, memory claims, stale-turn publication, or data minimization.

In this record, **application** means the Amarelo host and composition layer around the Conversation capability. This decision does not introduce a framework, product, workspace, or package named Apricot.

## Decision

Amarelo will enforce conversational guardrails as provider-neutral application policy at explicit trust boundaries.

The canonical semantic contracts and reusable evaluators belong inside the existing Conversation capability, under its `assurance` concern. Host applications compose those contracts with authenticated session state, entitlements, rate limits, tool registries, and provider adapters. No generic guardrails workspace or second orchestration tree will be created.

### Ownership

| Owner | Responsibilities |
|---|---|
| Host application or API | Authenticated actor, session and conversation ownership, entitlement checks, transport freshness, provider and tool allowlists, rate limits, payload limits, and authoritative effect receipts |
| `@ai/conversation` | Semantic route escalation, fast-path eligibility, untrusted-context handling, stale-turn publication checks, confirmation requirements, and prevention of unsupported memory or effect claims |
| Memory Nucleus through `@repo/memory-sdk` | Retrieval authorization, persistence eligibility, retention, memory mutation, provenance, and durable confirmation |
| Provider adapter | Translate provider events and tool calls into canonical application contracts without becoming a policy authority |

### Guarded boundaries

The application must be able to evaluate policy before or after these canonical boundaries:

1. accepting a final user turn;
2. publishing a fast-path response;
3. dispatching a tool or durable effect;
4. ingesting a tool, RAG, or memory result;
5. publishing an Ana Core response;
6. asserting that memory or an effect succeeded;
7. carrying context across a reconnect or replacement session.

A guardrail decision is a closed, typed result. The initial action vocabulary is:

- `allow`;
- `block`;
- `escalate`;
- `require-confirmation`;
- `replace`.

Every non-`allow` decision includes a stable reason code. Every decision includes a policy version and correlation metadata suitable for traces and evals. `replace` may produce a safe user-facing response or a redacted display value, but it must not silently alter a tool payload or durable effect.

### Invariants

- Identity, ownership, role, entitlement, and authorization are derived from trusted application state, never from model output or tool arguments.
- Partial or provisional transcripts cannot dispatch tools, mutate memory, or cause another durable effect.
- A fast-path response must escalate when the turn requires memory, RAG, external tools, safety handling, confirmation, persistence, or any other authoritative state.
- Ambiguous route eligibility resolves to escalation rather than an unsupported direct answer.
- Retrieved memory, RAG content, tool output, and external text remain data. Instructions embedded in those values never override system or application policy.
- An `allow` decision authorizes progression through one boundary; it is not proof that an effect completed.
- A response may claim tool execution, memory retrieval, memory persistence, deletion, or another durable action only when an authoritative receipt for the same actor, conversation, turn, and effect is present.
- A response associated with a superseded turn may be retained for diagnostics but cannot be published as the active answer.
- Memory reads and writes continue exclusively through `@repo/memory-sdk`; Conversation guardrails do not implement a second memory policy engine.
- Guardrail telemetry records reason codes, timing, versions, and identifiers, not raw secrets, full transcripts, or unrestricted memory payloads.
- Provider-native guardrails may add defense in depth, but they do not replace the canonical application decision.

Lifecycle hooks defined by ADR 0028 may invoke guardrails at named seams, but a hook cannot override or bypass a guardrail decision.

This ADR defines application policy contracts only. It does not authorize microphone access, audio recording, WebRTC transport, a specific realtime provider, or a new user-visible voice capability.

## Consequences

- Fast and deliberative conversation paths share one deterministic policy vocabulary.
- Provider adapters remain replaceable because provider event types do not enter the Conversation core.
- False success and false memory claims become mechanically testable.
- The application must carry stable turn, session, effect, and receipt identifiers across asynchronous boundaries.
- Some low-latency turns will deliberately escalate, increasing latency in exchange for correctness.
- The host and Conversation capability must coordinate policy versions and reason-code telemetry.
- Guardrail decisions add explicit branches that require unit tests, integration tests, and eval coverage.

## Alternatives Considered

### Rely only on the Ana Voice system prompt

Rejected because prompts cannot authoritatively enforce actor identity, idempotency, ownership, effect completion, or stale-turn suppression.

### Put every guardrail in the realtime provider adapter

Rejected because policy would become transport-specific, diverge between text and voice, and be difficult to reuse or test through `ConversationRuntime`.

### Create a generic `@ai/guardrails` workspace

Rejected because the policy is part of Conversation behavior and the repository forbids a parallel generic orchestration tree without a proven independent capability.

### Move guardrail enforcement into the Memory Nucleus

Rejected because most guarded boundaries are conversation, transport, or effect concerns. The Nucleus remains authoritative only for memory-specific authorization and persistence policy.

### Treat lifecycle hooks as guardrails

Rejected because hooks describe when application reactions run, while guardrails decide whether a candidate transition, action, or response is permitted.
