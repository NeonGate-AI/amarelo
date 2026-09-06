---
id: SPEC-055
title: Reconcile integrated delivery evidence and recover CI
type: fix
status: in-progress
mode: prospective
created: 2026-09-06
updated: 2026-09-06
owners:
  - Jonatas Sales
targets:
  - .agents/specs
  - .audit
  - .github
  - cli
  - workspaces/memory-nucleus
  - workspaces/ai/conversation
  - workspaces/microservices/chatterbox
  - workspaces/apps/mobile
context:
  - .agents/context/workspaces/memory-nucleus/integrated-delivery.md
  - .agents/context/workspaces/memory-nucleus/local-voice-mvp.md
rules:
  - .agents/rules/002-code-style.rule.md
  - .agents/rules/004-import-boundaries.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0033-neo4j-canonical-memory-graph.adr.md
  - .agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - https://github.com/NeonGate-AI/amarelo/actions/runs/34010920249/job/101426478783
  - https://github.com/NeonGate-AI/amarelo/pull/97
---

# SPEC-055: Reconcile integrated delivery evidence and recover CI

## Problem Statement

The shell repair passes, but PR #97 now fails on 23 spec-workflow inconsistencies.
Nine delivered contracts were marked implemented during the owner-deferred
validation phase despite open criteria. Later gates also reveal missing barrel
exports, an obsolete LangGraph prohibition, formatting/lint errors and a strict
TypeScript failure in the integrity runner. These failures prevent meaningful
validation of the integrated revision.

## Solution

Restore truthful lifecycle metadata and repair the concrete failures of the
existing CI pipeline. Preserve delivered implementation history, open evidence,
the approved LangGraph worker integration and all runtime acceptance boundaries.

## User Stories

1. As the owner, I can see whether implementation is delivered separately from
   whether its complete acceptance contract is validated.
2. As a maintainer, I can execute the existing checks through the integrated
   code and obtain actionable results without obsolete audit assumptions.

## Scope

Reconcile SPEC-016/012/011/017/018/043/050/051/052 to in-progress while preserving
all criteria and historical evidence. Update the catalog and SPEC-049's current
tracking note accordingly. Repair only concrete audit, lint, type, test, build
or CI-environment failures exposed during this recovery. The spec does not
reimplement those nine product contracts or certify their unrun acceptance work.

## Implementation Decisions

- Keep implemented code and historical delivery notes. In-progress means the
  acceptance lifecycle remains open; it does not mean implementation was removed.
- Never check an acceptance item without the evidence it requires. Keep runtime
  quality gates mandatory; the owner-approved historical message exception
  below is the only permitted Commitlint relaxation.
- Replace the obsolete dependency rejection with enforcement of the approved
  infrastructure-owned LangGraph boundary. Domain/Application stay independent.
- Restore leaf exports without starting the worker merely by importing a barrel.
- Fix typed inputs and cleanup behavior through existing contracts; preserve
  original failures, cleanup guarantees, authority and cost accounting.
- Apply formatting only to files reported by the configured CI linter.
- Retain shell automation and frozen dependency installation. Do not add tools,
  provider usage or deployment behavior unless a concrete CI failure requires it.
- Use fix/spec-055-validation-recovery from staging, append the reviewed recovery
  to staging for the existing PR #97, and leave the main merge to the owner.
- Run Commitlint after runtime validation over the complete existing range.
  The owner approved a body-max-line-length exception for exactly five existing
  commit objects on 2026-09-06. Identify them by full SHA, preserve every other
  rule, and keep ordinary commits and the commit-msg hook fully strict. Do not
  rewrite history or exempt messages by text, author, date, branch or spec ID.

### Approved historical message exception — 2026-09-06

This revision follows the owner's explicit approval after the complete remote
runtime checks passed and Commitlint remained the only failure. It supersedes
the earlier prohibition on all exemptions solely for the five immutable objects
below. The product specs retain their code, acceptance criteria and open evidence.

| Commit SHA | Originating spec |
| --- | --- |
| `1702ed337d74c4baf6439a10c11d89abdbcc78e1` | SPEC-011 |
| `69e14180645e8a00b9fd3dc7b7c208b51d8160b8` | SPEC-012 |
| `19a971d13c62cb5b196b29b2cdac02b77a9eeadd` | SPEC-017 |
| `48784a556d2c9d14e414da595eaf045d4b349967` | SPEC-018 |
| `4694a176df803657b7b515f5772875b2e1321968` | SPEC-043 |

