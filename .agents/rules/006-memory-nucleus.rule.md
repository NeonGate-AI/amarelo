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
- FTS/structured retrieval remains the MVP baseline; vector search requires eval evidence.
- Evals, judgment, observability and economics are MVP capabilities, not production fluff.
- Remove production-distribution complexity before removing AI-engineering intelligence.
