---
id: SPEC-033
title: Define conversation lifecycle hooks and realtime edge-case semantics
type: feature
status: draft
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/ai/conversation
  - workspaces/apps/conversation-api
  - workspaces/apps/mobile
context:
  - .agents/context/architecture/overview.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/004-import-boundaries.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/007-package-ownership.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0019-ai-orchestrator-topology.adr.md
  - .agents/adrs/0020-conversation-agent-port.adr.md
  - .agents/adrs/0023-direct-ai-conversation-topology.adr.md
  - .agents/adrs/0027-application-conversation-guardrails.adr.md
  - .agents/adrs/0028-conversation-lifecycle-hooks.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/domain-modeling/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/writing-for-agents/SKILL.md
evidence:
  - pending
---

# SPEC-033: Define conversation lifecycle hooks and realtime edge-case semantics

## Problem Statement

The current Conversation runtime is a bounded request-response use case. Future streaming or realtime adapters will introduce overlapping events: the user can interrupt output while a tool is running, a response can arrive after a newer turn, a reconnect can replay a tool call, and a PWA can suspend or expire while work remains in flight.

Without a canonical lifecycle model, provider callbacks and UI state can become accidental sources of truth. One adapter may treat interruption as cancellation of every effect, another may replay effects after reconnect, and a delayed response may be spoken during the wrong turn. A generic event bus would make ordering, ownership, blocking behavior, and failure isolation less explicit.

The application needs typed hooks around one canonical Conversation lifecycle, with stable identifiers, ordering, supersession, cancellation, idempotency, cleanup, and stale-result semantics.

## Solution

Add provider-neutral lifecycle references, transitions, interceptor seams, observer seams, and effect receipts to the existing Conversation runtime boundary. Host and provider adapters translate native events into these canonical commands and project committed lifecycle state back to UI or transport.

A newer final user turn supersedes publication of the previous active response. Interruption stops output but does not pretend that an already dispatched durable effect rolled back. Reconnect creates a new session epoch, duplicate effect requests resolve through idempotency, and results from stale turns remain diagnostic or reconcilable evidence without becoming the active response.

Hooks coordinate reactions. Guardrails from SPEC-032 remain the policy authority and cannot be bypassed by a hook.

## User Stories

1. As a user, I want Ana to stop speaking when I interrupt and respond to my new turn, so that the conversation feels controllable.
2. As a user, I want an interrupted or reconnected session to avoid repeating consequential actions, so that transport instability cannot duplicate effects.
3. As an application maintainer, I want delayed and out-of-order results classified deterministically, so that old responses never appear in the active turn.
4. As an adapter author, I want provider-neutral lifecycle seams, so that WebRTC, streaming text, or another transport can map events without leaking provider types into Conversation.
5. As an operator, I want lifecycle transitions and hook failures correlated by stable identifiers, so that race conditions can be diagnosed without logging sensitive content.

## Scope

- Define canonical session, epoch, turn, response, tool-call, and durable-effect references.
- Define monotonic turn sequencing within a session epoch.
- Define typed lifecycle transitions for turn acceptance, supersession, response start, response interruption, effect dispatch, effect settlement, reconnect, and session end.
- Define blocking lifecycle interceptors separately from non-authoritative observers.
- Invoke SPEC-032 guardrails from required pre-transition seams without changing their decisions.
- Define interruption, cancellation, supersession, late-result, reconnect, duplicate-delivery, and cleanup semantics.
- Require idempotency keys and authoritative receipts for durable effects.
- Prevent stale results from being published to the active response.
- Preserve completed effect receipts for reconciliation after interruption or supersession.
- Add deterministic race tests, adapter contract tests, integration tests, and lifecycle telemetry.
- Preserve current synchronous `ConversationRuntime.execute` behavior while the lifecycle capability is added incrementally.

## Implementation Decisions

### Canonical references

The implementation must model at least these provider-neutral values:

```ts
export interface ConversationSessionRef {
  conversationId: string
  sessionId: string
  sessionEpoch: number
}

export interface ConversationTurnRef extends ConversationSessionRef {
  turnId: string
  turnSequence: number
}

export interface ConversationResponseRef extends ConversationTurnRef {
  responseId: string
}

export interface ConversationEffectRef extends ConversationTurnRef {
  effectId: string
  idempotencyKey: string
  toolCallId: string
}
```

