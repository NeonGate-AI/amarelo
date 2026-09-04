# Memory Nucleus context

Memory Nucleus is Amarelo's longitudinal-memory workspace. It transforms evidence into governed candidate memory, uses deterministic policy plus semantic judgment where needed, maintains canonical memory, retrieves relevant records, and projects them into a hard token budget.

Its production Clean Architecture layers are `src/domain/`, `src/application/` and `src/infrastructure/`. Cross-cutting AI-engineering evidence lives in `src/assurance/evals/`; assurance is not a fourth production layer. It is a single workspace/package.

Core invariants: transcript ≠ memory; candidate ≠ canonical memory; authorization precedes exposure; retrieval ≠ projection; Memory ≠ Knowledge RAG; model proposes, deterministic infrastructure decides.

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

The repository's PostgreSQL adapter is current reference/migration code, not
proof that the selected Neo4j production boundary exists. SPEC-016 owns the
future adapter and SPEC-012 owns the future dispatcher/worker path.
