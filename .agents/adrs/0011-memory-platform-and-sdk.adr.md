---
id: ADR-0011
title: Separate the memory platform from the AI runtime behind an SDK
status: superseded
date: 2026-08-30
deciders:
  - product-owner
supersedes:
  - ADR-0010
superseded-by: ADR-0012
---

# ADR-0011: Separate the memory platform from the AI runtime behind an SDK

> Historical note: ADR-0012 preserves this boundary but renames the ownership directory to `memory-nucleus` and colocates the SDK beneath it. Paths below describe this decision at the time it was accepted.

## Context

The canonical product definition is:

> Memory Nucleus is Amarelo’s longitudinal memory infrastructure: the system
> responsible for turning accumulated user history into compact, relevant,
> governed context while minimizing serving cost.

`Memory Nucleus` names the conceptual capability. It does not assert that the
future infrastructure described by the definition is already deployed.

ADR-0010 correctly separated conversation, Knowledge retrieval, memory
curation, and shared definitions into independent TypeScript workspaces. It
also placed memory under `elos/ai/domains/memory-manager`. Subsequent
architecture research and inspection of the implementation exposed a stronger
boundary: a future conversation integration would consume longitudinal memory,
but must not own its persistence, policy, lifecycle, retrieval, or background
formation.

The current memory slice is already isolated enough to move without a
production migration. It has no product-runtime consumer, database adapter,
canonical-memory write path, service endpoint, queue, or PWA integration. It
implements candidate-only background curation, deterministic Personal Memory
retrieval, an in-memory reference repository, and synthetic offline evals.

Keeping that slice under `ai` would make deterministic authority appear to be
an AI-runtime concern and would encourage future storage, consent, deletion,
and audit behavior to accrue beside conversation agents. Moving only the
directory while retaining AI-specific contracts would be architectural
theater, so the dependency boundary must move as well.

## Decision

Use this source topology:

```text
elos/
  ai/
    domains/
      conversation/
      knowledge/
  memory-platform/
  packages/
    memory-sdk/
```

`elos/memory-platform` owns the Memory Nucleus capability:

- candidate-only background curation and its deterministic gates;
- memory-specific policy and authorization enforcement;
- Personal Memory retrieval and minimization;
- future canonical lifecycle, persistence, projections, deletion, audit, and
  memory-specific evaluation when those capabilities are implemented.

Its central package is named `@repo/memory-engine`. `Memory Nucleus` is the
conceptual product name; `memory-platform` is the source ownership boundary.
The directory is called
`memory-platform` because it is the product boundary that may eventually serve
multiple channels and runtimes. The package is called `memory-engine` because
the implemented artifact is currently a TypeScript engine/library, not a
deployed platform service. The name does not claim that an API, worker,
database, queue, or production deployment exists.

`@repo/memory-sdk` is the only memory package that conversation or another
consumer may import. Its public contracts remain provider-, framework-, and
storage-neutral; a server-side typed client hides the selected wire transport
from consumers. It returns structured memory data with provenance,
uncertainty, budget, and diagnostics; it never returns a prompt-formatted
system message. Conversation supplies the intended purpose while keeping its
agent identity local; the future authenticated policy/service boundary resolves
and validates the authorized view, and Conversation assembles the final model
context. A self-service search body does not choose tenant, subject, or
`viewId`.

The engine must not import any `@repo/ai-*` package or source below `elos/ai`.
AI-specific identities such as Ana, Nico, and Isa remain owned by the
conversation domain. Engine contracts use a neutral authorized-view scope. A
future authenticated policy/service adapter resolves that scope without making
agent identity part of the memory domain; the self-service SDK search body
cannot choose `viewId`.

Personal Memory and Knowledge retrieval remain isolated. Knowledge stays in
`elos/ai/domains/knowledge`, receives no personal or authorization payload, and
never shares a store, index, cache, contract, or fixture with Personal Memory.
Conversation behavior, tools, synthesis, prompt assembly, realtime voice, and
model routing remain in `elos/ai/domains/conversation`.

Keep source feature-first. The current `curation/` and `retrieval/` features
move intact in responsibility. This decision does not introduce default
`domain/`, `application/`, `infrastructure/`, `ports/`, or `adapters/` trees,
nor a global workflow hierarchy. A future API or worker becomes a separate
workspace only when an implemented deployment or scaling boundary requires it.