Identifiers use existing repository validation conventions. `sessionEpoch` and `turnSequence` are non-negative integers. The host creates session and transport identifiers; Conversation validates and compares them. Model output cannot select or change these values.

### Lifecycle state

A canonical lifecycle projection must distinguish at least:

- disconnected or not started;
- active session;
- active accepted turn;
- response pending;
- response publishing;
- response interrupted;
- turn superseded;
- effect pending;
- effect settled;
- reconnecting;
- session ended;
- terminal error.

Transport-specific UI states such as `idle`, `listening`, and `speaking` are projections of canonical state. They do not drive the lifecycle.

A session has at most one response eligible for active publication. Effects may remain pending independently of response publication.

### Hook taxonomy

The implementation must expose explicit named seams rather than a stringly typed global event bus.

Required interceptors:

| Interceptor | Purpose |
|---|---|
| `beforeTurnAccepted` | Validate lifecycle freshness and ensure only final input becomes an accepted turn |
| `beforeEffectDispatch` | Validate active turn, session epoch, idempotency state, and invoke the tool/effect guardrail |
| `beforeResponsePublication` | Validate active turn and invoke response-publication guardrails |

Required observers:

| Observer | Purpose |
|---|---|
| `onTurnAccepted` | Project state and emit telemetry after acceptance |
| `onTurnSuperseded` | Cancel old response publication and mark later results stale |
| `onEffectSettled` | Record an authoritative receipt or typed failure |
| `onResponseStarted` | Project publishing state |
| `onResponseInterrupted` | Stop output and project interrupted/listening state |
| `onSessionReconnected` | Record the new epoch and bounded rehydration metadata |
| `onSessionEnded` | Release resources and finalize metrics |

Interceptors return a discriminated `continue`, `reject`, or `supersede` lifecycle result. When they invoke a guardrail, they return or embed the guardrail result without translating a block into success.

Observers cannot authorize actions, mutate a committed transition, publish arbitrary user-visible content, or make a stale turn active.

### Event ordering

- `turnSequence` increases for every accepted final user turn in one `sessionEpoch`.
- Events with an older epoch than the current session are stale.
- Events with the same epoch and a lower turn sequence than the active turn are stale for publication.
- Duplicate events with the same canonical identity are idempotent.
- An event with conflicting data for an existing identity is rejected and traced as an integrity failure.
- Ordering comparisons use canonical fields, not provider timestamps alone.
- Provider timestamps may support diagnostics but cannot make an old event current.

### Turn supersession

Accepting a newer final turn:

1. commits the new turn as active;
2. marks the previous active response as superseded;
3. requests cancellation of generation and playback when supported;
4. prevents future publication from the previous response;
5. leaves already dispatched effects in their current authoritative state;
6. records later results for the old turn as stale evidence or reconciliation input.

Supersession does not erase the prior accepted user message or fabricate an effect rollback.

### Interruption

An adapter reports an interruption only after it detects a real user or application interruption according to its own approved transport contract. The lifecycle then:

- marks the current response interrupted;
- emits `onResponseInterrupted` once;
- stops additional output publication;
- requests cancellation from cancel-capable read-only operations;
- waits for a separate final input before accepting a new turn;
- never resumes the cancelled response automatically.

Noise, provisional VAD signals, or duplicated interruption events must not create multiple state transitions. Transport debounce and detection thresholds belong to the future transport spec; this spec requires idempotent canonical handling once an interruption is reported.

### Effect dispatch and settlement

A durable effect can be dispatched only when:

- its session epoch and turn are current at dispatch time;
- the input is final;
- the host session and actor context remain valid;
- the effect has an idempotency key;
- the applicable SPEC-032 guardrail allows or confirms it.

After dispatch, interruption or session loss does not automatically cancel the effect. The owning capability returns one of:

- accepted and pending;
- completed with authoritative receipt;
- failed before acceptance;
- failed after acceptance with reconciliation required;
- cancellation confirmed;
- status unknown and reconciliation required.

A duplicate idempotency key returns the existing state or receipt and never starts a second effect.

### Late and out-of-order results

A result is matched against session, epoch, turn, tool call, effect, and request identifiers before publication.

