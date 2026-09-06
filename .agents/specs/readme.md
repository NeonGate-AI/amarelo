# Specs

The specification catalog is flat, priority-ordered and mechanically checked.

- `readme.md`, `template.md` and `workflow.md` are unnumbered support documents.
- Every numbered spec is a direct child named `NNN-lowercase-kebab-case.spec.md` and uses the canonical template.
- Priorities `001`–`099` form one delivery catalog; there is no separate legacy behavior-spec band.
- The filename prefix is mutable priority; frontmatter `id` is the durable identity used by branches, PRs and evidence.
- Priority changes happen atomically through a governance spec and update all repository references.
- ADRs use `.adr.md`, rules use `.rule.md`, numbered specs use `.spec.md`, and executable audit checkers use `.audit.sh`.
- Implemented and retrospective specs remain readable in this flat catalog; there is no history subdirectory.

## Catalog priority

The prefix is a unique catalog rank, not the durable `SPEC-###` identity. Existing ranks are retained to preserve reference stability. Follow the dependency-ordered queue below for execution; implemented history and deferred contracts do not block a later executable rank merely by appearing first.

| Priority | Durable ID | Status | Contract |
|---:|---|---|---|
| 001 | SPEC-019 | implemented | [Canonical Memory Nucleus MVP contract](001-memory-nucleus-product-contract.spec.md) |
| 002 | SPEC-020 | implemented | [Deterministic Conversation routing](002-conversation-routing-contract.spec.md) |
| 003 | SPEC-021 | implemented | [Mobile voice-state experience](003-mobile-voice-experience.spec.md) |
| 004 | SPEC-022 | implemented | [Private account and Elo entry](004-account-and-elo-entry.spec.md) |
| 005 | SPEC-023 | implemented | [Longitudinal-memory review and control](005-memory-control.spec.md) |
| 006 | SPEC-024 | implemented | [Public Amarelo product narrative](006-product-narrative.spec.md) |
| 007 | SPEC-025 | draft | [Plans, voice entitlements and capability gates](007-plans-and-entitlements.spec.md) |
| 008 | SPEC-026 | implemented | [Canonical spec template and priority migration](008-canonical-spec-template-and-priority-migration.spec.md) |
| 009 | SPEC-027 | implemented | [Direct AI Conversation topology](009-direct-ai-conversation-topology.spec.md) |
| 010 | SPEC-028 | implemented | [Elo CLI experience modernization](010-elo-cli-experience-modernization.spec.md) |
| 011 | SPEC-001 | implemented | [Repository harness and Elo foundation](011-repository-harness-and-elo-foundation.spec.md) |
| 012 | SPEC-002 | implemented | [Memory Nucleus MVP foundation](012-memory-nucleus-mvp-foundation.spec.md) |
| 013 | SPEC-003 | implemented | [Product application foundations](013-product-application-foundations.spec.md) |
| 014 | SPEC-004 | implemented | [AI runtime foundations](014-ai-runtime-foundations.spec.md) |
| 015 | SPEC-005 | implemented | [Import and package boundary normalization](015-import-and-package-boundary-normalization.spec.md) |
| 016 | SPEC-006 | implemented | [Spec-driven workflow foundation](016-spec-driven-workflow-foundation.spec.md) |
| 017 | SPEC-010 | implemented | [Direct Elo shell audits](017-direct-elo-shell-audits.spec.md) |
| 018 | SPEC-007 | implemented | [AI orchestrator topology](018-orchestrator-topology.spec.md) |
| 019 | SPEC-008 | implemented | [Conversation runtime](019-conversation-runtime.spec.md) |
| 020 | SPEC-013 | implemented | [Flat priority spec catalog](020-flat-priority-spec-catalog.spec.md) |
| 021 | SPEC-014 | implemented | [Spec-driven pull request evidence](021-spec-driven-pull-request-evidence.spec.md) |
| 022 | SPEC-015 | implemented | [Canonical Memory Nucleus validation roadmap](022-memory-nucleus-validation-roadmap.spec.md) |
| 023 | SPEC-009 | implemented | [First Ana/PWA conversation and serving baseline](023-first-ana-pwa-conversation-baseline.spec.md) |
| 024 | SPEC-016 | in-progress | [Operational Memory Nucleus core](024-operational-memory-nucleus-core.spec.md) |
| 025 | SPEC-012 | in-progress | [Background memory curation loop](025-background-memory-curation-loop.spec.md) |
| 026 | SPEC-011 | in-progress | [Shadow Memory serving and parity](026-shadow-memory-serving-parity.spec.md) |
| 027 | SPEC-017 | in-progress | [Memory serving A/B and canary](027-memory-serving-ab-canary.spec.md) |
| 028 | SPEC-018 | in-progress | [Memory unit economics and scale gates](028-memory-unit-economics-scale-gates.spec.md) |
| 029 | SPEC-029 | implemented | [Canonical local engineering workflow skills](029-canonical-local-workflow-skills.spec.md) |
| 030 | SPEC-030 | implemented | [Agent artifact scaffolding](030-agent-artifact-scaffolding.spec.md) |
| 031 | SPEC-031 | implemented | [Numbered canonical rule catalog](031-numbered-rule-catalog.spec.md) |
| 032 | SPEC-032 | implemented | [Realtime 2 WebRTC voice agent](032-realtime-2-webrtc-voice-agent.spec.md) |
| 033 | SPEC-033 | draft | [Application-owned conversational guardrails](033-application-conversation-guardrails.spec.md) |
| 034 | SPEC-034 | draft | [Conversation lifecycle hooks and realtime edge-case semantics](034-conversation-lifecycle-hooks.spec.md) |
| 035 | SPEC-035 | implemented | [Recover the specification catalog and CI](035-recover-spec-catalog-and-ci.spec.md) |
| 036 | SPEC-036 | implemented | [Direct cleanup without an apply flag](036-direct-cleanup.spec.md) |
| 037 | SPEC-037 | implemented | [Kubernetes local runtime migration](037-kubernetes-runtime.spec.md) |
| 038 | SPEC-038 | implemented | [Elo Kubernetes runtime commands](038-elo-kubernetes-runtime.spec.md) |
| 039 | SPEC-039 | implemented | [Chatterbox Microservice workspace](039-chatterbox-microservice-workspace.spec.md) |
| 040 | SPEC-040 | implemented | [Project-owned runtime application containers](040-project-owned-container-images.spec.md) |
| 041 | SPEC-041 | implemented | [Direct cleanup of node_modules](041-cleanup-removes-node-modules.spec.md) |
| 042 | SPEC-042 | implemented | [Layered test platform foundation](042-layered-test-platform-foundation.spec.md) |
| 043 | SPEC-043 | in-progress | [Memory integrity and poisoning assurance](043-memory-integrity-and-poisoning-assurance.spec.md) |
| 044 | SPEC-044 | implemented | [Staging-first repository delivery flow](044-staging-delivery-flow.spec.md) |
| 045 | SPEC-045 | implemented | [Memory infrastructure runtime topology](045-memory-infrastructure-runtime.spec.md) |
| 046 | SPEC-046 | implemented | [Saneamento canônico](046-saneamento-canonico.spec.md) |
| 047 | SPEC-047 | implemented | [Vertical slice textual, autenticado e observável](047-vertical-slice-textual-autenticado-observavel.spec.md) |
| 048 | SPEC-048 | implemented | [Install grill-me and align discovery gates](048-grill-me-discovery-alignment.spec.md) |
| 049 | SPEC-049 | draft | [Integrated Memory validation debt](049-integrated-memory-validation-debt.spec.md) |
| 050 | SPEC-050 | in-progress | [Local MVP environment](050-local-mvp-environment.spec.md) |
| 051 | SPEC-051 | in-progress | [LangGraph Memory orchestration](051-langgraph-memory-orchestration.spec.md) |
| 052 | SPEC-052 | in-progress | [Realtime PWA Memory bridge](052-realtime-pwa-memory-bridge.spec.md) |
| 053 | SPEC-053 | in-progress | [Commercial product README](053-commercial-readme.spec.md) |
| 054 | SPEC-054 | in-progress | [Shell automation entrypoints](054-shell-automation-entrypoints.spec.md) |
| 055 | SPEC-055 | in-progress | [Integrated CI recovery](055-integrated-ci-recovery.spec.md) |

