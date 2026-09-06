# Architecture decisions

ADRs preserve consequential tradeoffs, including superseded history. Filename prefix, YAML `id` and heading are the same stable identity; numbers are never reused for precedence.

Use [the authoring guide](template.md) and the single [ADR prompt template](../prompts/adr.prompt.md). Update this catalog atomically with every new decision. Historical layouts in superseded records are evidence of the original decision, not current implementation targets.

| Identity | Status | Decision | Superseded by |
|---|---|---|---|
| ADR-0001 | accepted | [Use one shared longitudinal memory per person](0001-shared-longitudinal-memory.adr.md) | — |
| ADR-0002 | accepted | [Model Ana, Nico, and Isa as contextual agents](0002-elos-as-contextual-agents.adr.md) | — |
| ADR-0003 | accepted | [Authorize before retrieving private context](0003-authorization-before-retrieval.adr.md) | — |
| ADR-0004 | superseded | [Keep product-agent runtime in one AI workspace](0004-product-agent-workspace.adr.md) | ADR-0010 |
| ADR-0005 | accepted | [Integrate Orbz as a silent native Web Component](0005-orbz-web-component.adr.md) | — |
| ADR-0006 | accepted | [Replace the Expo mobile surface with a React Vite PWA](0006-mobile-react-vite-pwa.adr.md) | — |
| ADR-0007 | accepted | [Separate canonical memory kinds from longitudinal projections](0007-memory-taxonomy-and-longitudinal-projections.adr.md) | — |
| ADR-0008 | accepted | [Bound cost-first background memory curation](0008-cost-first-background-memory-curation.adr.md) | — |
| ADR-0009 | superseded | [Use PostgreSQL JSONB and FTS for initial memory persistence and RAG](0009-postgresql-jsonb-fts-memory-store.adr.md) | ADR-0033 |
| ADR-0010 | superseded | [Organize monorepo source under elos and AI domain workspaces](0010-elos-and-ai-domain-workspaces.adr.md) | ADR-0011 |
| ADR-0011 | superseded | [Separate the memory platform from the AI runtime behind an SDK](0011-memory-platform-and-sdk.adr.md) | ADR-0012 |
| ADR-0012 | superseded | [Name the memory ownership boundary Memory Nucleus and colocate its SDK](0012-memory-nucleus-layout.adr.md) | ADR-0015 |
| ADR-0013 | superseded | [Simplify Memory Nucleus into apps and packages](0013-memory-nucleus-structural-simplification.adr.md) | ADR-0015 |
| ADR-0014 | accepted | [Workspaces and centralized harness](0014-workspaces-and-centralized-harness.adr.md) | — |
| ADR-0015 | accepted | [Memory Nucleus MVP Clean Architecture](0015-memory-nucleus-mvp-clean-architecture.adr.md) | — |
| ADR-0016 | accepted | [Shared Memory SDK, Observability and Evaluation](0016-shared-memory-sdk-observability-evaluation.adr.md) | — |
| ADR-0017 | accepted | [Cognitive routing and Memory boundary](0017-cognitive-routing-and-memory-boundary.adr.md) | — |
| ADR-0018 | accepted | [Use numbered delivery specs as the unit of engineering change](0018-spec-driven-delivery.adr.md) | — |
| ADR-0019 | superseded | [Group Conversation under the AI orchestrator parent](0019-ai-orchestrator-topology.adr.md) | ADR-0023 |
| ADR-0020 | accepted | [Separate Conversation orchestration from named agent implementations](0020-conversation-agent-port.adr.md) | — |
| ADR-0022 | accepted | [Use a POSIX shell control plane and user-scoped Elo launcher](0022-posix-elo-control-plane.adr.md) | — |
| ADR-0023 | accepted | [Keep Conversation directly under the AI workspace](0023-direct-ai-conversation-topology.adr.md) | — |
| ADR-0024 | accepted | [Track the pnpm lockfile for reproducible installs](0024-tracked-pnpm-lockfile.adr.md) | — |
| ADR-0025 | accepted | [Keep agent artifact templates under .agents/prompts](0025-agent-artifact-prompt-templates.adr.md) | — |
| ADR-0026 | accepted | [Use stable numbered identities for repository rules](0026-numbered-rule-catalog.adr.md) | — |
| ADR-0027 | proposed | [Enforce conversational guardrails at application trust boundaries](0027-application-conversation-guardrails.adr.md) | — |
| ADR-0028 | proposed | [Model conversation lifecycle hooks as typed application seams](0028-conversation-lifecycle-hooks.adr.md) | — |
| ADR-0029 | accepted | [Use Kubernetes for the repository-managed local runtime](0029-kubernetes-local-runtime.adr.md) | — |
| ADR-0030 | accepted | [Place Chatterbox in the Microservices workspace](0030-microservices-chatterbox-boundary.adr.md) | — |
| ADR-0031 | accepted | [Make container images and environment templates project-owned](0031-project-owned-container-images.adr.md) | — |
| ADR-0032 | superseded | [Sequence automated testing with Vitest before critical Cypress scenarios](0032-test-platform-sequencing.adr.md) | ADR-0035 |
| ADR-0033 | accepted | [Use Neo4j as the canonical Memory graph](0033-neo4j-canonical-memory-graph.adr.md) | — |
| ADR-0034 | accepted | [Isolate Memory queue and cache behind a transactional outbox](0034-memory-outbox-and-redis-isolation.adr.md) | — |
| ADR-0035 | accepted | [Test Fastify with Vitest injection and real disposable dependencies](0035-vitest-fastify-testcontainers-strategy.adr.md) | — |
| ADR-0036 | accepted | [Enforce Memory eligibility and integrity before ranking](0036-memory-eligibility-before-ranking.adr.md) | — |

The next unallocated ADR identity is `ADR-0037`. `ADR-0021` is an unassigned historical gap, not permission to reuse an identity implicitly.

SPEC-046 resolved the old duplicate ADR-0030 by assigning Memory eligibility to ADR-0036; Chatterbox retains ADR-0030. The decision text and accepted date were preserved. ADR-0012 and ADR-0013 are historical layouts superseded by the already accepted ADR-0015 single-workspace decision; semantic Memory/SDK ownership remains valid. Unknown legacy dates remain `null`.

For current topology use `.agents/context/architecture/overview.md`; for Memory store authority use ADR-0033 and ADR-0034. ADR-0009 explains the former PostgreSQL reference direction and is not an executable Neo4j delivery contract.