- A stale read-only result may be discarded after telemetry.
- A stale completed durable-effect result retains its receipt for reconciliation.
- A stale result cannot be attached to the active turn merely because its text appears relevant.
- A newer turn may explicitly request reconciliation through Ana Core; the application never splices the old result into the new response automatically.
- Two out-of-order results are settled independently and published only if each remains eligible.

### Reconnect and rehydration

A reconnect:

- creates a new `sessionEpoch`;
- obtains new transport credentials through the owning host;
- bounds retry attempts;
- preserves `conversationId`;
- does not blindly copy provider-native session history;
- rehydrates only application-approved recent context;
- retrieves durable context only through `@repo/memory-sdk`;
- preserves authoritative effect receipts and idempotency state;
- treats events from previous epochs as stale.

The host determines whether a new transport session retains the same `sessionId` with an incremented epoch or receives a new `sessionId`; the choice must be consistent and tested. An implementation must not use both conventions nondeterministically.

### Background, expiration, and shutdown

When the host reports suspension, expiration, revocation, navigation away, or explicit end:

- no new turn or effect is accepted after the terminal transition;
- output publication stops;
- transport resources, listeners, timers, and cancellation controllers are released;
- in-flight effects remain queryable by idempotency key;
- any unknown effect state is marked for reconciliation;
- observers receive only redacted lifecycle metadata;
- duplicate end events are idempotent.

Background capture, microphone behavior, and retry timing are outside this spec and require an approved transport contract.

### Hook failure behavior

- A required interceptor exception becomes a typed lifecycle rejection before transition or dispatch.
- The application never converts an interceptor timeout into `continue`.
- An observer exception is isolated and traced; it cannot undo the committed transition.
- An observer retry is allowed only when the observer contract is idempotent and bounded.
- Critical safety, authorization, ownership, and effect-integrity checks cannot be implemented only as observers.
- Hook handlers cannot call Memory Nucleus internals, provider SDKs from Conversation core, or arbitrary application services outside declared ports.

### Telemetry

Lifecycle telemetry records:

- event or hook name;
- committed disposition;
- session epoch and turn sequence;
- request, conversation, session, turn, response, tool-call, effect, and trace identifiers when present;
- stale, duplicate, interrupted, superseded, or reconciliation-required flags;
- handler latency and typed failure code;
- adapter kind and contract version.

Telemetry excludes raw audio, credentials, authorization headers, unrestricted transcripts, and full memory or tool payloads.

### Edge-case matrix

| Edge case | Required behavior |
|---|---|
| User interrupts while output streams and a read-only tool is pending | Stop publication, signal cancellation where supported, and keep the new turn independent |
| User interrupts while a durable effect is pending | Stop output; do not claim rollback; settle or reconcile by idempotency key |
| Old Ana Core response arrives after a new final turn | Mark stale and never publish as active |
| Reconnect replays the same tool call | Return existing effect state or receipt |
| Provider emits the same interruption twice | Commit one interruption transition |
| PWA moves to background during a pending effect | End or suspend transport per host policy; preserve effect reconciliation state |
| Session expires before effect dispatch | Reject dispatch |
| Session expires after effect acceptance | Prevent new work and reconcile the accepted effect |
| Observer throws during `onResponseInterrupted` | Keep response interrupted; trace observer failure |
| Interceptor times out | Reject the candidate transition |
| Tool result and response arrive out of order | Correlate independently; publish only current eligible output |
| Two sessions use the same conversation | Keep transient epochs isolated; share only authoritative durable state through the backend |
| Old session event carries a newer wall-clock timestamp | Treat as stale because epoch is authoritative |
| Cancel request races with completed effect receipt | Preserve the completion receipt and report that cancellation did not roll back completion |
| Disconnect occurs before any final transcript | Do not create an accepted Conversation turn |

## Testing Decisions

### Primary seam

Exercise lifecycle behavior through the Conversation runtime or a dedicated public session runtime composed by `conversation-api`. Tests submit canonical commands and observe committed lifecycle projections, hook calls, effect states, guardrail decisions, and publication eligibility.

### Secondary seams

Use deterministic unit tests for epoch and sequence ordering, deduplication, stale classification, and hook failure isolation. Use fake provider and UI adapters to prove native event translation. Use API integration tests for session expiration, actor context, effect receipts, and reconnect behavior.

### Fixtures and privacy

