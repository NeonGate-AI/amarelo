# Memory Nucleus context

Memory Nucleus is Amarelo's longitudinal-memory workspace. It transforms evidence into governed candidate memory, uses deterministic policy plus semantic judgment where needed, maintains canonical memory, retrieves relevant records, and projects them into a hard token budget.

Its production Clean Architecture layers are `src/domain/`, `src/application/` and `src/infrastructure/`. Cross-cutting AI-engineering evidence lives in `src/assurance/evals/`; assurance is not a fourth production layer. It is a single workspace/package.

Core invariants: transcript ≠ memory; candidate ≠ canonical memory; authorization precedes exposure; authorization ≠ integrity eligibility; integrity/provenance eligibility precedes ranking/projection; ranking signals order only eligible records; unresolved conflicts preserve uncertainty; explicit store identity is consistent across lifecycle paths; retrieval ≠ projection; Memory ≠ Knowledge RAG; model proposes, deterministic infrastructure decides.

Memory assurance follows `failure → spec → eval → fix → invariant → hidden eval → canary`. User-visible canary exposure is not allowed to advance from retrieval parity alone: adversarial false-memory fixtures without prompt-injection instructions, lifecycle resurrection cases and configured-store isolation must pass first. Normal deterministic retrieval remains zero-LLM; model-assisted integrity detection is experimental, supplemental and cost-accounted.
