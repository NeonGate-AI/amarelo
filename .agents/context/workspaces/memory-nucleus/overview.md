# Memory Nucleus context

Memory Nucleus is Amarelo's longitudinal-memory workspace. It transforms evidence into governed candidate memory, uses deterministic policy plus semantic judgment where needed, maintains canonical memory, retrieves relevant records, and projects them into a hard token budget.

Its production Clean Architecture layers are `src/domain/`, `src/application/` and `src/infrastructure/`. Cross-cutting AI-engineering evidence lives in `src/assurance/evals/`; assurance is not a fourth production layer. It is a single workspace/package.

Core invariants: transcript ≠ memory; candidate ≠ canonical memory; authorization precedes exposure; authorization ≠ integrity eligibility; integrity/provenance eligibility precedes ranking/projection; ranking signals order only eligible records; unresolved conflicts preserve uncertainty; explicit store identity is consistent across lifecycle paths; retrieval ≠ projection; Memory ≠ Knowledge RAG; model proposes, deterministic infrastructure decides.

Memory assurance follows `failure → spec → eval → fix → invariant → hidden eval → canary`. User-visible canary exposure is not allowed to advance from retrieval parity alone: adversarial false-memory fixtures without prompt-injection instructions, lifecycle resurrection cases and configured-store isolation must pass first. Normal deterministic retrieval remains zero-LLM; model-assisted integrity detection is experimental, supplemental and cost-accounted.

## Selected infrastructure direction

Neo4j is the selected canonical graph for evidence metadata, episodic records,
semantic assertions, relationships, lifecycle, longitudinal projections,
full-text/vector indexes and transactional outbox events. Large immutable
artifacts such as audio and original documents live in authorized object
storage; the graph owns their governed references and provenance.

BullMQ runs on a dedicated persistent Redis Queue service. Redis Cache is a
physically separate, disposable cache-aside service for context snapshots,
retrieval cache, session state and TTL data. An outbox dispatcher publishes a
reference-only job after the Neo4j transaction commits, using `eventId` as the
stable job ID. Delivery is at least once and workers are idempotent. Critical
guardrails remain synchronous and protected workers revalidate current
authority.

The repository's PostgreSQL adapter is retained reference/migration code.
SPEC-016 owns the [operational Neo4j boundary](operational-memory.md);
SPEC-012 owns the dispatcher/worker path. The active specs record validation
status separately from implementation.

SPEC-016 binds a request-scoped SDK adapter at Chatterbox's composition root using the authenticated context from SPEC-047. It does not introduce a second Memory HTTP service. SPEC-012's dispatcher and long-lived worker are separately started processes owned by this workspace's infrastructure boundary; no nested application/package mini-monorepo is introduced.

Selected infrastructure is not automatically started for ordinary application work. The runtime's explicit Memory profile owns Neo4j, Redis Queue, Redis Cache and object storage; its reference profile owns PostgreSQL. Profile selection changes desired local workloads, not canonical authority or data-retention rights.