Preserve the accepted storage and retrieval direction from ADR-0009:

- PostgreSQL relational columns plus JSONB are the initial canonical-store
  direction;
- PostgreSQL Full Text Search follows exact and structured filters;
- `pgvector`, embeddings, and approximate-nearest-neighbor indexes remain
  dormant until domain-specific offline evidence demonstrates material net
  benefit after quality, isolation, latency, migration, and cost are counted.

No migration scaffold is required for the current move because no production
read/write path or canonical store exists. Dual-write, shadow reads, parity,
canary, and rollback become mandatory before a future replacement of a real
serving path or durable store.

A shared AI kernel is not kept as an empty architectural placeholder. A future
kernel may be introduced only when at least two AI domains use a stable,
framework-independent concept with identical semantics and no domain owns it.
Neutral evaluation primitives shared by memory and Knowledge belong in a
narrow shared package outside the AI runtime.

## Alternatives considered

- **Keep memory as an AI domain:** rejected because it assigns deterministic
  data authority and lifecycle to the conversation-runtime family and makes
  future consumers depend on AI internals.
- **Move the directory but keep imports from the AI kernel:** rejected because
  package placement alone would not create an autonomous boundary.
- **Keep candidate extraction in AI and create a second memory service:**
  rejected because it would split one memory lifecycle across two owners and
  duplicate policy.
- **Build the full research reference topology now:** rejected because API,
  worker, queue, outbox, database, object storage, consent ledger, and
  production deployment are not implemented requirements in this slice.
- **Activate pgvector while moving:** rejected because ADR-0009 requires
  evidence over exact lookup plus FTS and the current evals make no vector call.
- **Retain a compatibility package at the old path:** rejected because there is
  no runtime consumer to protect and the alias would preserve ambiguous
  ownership.

## Consequences

### Benefits

- Memory becomes reusable by future channels without importing conversation
  agents, LangGraph conversation state, or AI-kernel semantics.
- The SDK provides one deliberate consumer boundary while the engine can
  evolve its persistence and retrieval internals.
- Context assembly stays close to the model call, while lifecycle and
  authorization stay with the memory authority.
- Existing candidate-only, cost-first, token-bounded behavior and offline evals
  survive the move without pretending future infrastructure exists.

### Costs and risks

- Workspace manifests, lockfile importers, root scripts, local runtime paths,
  CI labels, documentation, and imports must follow the new paths and package
  names.
- The SDK can become a dumping ground unless it remains limited to stable
  consumer contracts and typed errors.
- The platform can become a god workspace unless conversation, Knowledge,
  generic model routing, UI, and product orchestration remain explicit
  non-goals.
- The name `memory-platform` may be read as production-ready; documentation
  must continue to state the implemented boundary and missing runtime pieces.

## Compliance and verification

- Memory implementation and memory-specific evals live under
  `elos/memory-platform`.
- The central package is `@repo/memory-engine`; consumers import only
  `@repo/memory-sdk`.
- `@repo/memory-engine` and `@repo/memory-sdk` have no dependency on
  `@repo/ai-*`, `elos/ai`, LangGraph conversation state, or a conversation
  agent contract.
- `@repo/memory-sdk` exposes no repository implementation, LangChain or
  LangGraph type, provider, prompt, database client, or model context string.
- Conversation and Knowledge do not import the engine or its internal source.
- Personal Memory and Knowledge retrieval keep separate contracts, fixtures,
  and evals.
- Existing offline evals continue to prove authorization-first retrieval,
  candidate-only curation, zero-or-one engine extractor invocation,
  prompt-injection treatment,
  deterministic ranking, and the 600 conservative estimated-token ceiling.
- Documentation labels implemented behavior, accepted direction, hypotheses,
  and future work separately. It does not claim a production API, worker,
  database, queue, compliance certification, or measured cost saving.
- Root lint, build, typecheck, and permitted offline eval commands pass after
  the implementation and generated lockfile changes are complete.

## Links

- Architecture map: `.agents/ARCHITECTURE.md`
- Memory constitution: `.agents/MEMORY.md`
- Memory behavior spec: `.agents/specs/001-memory-nucleus-product-contract.spec.md`
- Platform architecture: `elos/memory-platform/README.md`
- Research register: `elos/memory-platform/docs/RESEARCH.md`
- Superseded decision: `.agents/decisions/0010-elos-and-ai-domain-workspaces.md`
