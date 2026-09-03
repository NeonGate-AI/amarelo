---
id: ADR-0009
title: Use PostgreSQL JSONB and FTS for initial memory persistence and RAG
status: accepted
date: 2026-08-27
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0009: Use PostgreSQL JSONB and FTS for initial memory persistence and RAG

## Context

Amarelo needs transactional canonical memory, lifecycle events, exact and metadata filtering, lexical retrieval, idempotency, and LangGraph checkpoint persistence. Selecting a separate vector database before demonstrating that vectors outperform simpler retrieval would add infrastructure, embedding, migration, and operational cost.

## Decision

Use PostgreSQL as the accepted initial persistence boundary:

- relational columns for stable identity, namespace, memory kind, lifecycle, time, version, and authorization references;
- mandatory tenant columns in every fingerprint, job, checkpoint, canonical row, lifecycle event, and read-model key;
- JSONB for typed episodic and semantic payloads and extensible metadata;
- PostgreSQL full-text search for the initial RAG index;
- transactional canonical writes and lifecycle events before projections advance;
- logically separate tables or schemas for canonical memory, lifecycle events, LangGraph checkpoints, jobs, and rebuildable search projections.

Maintain two isolated RAG domains:

- **Personal Memory RAG:** tenant-, subject-, authorization-, purpose-, and lifecycle-scoped episodic, semantic, and longitudinal read models with an initial 600-token context ceiling;
- **Knowledge RAG:** a separate non-personal curated and versioned corpus whose records preserve source citation, jurisdiction, effective interval, and retraction or supersession state. Scientific material is the only active product-validation scope. `regulatory` remains dormant contract and synthetic-eval compatibility for a later phase; regulatory/LGPD research, ingestion, interpretation, tools, and product entitlement are deferred.

The domains use separate schemas or stores, indexes, caches, contracts, and eval fixtures. Knowledge retrieval runs only for an explicit evidence need and never receives personal or authorization data. Open-web retrieval during a conversation turn is prohibited; ingestion and updates are a later controlled workflow. Access and consent remain deterministic policy and are never inferred by an LLM interpreting LGPD or corpus text.

`pgvector` is optional and dormant. It may be enabled only after synthetic offline retrieval evals show a material quality gain over exact lookup plus FTS and account for embedding generation, storage, index maintenance, model migration, latency, and monetary cost.

Neon is the recommended managed PostgreSQL provider for the initial implementation, but it is not part of the canonical data contract. Adapters target PostgreSQL behavior so the provider remains replaceable.

## Alternatives considered

- **Vector database as the primary store:** rejected because vector similarity cannot own provenance, lifecycle, authorization, or transactional truth.
- **PostgreSQL plus an active vector index from day one:** rejected because the incremental retrieval value is unproven and adds cost.
- **Separate document, checkpoint, and search databases:** rejected initially because operational complexity outweighs demonstrated scale needs.
- **Provider-specific Neon contracts:** rejected because the provider recommendation must not create unnecessary lock-in.
- **In-memory or local-file production persistence:** rejected because it does not provide the required durability and concurrent lifecycle guarantees.
- **One mixed personal-and-knowledge RAG index:** rejected because it creates disclosure, authority, lifecycle, and evaluation ambiguity.
- **Open-web search on each evidence question:** rejected because it is uncurated, temporally unstable, difficult to retract, and adds unpredictable latency and cost to voice turns.

## Consequences

The future production Personal Memory RAG path is exact and JSONB filtering followed by FTS and deterministic ranking under a 600-token memory-context ceiling. The future production Knowledge path adds deterministic corpus-version, topic, jurisdiction, effective-date, current verification and retraction/supersession filters, distinct-document limits, and citation-bearing results. Product validation activates only the scientific slice; regulatory behavior remains deferred. Current dependency-free retrieval modules provide lexical reference behavior and synthetic eval evidence only. Vector-specific dependencies, migrations, background embedding jobs, and costs are absent until a later evidence-backed activation decision. Database migrations must preserve domain and tenant isolation even when one provider hosts every PostgreSQL schema.

Raw audio and large source objects are not forced into canonical memory rows; any later object-storage choice requires its own lifecycle and authorization design.

## Compliance and verification

The current Memory Nucleus engine and Knowledge slice supply isolated
deterministic exact/lexical retrieval modules, in-memory reference repositories,
and separate offline eval suites. The engine also supplies candidate-run client
contracts, but no backing service. Regulatory fixtures are synthetic
compatibility checks, not active product scope. The slices do not claim the
PostgreSQL service, canonical transaction, production repository adapter,
corpus ingestion, context assembly, synthesis, durable retrieval audit store,
or FTS is implemented. Future personal-memory adapters must demonstrate
policy-decision validation, tenant- and authorization-constrained SQL,
transactional canonical writes, idempotency, lifecycle-aware FTS projections,
and revocation invalidation. Future scientific-knowledge adapters must
demonstrate non-personal corpus isolation, citation preservation,
distinct-document limits, topic/corpus-version filtering,
jurisdiction/effective-date filtering, current verification, and
retraction/supersession handling. Configuration may recommend Neon, but domain
contracts and query semantics must not require Neon-only APIs. No `pgvector`
query or embedding job is active without a later accepted decision.

## Links

- Memory constitution: `.agents/MEMORY.md`
- Architecture map: `.agents/ARCHITECTURE.md`
- Runtime memory design: `elos/memory-nucleus/docs/MEMORY.md`
- Memory Nucleus boundary: `.agents/decisions/0012-memory-nucleus-layout.md`
- Memory behavior spec: `.agents/specs/001-memory-nucleus-product-contract.spec.md`
