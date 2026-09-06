---
id: ADR-0028
title: Model conversation lifecycle hooks as typed application seams
status: proposed
date: 2026-09-03
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0028: Model conversation lifecycle hooks as typed application seams

## Status

Proposed on 2026-09-03.

## Context

Realtime and streaming conversations are asynchronous. A user can interrupt a response while a tool is running, a provider can reconnect and replay an event, an older Ana Core result can arrive after a newer turn, and the PWA can move to the background while application work remains in flight.

These events require application reactions, but an unrestricted event bus would hide ordering, cancellation, ownership, and failure behavior. Provider callbacks are also unsuitable as canonical domain events because they couple the Conversation capability to one transport and make text, voice, tests, and future providers behave differently.

Guardrails and hooks solve different problems. A guardrail decides whether a candidate transition, action, or response may proceed. A lifecycle hook gives the application a typed seam at which to coordinate cancellation, cleanup, telemetry, persistence of authoritative receipts, or adapter behavior.

## Decision

Amarelo will model conversation lifecycle hooks as provider-neutral, typed seams owned by the existing Conversation capability and composed by host applications.

Provider and UI adapters translate native events into canonical lifecycle commands. They do not publish provider-native event objects into Conversation and do not become the source of truth for turn ordering.

### Canonical identity

Every asynchronous lifecycle record carries the identifiers needed to establish freshness and idempotency:

- `conversationId`;
- `sessionId`;
- `sessionEpoch`;
- `turnId`;
- `turnSequence`;
- `responseId`, when a response exists;
- `toolCallId`, when a tool call exists;
- `effectId` and `idempotencyKey`, when a durable effect exists;
- `requestId` and `traceId`.

`turnSequence` is monotonic within a session epoch. Reconnecting or replacing a transport session increments `sessionEpoch`; a reconnect never makes events from an older epoch current again.

### Hook taxonomy

Hooks are divided into two explicit categories.

1. **Interceptors** run before a lifecycle transition is committed. They may return a typed `continue`, `reject`, or `supersede` result for technical lifecycle validity. When policy evaluation is required, an interceptor invokes the guardrail contract from ADR 0027 and preserves its decision unchanged.
2. **Observers** run after a transition is committed. They may emit telemetry, release resources, persist an authoritative receipt through the owning capability, or notify an adapter. They cannot mutate the committed outcome, authorize a blocked action, or make an old turn current.

The initial canonical seams are:

- `beforeTurnAccepted`;
- `onTurnAccepted`;
- `onTurnSuperseded`;
- `beforeEffectDispatch`;
- `beforeResponsePublication`;
- `onEffectSettled`;
- `onResponseStarted`;
- `onResponseInterrupted`;
- `onSessionReconnected`;
- `onSessionEnded`.

The exact provider event that triggered a seam is adapter metadata, not the lifecycle contract.

### Ordering and supersession

- A session has at most one active response publication at a time.
- Accepting a newer user turn supersedes publication of the older active response.
- Supersession cancels pending response generation and playback when the underlying adapter supports cancellation.
- Supersession does not imply that an already dispatched durable effect was rolled back.
- A late result from a superseded turn is recorded as stale and cannot be spoken or displayed as the answer to the active turn.
- If a durable effect completed, its authoritative receipt remains valid and is made available to a later reconciliation flow; it is not discarded merely because the user interrupted the response.
- Results are correlated to the exact session epoch, turn, tool call, and effect before publication.

### Interruption semantics

An interruption is a conversation lifecycle transition, not proof that all in-flight work stopped.

When the user interrupts:

1. the current response is marked interrupted;
2. output playback and further publication are cancelled where supported;
3. the next accepted final input receives a new `turnId` and `turnSequence`;
4. cancel-capable read-only work may receive a cancellation signal;
5. durable effects continue or reconcile according to their owning capability and idempotency contract;
6. no cancelled or stale response may later resume automatically.

### Reconnect and duplicate delivery

- A reconnect obtains a new session epoch and does not reuse expired transport credentials.
- Replayed provider events are deduplicated through canonical identifiers.
- Dispatching the same `idempotencyKey` returns the existing effect state or receipt rather than executing the effect again.
- Transient model context is not copied blindly across sessions. Rehydration uses application-approved context and Memory Nucleus access through `@repo/memory-sdk`.
- Reconnect attempts are bounded by the host application and cannot create an infinite lifecycle loop.

### Failure isolation

- A required interceptor failure rejects the transition with a typed, observable error before any new effect is dispatched.
- An observer failure is isolated, traced, and retried only when its own contract is idempotent. It does not roll back a committed transition.
- Any reaction that must block unsafe behavior is implemented as a guardrail or required interceptor, never as a best-effort observer.
- Hook handlers cannot access the Memory Nucleus directly, bypass authorization, or publish user-visible text without returning through the owning Conversation/application seam.

No generic events workspace or application-wide untyped hook registry will be introduced. The canonical lifecycle belongs to `@ai/conversation`; host applications own transport lifecycle and composition.

This ADR does not authorize microphone access, audio recording, WebRTC, background capture, notifications, or a specific realtime provider.

## Consequences

- Interruption, stale-result suppression, reconnects, and duplicate delivery gain explicit semantics.
- Text, streaming text, and future voice transports can reuse the same lifecycle model.
- Durable effect completion is separated from whether a response was heard or displayed.
- Adapters must translate native provider events and maintain canonical identifiers.
- The application must store enough short-lived state to compare epochs, sequences, and idempotency keys.
- Observer failures become visible without corrupting the canonical turn state.
- Tests must cover event ordering and races rather than only synchronous request-response behavior.

## Alternatives Considered

### Use provider callbacks directly throughout the application

Rejected because provider event shapes and cancellation semantics would leak into Conversation and create divergent behavior between transports.

### Introduce a global event bus

Rejected because an untyped global bus obscures ownership, ordering, blocking behavior, privacy, and failure isolation.

### Cancel every in-flight operation on interruption

Rejected because some effects cannot be safely cancelled after dispatch. Idempotent reconciliation is required instead of pretending rollback occurred.

### Ignore late results

Rejected because completed effects and receipts may still be operationally important. Late results are retained as stale evidence but are not published to the active turn.

### Let hooks authorize actions

Rejected because hooks coordinate lifecycle reactions. Authorization and semantic policy remain guardrail and owning-capability responsibilities.
