# Memory Nucleus

Memory Nucleus is Amarelo's single longitudinal-memory workspace. Its MVP purpose is to turn accumulated history into compact, relevant, governed memory so useful context does not grow proportionally with user history or LLM cost.

## Clean Architecture

```text
infrastructure
      ↓
application
      ↓
   domain
```

- `src/domain/` — entities, value objects, judgment, policies and memory economics.
- `src/application/` — use cases, contracts and ports.
- `src/infrastructure/` — current PostgreSQL reference code plus future Neo4j, inference and observability adapters.
- `src/assurance/evals/` — cross-cutting deterministic and semantic quality evidence for the MVP thesis.

## Memory flow

```text
Evidence → Candidate → Judgment + Policy → Canonical Memory
       → Retrieval → Projection → Token Budget
```

Conversation consumes Memory Nucleus through `@repo/memory-sdk` and owns final LLM context assembly. Knowledge/RAG remains independent under AI.

## MVP economics

Memory Nucleus measures context efficiency, context tokens avoided, serving cost avoided, processing cost, net saving and Memory ROI. Raw measurements may be emitted through `@repo/observability`; economic interpretation remains inside this workspace.

Canonical engineering knowledge lives in `.agents/context/workspaces/memory-nucleus/`, `.agents/rules/`, `.agents/specs/` and `.agents/adrs/`.

## Infrastructure status

Neo4j is the accepted target for canonical Memory, full-text/vector indexes and
transactional outbox events. BullMQ uses a dedicated Redis Queue service;
cache-aside state uses a separate Redis Cache service. Audio, original
documents and other large immutable artifacts belong in object storage with
governed graph references. The current PostgreSQL adapter remains reference
implementation only until SPEC-016 delivers the Neo4j boundary.
