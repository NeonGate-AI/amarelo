---
id: SPEC-056
title: Synchronize readiness test setup with completed consent accounting
type: fix
status: implemented
mode: prospective
created: 2026-09-06
updated: 2026-09-06
owners:
  - Jonatas Sales
targets:
  - workspaces/microservices/chatterbox/src/assurance/tests/operational-memory
context:
  - .agents/context/workspaces/microservices/overview.md
rules:
  - .agents/rules/002-code-style.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0035-vitest-fastify-testcontainers-strategy.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - https://github.com/NeonGate-AI/amarelo/actions/runs/34013921865/job/101434341671
  - https://github.com/NeonGate-AI/amarelo/pull/97
  - https://github.com/NeonGate-AI/amarelo/actions/runs/34014292131
  - https://github.com/NeonGate-AI/amarelo/pull/97#issuecomment-5557241937
---

# SPEC-056: Synchronize readiness test setup with completed consent accounting

## Problem Statement

PR #97's final validation intermittently fails the SPEC-016 readiness integration
test: the global graph count changes from eight to ten while a protected write
is correctly rejected. The setup's get-consent and update-consent operations
dispatch optional accounting asynchronously. Their ledger writes may complete
after the baseline snapshot, contaminating the no-write comparison.

## Solution

Wait for the existing runtime observation callback to acknowledge both consent
setup operations before capturing the baseline. The runtime invokes that public
callback after each usage-ledger append. Preserve the original whole-graph count
assertion, missing-schema rejection and successful recovery round trip.

## User Stories

1. As a maintainer, I can distinguish an unintended protected write from delayed
   accounting created by successful test setup.
2. As the release owner, I receive reproducible CI evidence without disabling a
   privacy or readiness assertion.

## Scope

The existing readiness integration test and this spec/catalog entry only. This
is a continuation of the owner's authorized PR validation repair. Implement on
fix/spec-056-readiness-accounting from staging and append the reviewed fix to
the existing staging promotion; the owner retains the main merge.

## Implementation Decisions

- Observe completed consent deliveries through the existing onObservation API.
- Use bounded condition polling, not a fixed sleep or global timeout increase.
- Take the graph snapshot only after both setup deliveries complete.
- Preserve all existing assertions, constraint removal, cleanup and recovery.
- Do not change Memory production code, SPEC-016 acceptance, accounting behavior,
  Commitlint rules or the five historical exceptions owned by SPEC-055.

## Testing Decisions

### Primary seam

The existing real disposable Neo4j readiness test through the public runtime and
request-bound SDK. The linked eight-versus-ten CI failure is the red baseline.

### Secondary seams

Chatterbox typechecking, focused Biome validation, spec/catalog audits and a diff
review confirming that the original no-write assertions remain unchanged.

### Fixtures and privacy

Reuse the existing synthetic patient and isolated Neo4j container. Capture only
a count of consent observations; no provider calls or real personal data.

### Required validation

Full CI, the main-source guard, four Vercel deployments and both review axes on
the final head. The implementation and documentation-closure CI runs provide
two executions of the unchanged corrected readiness test. Local Docker absence
must not be represented as a successful integration test.

## Acceptance Criteria

- [x] The baseline waits for both completed consent accounting deliveries.
- [x] The original whole-graph no-write and schema recovery assertions remain enforced.
- [x] The corrected readiness test and complete required CI pass remotely.
- [x] Both review axes pass and evidence is recorded without closing unrelated product debt.

## Failure Behavior

Missing accounting acknowledgements fail the bounded poll. A protected write
that creates nodes still fails the original count assertion. Test failures stay
blocking; no automatic retries, skips, relaxed comparisons or production changes.
Rollback is a normal revert. Container and driver cleanup remain in finally.

## Out of Scope

Changing optional telemetry delivery guarantees, provider usage, product APIs,
runtime authorization/readiness, other product specs or merging main.

## Evidence and Promotion

Record the failed baseline, code-level race analysis, remote repaired runs and
review in this spec and PR #97. The existing runtime observer contract already
owns the asynchronous behavior; no new rule or ADR is needed.

### Implementation validation — 2026-09-06

Head `a5f484a7dc738b64fdcf279696d8dc2a53fd16e5` passes the linked complete CI
run, including the corrected disposable Neo4j test, PostgreSQL, all audits,
lint, types, tests, evaluations, build, hooks and Commitlint. The main-source
guard and four Vercel deployments pass on the same head. The linked review
records PASS on both independent axes against `a51711b01dbc6180f70956dadce4d0f0ce1e372a`.

The original graph-count comparison and every rejection/recovery assertion are
unchanged. A bounded five-second poll now waits for two consent acknowledgements
before the baseline query. Production code and all other spec contracts are
unchanged. The final documentation-only closure reruns this same test and full
CI; PR #97 records that final-head confirmation without another source change.

## Further Notes

SPEC-055's implementation passed a complete CI run before its documentation-only
closure exposed this separate timing defect. Its bounded message exception and
the earlier successful run remain valid evidence of that implementation.
