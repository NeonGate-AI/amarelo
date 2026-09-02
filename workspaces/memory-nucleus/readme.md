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
- `src/infrastructure/` — PostgreSQL, inference and observability adapters.
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
