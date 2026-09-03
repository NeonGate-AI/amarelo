---
id: ADR-0008
title: Bound cost-first background memory curation
status: accepted
date: 2026-08-27
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0008: Bound cost-first background memory curation

## Context

Frequent voice conversation can make memory extraction a major source of model spend and response latency. Running extraction during every turn, replaying full transcripts, using agent debate, or retrying with increasingly expensive models would multiply cost before Amarelo has evidence that each operation creates durable value.

## Decision

Memory curation runs outside the synchronous conversation path. The current slice receives complete caller-supplied conversation turns; future source services may provide cursor-based unprocessed deltas without changing the curation boundary.

Every request carries an explicit `tenantId`, a caller- or policy-generated
`formationSignal`, and an authorization reference `{ decisionId }`.
`formationSignal: none` stops before resolution, a source claim, model use, or
run completion with zero model cost; no LLM may derive the signal. For eligible
signals, a trusted resolver loads the deterministic decision and validates
status, expiry, candidate-proposal permission, actor, tenant, subject, and
purpose before private source preparation. The engine then applies whole-turn
content and budget gates, derives a scoped source fingerprint, and claims that
source before any model call.

An ineligible, duplicate, in-progress, or oversized batch completes or defers
with zero model calls. The implemented persistence client contract returns a
discriminated source status of `claimed`, `duplicate`, or `in-progress`, using
the same canonical idempotency key for claim and completion and binding actor,
decision, conversation, purpose, and request scope; `in-progress` exposes
`retryAt` only while that reported lease is active. The engine rejects an
already-expired claim, re-resolves authorization after claim before model use,
then rechecks expiry and re-resolves authorization immediately before
completing an authorized active run with the returned `claimId`.
Every candidate is bound to the run scope and provenance, and a `claim-lost`
completion defers. No backing API or durable transaction exists in the current
repository. A future service must define durable lease/fencing/CAS behavior and
revalidate authority transactionally; the engine's pre-extractor and immediate
pre-completion resolver checks are not that backend transaction. A crash after
model use but before completion can
result in another model call after expiry, so the current contract does not
guarantee exactly-once model execution. Oversized
input is deferred as a whole rather than
silently truncating an utterance. An eligible newly claimed batch may cause at
most one event-loop-deadline-bounded structured extractor invocation at the
engine boundary. Timeout or other extractor/adapter failure is accounted as an
explicit deferred result with one attempted invocation. The engine starts no
retry or expensive fallback, cannot preempt synchronous event-loop blocking,
and does not prove
provider-internal retry, cancellation, output/spend limits or an approved tier.
The memory curator
can propose typed episodic or semantic candidates only and persist a
candidate-only curation run. It cannot accept canonical memory, start repair or
reflection loops, or escalate automatically to an expensive model.

Tenant, actor, authorization, relationship, and policy metadata stay outside model input. Failures are explicit and bounded: skip, defer, or require later explicit handling. The current usage record captures estimated input tokens, nullable actual input/output/total tokens, and configured model/provider identity; cached-token and monetary billing fields are future work and must not be invented.

## Alternatives considered

- **Extract memory synchronously on each turn:** rejected because it adds latency and makes a second model call routine.
- **Process an ever-growing complete history repeatedly:** rejected; the current caller supplies a bounded batch, while future cursor-based source deltas can avoid duplicate tokens.
- **Use multi-agent curation or debate:** rejected because coordination cost is unjustified and can create conflicting writes.
- **Escalate automatically when structured output fails:** rejected because it creates an unbounded cost path; explicit review or later manual reprocessing is safer.
- **Never use a model for curation:** rejected because some episodic and semantic transformations require language interpretation that deterministic code cannot provide reliably.

## Consequences

The runtime needs a background execution boundary, tenant-scoped fingerprints and idempotency keys, deterministic preflight gates, a structured-output contract, and usage accounting. Conversation quality and memory formation become independently degradable: curation must not block the future natural continuous voice response. Extraction cursors and partial turn-boundary advancement remain future source-service work.

The current no-tests policy receives one narrow exception for synthetic, deterministic, offline memory, RAG, authorization, prompt-injection, and cost evals. The exception permits no network, paid model, private data, application testing, or browser automation.

## Compliance and verification

Permitted evals must prove zero extractor invocations for deterministic stops,
duplicate and in-progress claims; no more than one engine-level invocation for
an eligible batch; an attempted invocation is recorded on deadline; no
engine-level retry or expensive fallback; model-input isolation; whole-turn
preservation; and stable tenant-scoped idempotency. These evals cannot prove an
arbitrary provider SDK's retry, cancellation, output/spend or tier behavior.
Production-quality or cost-optimization claims require additional provider and
economic evidence; compilation alone is insufficient.

## Links

- Runtime rule: `.agents/rules/ai-runtime.md`
- Memory constitution: `.agents/MEMORY.md`
- Runtime architecture: `elos/ai/ARCHITECTURE.md`
- Memory Nucleus architecture: `elos/memory-nucleus/README.md`
- Curation delivery spec: `.agents/specs/014-background-memory-curation-loop.md`