Expose history validation through an owning POSIX Elo command. Keep the default
Commitlint configuration unchanged and select a tool-owned exception config only
for these exact SHAs. Invalid refs and command failures remain nonzero. Removing
the allowance after promotion is a normal follow-up once no validated range needs it.

## Testing Decisions

### Primary seam

The existing CI sequence: Elo audits, commitlint, Biome, typechecks, tests,
disposable Neo4j integration, reference-adapter checks, evaluations and builds.

### Secondary seams

Focused tests for any changed executable behavior, including import-safe worker
startup and cleanup failure semantics. Existing failing checks supply the red
baseline for metadata, structure, formatting and type repairs.

For the approved message exception, test the real Elo/Commitlint seam using the
five recorded objects and isolated synthetic commits. Prove a copied old message
in a new commit still fails, a new overlong body fails, another rule on an exempt
object still fails, invalid refs fail, and valid new commits pass. Keep the local
commit-msg hook strict and run these regressions in CI.

### Fixtures and privacy

Use existing synthetic fixtures and disposable test infrastructure. No paid
provider calls, private conversations, production database or real credentials.

### Required validation

Run relevant focused gates locally and full CI remotely on the final head.
Inspect all Vercel deployments and the main-source guard. A locally unavailable
container/Kubernetes tool is an environment limitation, not a passed real test.

## Acceptance Criteria

- [x] Spec statuses and catalog reflect pending acceptance without losing delivered history.
- [ ] Canonical, import, runtime and Memory audits enforce the current approved boundaries.
- [x] Reported lint/type/test/build failures are repaired and changed behavior is covered.
- [ ] Full final-head CI, main-source guard and Vercel deployments pass.
- [ ] Standards and Spec-fidelity reviews pass on the same final head.
- [x] Remaining product, live-provider and economic validation debt stays explicit.
- [ ] Only the five approved SHAs receive the body-length exception; regressions protect all other validation.

## Failure Behavior

Keep validation failing for genuine defects; do not suppress errors or weaken
privacy, eligibility, cost or disposable-infrastructure checks. Missing external
evidence stays unknown. An unresolved blocker is documented in PR #97 and keeps
promotion pending. Revert a faulty repair normally without rewriting history.

## Out of Scope

Paid voice/LLM measurements, external canary activation, commercial entitlement
decisions, production infrastructure, new product features and merging main.

## Evidence and Promotion

The linked failed run and local diagnostics are the baseline. Record reproduced
failures and final verification in this spec and PR #97. Keep SPEC-049 for the
broader experiments and acceptance evidence that repository CI does not prove.
Update executable checks to the approved contracts instead of duplicating rules.

### Recovery evidence (2026-09-06)

- The unchanged spec audit now passes for 55 specs. Canonical and regression
  audits, architecture, platform, scaffold, rules, workflow skills, import
  boundaries and Memory invariants pass locally.
- Biome reports zero errors, with 22 existing warnings and three informational
  diagnostics. Formatting was limited to the 46 files with formatting errors.
  Comparing against a formatted baseline isolates the small behavioral repair.
- Full local typechecking passes 20 tasks, tests pass 15 tasks, builds pass 16
  tasks, and the configured five-workspace AI evaluation command passes.
- Three new synthetic regression tests cover import-safe worker startup,
  disabled-worker opt-in, cleanup of every integrity scope and preservation of
  the original failure when cleanup also fails. Updated voice evaluations check
  the approved server-owned configuration, transcription, barge-in and absence
  of provider credentials in browser sources or session configuration.
- Docker and kubectl are unavailable locally. The disposable Neo4j and PostgreSQL
  checks and real Kustomize rendering require GitHub CI; commands-only runtime
  validation is synthetic evidence, not a replacement. Commands use pinned pnpm
  10.32.1 through Corepack; the machine's global pnpm differs.
- The full promotion commit range exposes five historical body-line violations
  (`body-max-line-length`, maximum 100): `48784a5`, `19a971d`, `4694a17`,
  `1702ed3`, `69e1418`. Their implementation is already in staging. A new commit
  cannot repair an ancestor's message. This recovery preserves the mandatory
  check and history; the promotion remains blocked pending an owner decision.
- SPEC-049 and the nine in-progress product contracts retain their open runtime,
  live-provider, load, security and measured-economics acceptance work. Passing
  repository checks would not certify that broader work.

PR #97 records the exact published head, remote results and independent review
axes. Keep this spec in-progress while complete promotion validation is blocked.

## Further Notes

The owner asked to continue investigating the failed validation after SPEC-054.
This bounded recovery continues that authorized PR repair. It supersedes the
delivery-only interpretation of status for current release validation while
retaining the earlier implementation-first decision as historical evidence.
