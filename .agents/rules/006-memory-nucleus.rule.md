---
version: 2
name: Memory Nucleus
description: Canonical memory, retrieval, projection, authorization, economics, and MVP constraints.
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
- Evals, judgment, observability and economics are MVP capabilities, not production fluff.
- Remove production-distribution complexity before removing AI-engineering intelligence.