The next unallocated durable delivery ID is `SPEC-056`.

**Current validation status (2026-09-06, SPEC-055):** SPEC-016/012/011/017/018/043/050/051/052 retain their delivered code and history, but are `in-progress` until their open acceptance evidence is resolved. The implementation-first records below describe the earlier delivery phase. No criterion was checked to repair the metadata audit.

SPEC-046 and SPEC-047 were implemented in the owner-authorized local ZIP branch. Their source/test acceptance does not assert live login, deployed infrastructure, browser E2E or remote CI.

On 2026-09-05 the owner confirmed SPEC-046/047 completed in staging and directed closure of SPEC-044. These are owner-reported acceptance records, not new remote settings or CI verification.

## Delivery order and deferred validation

**Discovery reconciled (2026-09-05):** the owner accepted SPEC-025's consolidated understanding and requested revisions of the six contracts below using the delivered ZIP. Their source, validation and economic-report boundaries are now reconciled and the discovery hold is resolved. The owner subsequently authorized remote implementation and staging integration, then explicitly deferred new validation to prioritize delivery. The catalog above tracks implementation as each PR lands; unchecked acceptance evidence is tracked by SPEC-049. Original evidence gates still govern runtime maturity and exposure.

| Order | Durable ID | Delivery boundary | Prerequisite or gate |
|---:|---|---|---|
| 1 | SPEC-016 | Request-bound Memory SDK composition and Neo4j write/read/suppress round trip | SPEC-047 implemented locally; retain SPEC-009 baseline |
| 2 | SPEC-012 | Memory-owned outbox dispatcher and one BullMQ worker process | SPEC-016 |
| 3 | SPEC-011 | Shadow retrieval with no effect on delivered responses | SPEC-012 |
| 4 | SPEC-043 | Integrity, poisoning and no-resurrection assurance | SPEC-011 parity evidence |
| 5 | SPEC-017 | Internal canary followed by controlled A/B | SPEC-043; SPEC-033 before external participants |
| 6 | SPEC-018 | Measured economics report and scale/hold decision | SPEC-017 |