Use synthetic sessions, turns, provider events, tool calls, effect states, transcripts, and receipts. Race tests use controllable promises or a deterministic scheduler. Do not use production conversations, real recordings, real credentials, medical data, or full Memory Nucleus records.

### Required validation

Run relevant Conversation unit tests, API integration tests, adapter contract tests, deterministic race tests, AI evals affected by lifecycle changes, lint, typecheck, build, import-boundary checks, Markdown checks, and the complete repository validation suite. A future implementation PR must provide exact-head evidence and independent review.

## Acceptance Criteria

- [ ] Session, epoch, turn, response, tool-call, and effect references are runtime validated and provider-neutral.
- [ ] `turnSequence` is monotonic within a session epoch.
- [ ] Reconnect creates a deterministic new epoch and old-epoch events remain stale.
- [ ] Only final input can become an accepted effect-capable turn.
- [ ] A session has no more than one response eligible for active publication.
- [ ] A newer accepted turn supersedes publication of the previous active response.
- [ ] Interruption stops output and cannot automatically resume the cancelled response.
- [ ] Interruption does not falsely claim that an accepted durable effect rolled back.
- [ ] Duplicate events and duplicate idempotency keys do not repeat transitions or effects.
- [ ] Delayed and out-of-order results are correlated before publication.
- [ ] A stale read result cannot be published to the active turn.
- [ ] A completed stale durable effect preserves its authoritative receipt for reconciliation.
- [ ] Required interceptor failures reject before transition or dispatch.
- [ ] Observer failures are isolated and cannot mutate committed state.
- [ ] Hooks cannot override SPEC-032 guardrail decisions.
- [ ] Provider-native event types do not enter the Conversation public domain contract.
- [ ] UI states are projections of canonical lifecycle state rather than lifecycle authorities.
- [ ] Session end releases transport-owned resources and rejects new work.
- [ ] Rehydration uses application-approved context and Memory Nucleus only through `@repo/memory-sdk`.
- [ ] Telemetry exposes lifecycle disposition and correlation without raw sensitive content.
- [ ] Deterministic race and edge-case tests pass.
- [ ] Existing synchronous Conversation behavior remains compatible.
- [ ] Application and AI harnesses are updated when implementation changes current behavior.
- [ ] Repository validation and exact-head review evidence pass before promotion to `implemented`.

## Failure Behavior

Malformed references, negative or non-monotonic sequences, conflicting duplicate identities, stale epochs, superseded turns, missing idempotency keys, expired sessions, interceptor failures, or unknown lifecycle commands fail with typed errors and do not dispatch new effects.

Observer failures are traced and isolated. They do not convert committed state, retry indefinitely, or expose sensitive payloads. A result whose freshness cannot be established is not published. An accepted effect whose final state is unknown is marked for reconciliation rather than reported as success or failure without evidence.

If a transport cannot cancel generation or playback, the adapter must still suppress further application publication and report the limitation. If a provider cannot resume a session safely, the host creates a replacement session and rehydrates only approved context.

## Out of Scope

- Microphone permission, audio capture, playback, WebRTC, SIP, VAD tuning, or provider session credentials.
- Choosing a realtime provider, model, voice, codec, or transport retry interval.
- Background microphone capture, notifications, or operating-system media controls.
- Implementing a generic event bus or global application hook registry.
- Letting hooks authorize actions or replace guardrail decisions.
- Reimplementing Memory Nucleus state, persistence, or reconciliation storage inside Conversation.
- Defining business-specific effects such as calendar, messaging, payments, or clinical workflows.
- Redesigning the mobile Orb; a future voice transport spec maps canonical state to approved UI behavior.
- Granting implementation authorization while this spec remains `draft`.

## Evidence and Promotion

Planned evidence includes deterministic lifecycle tests, race fixtures, provider-adapter contract tests, `conversation-api` integration tests, idempotency and reconciliation tests, exact-head CI, and independent review.

When implemented, promote the final lifecycle vocabulary, public seams, and ownership summary to `.agents/context/workspaces/ai/conversation.md`; update the relevant application harness with transport composition details; replace `pending` evidence with stable paths and PR references; and mark the spec `implemented` only after behavior is verifiable on `main`.

## Further Notes

This spec deliberately separates canonical application lifecycle from transport implementation. A future approved realtime voice spec can map WebRTC or provider events to these seams without redefining interruption, stale-result, duplicate-effect, or reconnect semantics.
