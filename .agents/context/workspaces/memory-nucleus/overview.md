# Memory Nucleus context

Memory Nucleus is Amarelo's longitudinal-memory workspace. It transforms evidence into governed candidate memory, uses deterministic policy plus semantic judgment where needed, maintains canonical memory, retrieves relevant records, and projects them into a hard token budget.

Its Clean Architecture layers are `domain/`, `application/`, `infrastructure/`, plus first-class `evals/`. It is a single workspace/package.

Core invariants: transcript ≠ memory; candidate ≠ canonical memory; authorization precedes exposure; retrieval ≠ projection; Memory ≠ Knowledge RAG; model proposes, deterministic infrastructure decides.