The retained drafts are SPEC-033 (owner-deferred application guardrails, still required before external exposure), SPEC-034 (broader lifecycle/realtime semantics before external voice exposure; the owner-approved local bridge is SPEC-052) and SPEC-025 (owner understanding accepted and downstream contracts reconciled; remaining commercial decisions deferred; no entitlement implementation yet). Those open commercial choices do not block internal Memory validation. SPEC-044 is closed by explicit owner acceptance; its external enforcement was not independently reinspected here.

The six-spec sequence validates Memory over the authenticated textual path. SPEC-018 reports observed text/Memory economics and explicitly labeled voice estimates or unknowns until separate voice-bridge measurements exist. Passing this sequence alone cannot prove the complete cost or naturalness of an hour of voice use.

No pending contract requests a PostgreSQL Memory implementation. SPEC-016 and SPEC-012 already target Neo4j/BullMQ. Implemented PostgreSQL reference-adapter evidence stays historical; ADR-0009 is superseded. No meaningful pending spec was retired or merged merely to make the list shorter.

The executable Memory Nucleus chain is:

`SPEC-009 baseline → SPEC-046 reconciliation → SPEC-047 authenticated text → SPEC-016 core → SPEC-012 background → SPEC-011 shadow/parity → SPEC-043 integrity/poisoning assurance → SPEC-017 A/B and canary → SPEC-018 scale`.

SPEC-043 is a required assurance gate before user-visible canary exposure. It does not replace the earlier core, background or shadow phases; it converts observed integrity failures into evals and hidden holdouts before canary.

Each implementation PR starts from the `staging` produced by its prerequisite. For this owner-authorized implementation delivery, staging integration proceeds without waiting for new validation. This exception does not assert a passed evidence gate or permit external exposure. Production promotion occurs only through a `staging -> main` pull request after the required gates pass.

Use `template.md` and `workflow.md` for every new numbered spec. Rules, context and ADRs remain separate sources of truth and must be referenced by their canonical numbered semantic filenames.


## Integrated delivery — 2026-09-05

The six requested specs now have implementation branches and staging integration. SPEC-016 completed in PR #87; downstream delivery followed 012 → 011 → 043 → 017 → 018. The owner explicitly deferred new validation. An implemented catalog entry records code delivery, while unchecked test/quality/cost criteria remain under SPEC-049. No ready spec remains in this queue. SPEC-025, 033 and 034 retain their deferred draft boundaries.

The background/shadow/canary paths default off and evidence-dependent gates remain hold without measured results. This is an integrated textual implementation; no full voice economics, naturalness, pricing margin or production readiness is asserted.


## First usable voice MVP — 2026-09-05

The owner selected OpenAI Realtime for spoken answers with LangGraph governing Memory, and explicitly deferred WorkOS. Execute SPEC-050 → SPEC-051 → SPEC-052. These approved local slices separate the settled MVP goal from SPEC-025's still-deferred commercial rules. The background foundation remains SPEC-012 (`025-background-memory-curation-loop.spec.md`). Broad validation remains deferred in SPEC-049.

Local voice delivery: SPEC-050/051/052 implemented in separate staging PRs. OpenAI audio is direct WebRTC; LangGraph/BullMQ/Neo4j work in parallel through the server sideband. WorkOS is deferred for this explicit local owner profile. Compile integration is recorded separately from pending live evidence in SPEC-049. See [the current local voice context](../context/workspaces/memory-nucleus/local-voice-mvp.md).
