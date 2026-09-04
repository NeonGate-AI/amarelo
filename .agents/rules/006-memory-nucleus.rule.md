---
version: 4
name: Memory Nucleus
description: Canonical memory, retrieval, projection, authorization, integrity, economics, and MVP constraints.
alwaysApply: true
priority: high
tags:
  - memory
  - nucleus
  - ai
---

# Memory Nucleus rules

- Transcript/history is evidence, not canonical memory.
- MemoryCandidate is not canonical Memory.
- Models may propose; deterministic policy controls canonical activation and access.
- Authorization precedes personal-memory retrieval/exposure.
- Authorization does not imply integrity. Authorized records must also satisfy lifecycle, provenance, scope and canonical-state eligibility before ranking or projection.
- Ranking, similarity, salience, recency, decay, trust scores and model judgment may order only policy-eligible records; they must never make an ineligible record eligible.
- Unresolved conflicts between eligible memories preserve uncertainty; semantic similarity alone must not silently manufacture a single asserted fact.
- Explicit non-default tenant, schema, database or namespace configuration must remain consistent across write, retrieve, supersede, suppress, replay, restore, reindex and rebuild paths. Silent fallback to a default store is prohibited.
- Retrieval and projection are distinct. Projection must honor a hard token budget.
- Memory is not Knowledge RAG. General RAG belongs to `@ai/knowledge`.
- Product AI consumes memory only via `@repo/memory-sdk`.
- Memory Nucleus must not assemble provider-specific final conversation prompts.
- Neo4j is the selected canonical Memory graph; indexes, caches, queues and object storage never become independent Memory authorities.
- Full-text/structured retrieval remains the serving baseline; vector search exists in the selected graph topology but requires eval evidence before activation.
- Redis Queue and Redis Cache are separate physical services. BullMQ never uses the cache service.
- A protected Memory mutation and its outbox event commit atomically in Neo4j; publication to BullMQ is eventual and at least once, so workers must be idempotent.
- Authorization, consent, validation and critical safety guardrails remain synchronous and are revalidated before protected background effects.
- Audio, original documents and large immutable artifacts live in authorized object storage; Neo4j stores governed references and provenance.
- Poisoning assurance must include semantically strong false memories with no prompt-injection instructions before user-visible canary advancement.
- Normal deterministic retrieval remains zero-LLM. Any model-assisted integrity detector is supplemental, versioned, explicitly costed and never the sole policy boundary.
- Evals, judgment, observability and economics are MVP capabilities, not production fluff.
- Preserve `failure → spec → eval → fix → invariant → hidden eval → canary` for Memory assurance changes.
- Remove production-distribution complexity before removing AI-engineering intelligence.
