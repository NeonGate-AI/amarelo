---
id: SPEC-046
title: Saneamento canônico
type: governance
status: implemented
mode: prospective
created: 2026-09-05
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - .agents
  - .audit
  - cli
  - .github
  - workspaces/packages/runtime
context:
  - .agents/context/engineering/workflow-skills.md
  - .agents/context/workspaces/packages/overview.md
rules:
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
  - .agents/rules/012-container-ownership.rule.md
adrs:
  - .agents/adrs/0033-neo4j-canonical-memory-graph.adr.md
  - .agents/adrs/0034-memory-outbox-and-redis-isolation.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/writing-for-agents/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - .audit/canonical.audit.sh
  - .audit/canonical-regressions.audit.sh
  - .audit/workflow-skills.audit.sh
  - .audit/runtime.audit.sh
  - .agents/specs/readme.md
  - .agents/adrs/readme.md
  - .agents/skills/readme.md
  - workspaces/packages/runtime/readme.md
---

# SPEC-046: Saneamento canônico

## Problem Statement

The uploaded repository has unique spec priorities and durable IDs, but duplicate ADR-0030 identities, retired live paths, obsolete testing instructions, unneeded generic skills and stateful infrastructure enabled before consumers exist. Passing audits do not currently detect all these inconsistencies. The owner requests local ZIP-only delivery and a clear remaining roadmap before connecting Memory to the PWA.

## Solution

Reconcile canonical references and mechanically enforce their identity, existence and lifecycle. Retain useful project procedures, delete presently unused or redundant skill packages, preserve implemented evidence, and make the Memory infrastructure an explicit optional runtime profile. Publish the remaining executable roadmap in the spec catalog.

## User Stories

1. As a maintainer, I can identify a spec or ADR unambiguously and follow its live references.
2. As an implementation agent, I load only maintained skills and know which spec can run next.
3. As a developer, I can run the textual application stack without unused Memory databases and brokers.

## Scope

Spec/ADR catalog reconciliation, workflow skills and routing, stale references and test-policy repair, audit regression coverage, CI/template drift, and optional stateful runtime profiles. SPEC-047 owns authentication and conversational observations; SPEC-016 retains the later Neo4j bridge.

## Implementation Decisions

- Preserve durable SPEC identities and implemented historical evidence. Filename priority is not another SPEC ID; publish execution order separately instead of renumbering history unnecessarily.
- Resolve the duplicate ADR identity by allocating the eligibility decision a free ID and updating its callers. Introduce a complete ADR index and a single authoring-template source.
- There is no pending PostgreSQL implementation contract in this baseline: SPEC-016 already selects Neo4j. Do not retire it merely because it mentions the implemented PostgreSQL reference adapter. Retire only demonstrably abandoned contracts; distinguish deferred external gates from abandoned work.
- Keep the seven workflow procedures and the small maintained domain set justified by existing consumers. Remove unused/redundant skills and repair their normative callers; Git history preserves recovery.
- Neo4j, Redis Queue, Redis Cache and object storage remain the accepted target, enabled together through an explicit Memory runtime profile. PostgreSQL becomes an explicit reference profile, not the default Memory path. No data is pruned by changing a profile.
- SPEC-016 will compose a request-bound Memory SDK adapter at the Chatterbox server composition root. SPEC-012 will run dispatcher/worker as a separate process owned by the existing Memory Nucleus workspace, not an undeclared apps/memory-worker workspace.
- This owner-authorized delivery is offline with respect to Git: branch from the uploaded local staging reference, record local ticket order here, commit locally and return a ZIP. Do not fetch, push, create GitHub issues/PRs or claim remote CI. Local tickets: catalog/skills/ADRs first; audits and runtime profiles second; SPEC-047 last.

## Testing Decisions

### Primary seam

Elo check commands against the real repository and disposable mutated fixtures: duplicate IDs/priorities, missing live references and stale active targets must fail while valid historical records remain readable.

### Secondary seams

Runtime profile selection, manifest membership and command planning through the runtime package's existing synthetic command tests. Preserve safe namespace and prune boundaries.

### Fixtures and privacy

Only synthetic copied harness fixtures and fake runtime commands. No personal content, secrets, actual cluster mutation or remote repository calls.

### Required validation

All dependency-free Elo audits, runtime command tests, affected TypeScript typechecks/tests and repository lint. Run remaining local validation where dependencies are available; explicitly disclose unavailable container/browser/remote CI gates. Live cluster deployment is not an acceptance claim of this source-only delivery.

## Acceptance Criteria

- [x] Spec priorities and durable IDs are unique, indexed and accompanied by the remaining dependency-ordered roadmap.
- [x] ADR identities are unique and indexed; active references resolve to canonical files and the authoring template is consistent.
- [x] Removed skills and their replacements are documented; every retained normative skill reference resolves and obsolete test prohibitions are removed.
- [x] Active specs target current workspace boundaries, Neo4j core and a Memory-owned worker; history is not mislabeled as new implementation.
- [x] Audits reject representative duplicate identity, missing-reference and stale-target regressions.
- [x] Default application runtime excludes unused Memory/reference workloads; explicit profiles preserve the accepted isolated topology without deleting existing state.
- [x] CI, PR template and scoped harness routing agree with the corrected boundaries.
- [x] Local validation and independent review results are recorded honestly with unavailable gates distinguished from passing gates.

## Failure Behavior

Invalid profile or malformed/ambiguous catalog input fails before runtime effects. Missing normative references fail audits. Existing namespace data survives profile selection; only the explicit destructive prune command retains its established deletion semantics. Unavailable tools are reported, never replaced with invented runtime evidence.

## Out of Scope

Neo4j adapters, BullMQ workers, production deployment, GitHub configuration, remote CI/merges, changing historical product intent, and personal ChatGPT skill installation.

## Evidence and Promotion

Promote maintained routing to context and skill inventory, canonical identity invariants to audits, profile semantics to runtime documentation, and the remaining roadmap to the catalog. Local commits and reproducible tests provide delivery evidence.

### Local execution evidence — 2026-09-05

- `./cli/elo check platform`, `architecture`, `rules`, `specs`, `canonical`, `skills`, `imports` and `memory`: PASS. Canonical validation covers 35 ADRs, 47 specs and 17 positive/negative regression fixtures; skills inventory is seven workflow plus three domain procedures.
- `bash .audit/runtime.audit.sh --commands-only`: PASS for profile membership, safe commands, isolated queue/cache credentials and state-preserving switches. Kustomize rendering is explicitly skipped, not simulated as a pass.
- `corepack pnpm -r run typecheck`, `corepack pnpm -r run test`, `corepack pnpm -r --workspace-concurrency=1 run build` and `corepack pnpm exec biome check .`: PASS locally. Node 24 and the repository-pinned pnpm 10.32.1 were used; installation disabled lifecycle scripts.
- Independent review found SDK cancellation, Turbo environment forwarding and setup drift in the companion slice; those findings were corrected and covered by regression checks. Final fixed-head Standards and Spec-fidelity results belong to the delivery handoff.
- No kubectl/Docker cluster, Cypress browser journey, live WorkOS/provider call or remote CI was executed. The owner-authorized local exception is not production promotion or completion of SPEC-044's external settings gate.

## Further Notes

The owner authorized both this cleanup and the following authenticated observable text slice on 2026-09-05. This local-delivery exception does not change the ordinary staging-first remote workflow.
