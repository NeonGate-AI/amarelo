---
id: SPEC-018
title: Establish Memory unit economics dashboard and scale gates
type: experiment
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - Memory economics ledger
  - experiment observability
  - operational dashboard
  - workspaces/memory-nucleus
context:
  - .agents/context/product/strategy.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/memory-nucleus.rule.md
  - .agents/rules/product-safety-and-privacy.rule.md
  - .agents/rules/spec-driven-development.rule.md
adrs:
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
  - .agents/adrs/0012-memory-nucleus-layout.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-018: Establish Memory unit economics dashboard and scale gates

## Problem Statement

The repository has economics primitives, but scale cannot be justified by synthetic token estimates or inconsistent prices. A decision requires the same versioned ledger to join baseline, background, shadow and A/B evidence while keeping quality and privacy beside cost.

## Solution

Consume SPEC-016's canonical usage-event, immutable pricing metadata and ledger seams to produce deterministic aggregation and a minimum operational dashboard. Compute:

```text
netMemoryCost = memoryProcessingCost - avoidedServingCost
memoryROI = avoidedServingCost / memoryProcessingCost
```

Join context reduction, calls, escalation, recall, relevance, temporal correctness, leakage, consent, latency, queue health and AI COGS. Produce an explicit scale, hold or rollback decision. Revenue and plan prices are versioned scenario inputs only unless separately approved.

## User Stories

1. Cost owners can trace every aggregate to versioned usage and pricing inputs.
2. Product owners see quality, privacy and cost together.
3. Operators see backlog, retries, latency and failures before exposure grows.
4. Reviewers can reproduce ROI and net-cost signs.
5. Scenario prices cannot become accidental product commitments.

## Scope

- Deterministic aggregation over SPEC-016's canonical ledger and pricing adapter.
- Dashboard/report with cohort, time, provider/model/rate and fixture versions.
- Separation of provider-reported and estimated usage.
- Serving cost avoided, Memory processing cost, net cost, ROI and AI COGS calculations.
- Quality, privacy, retrieval, temporal, latency and queue/reliability gates.
- Explicit scale/hold/rollback decision and redacted evidence retention.

## Implementation Decisions

- Missing price, usage or infrastructure cost remains unknown, never zero.
- Avoided serving cost is derived from comparable control/treatment usage, not hypothetical token removal alone.
- Memory processing cost includes eligible formation, retrieval, retries, eval allocation and attributable infrastructure under versioned rules.
- Memory ROI above 3x is the healthy minimum; above 5x is the target.
- Net Memory Cost is ideally negative.
- Scale requires 50–70% context reduction, critical Recall@k above 90%, strong-model escalation below 5%, zero leakage/consent violations and no quality regression.
- AI COGS target is 10% and ceiling is 20% only against an explicitly authorized revenue scenario.
- Prices in the canonical PDF are scenarios, not approved plans or entitlements.
- Scale requires A/B/canary evidence, not synthetic-only estimates.
- Raw conversation and Memory content is absent from the dashboard and ledger.

## Testing Decisions

### Primary seam

A deterministic report test ingests versioned baseline artifacts and SPEC-016 ledger records from background, shadow and A/B fixtures and verifies aggregates, gates and decision output end to end.

### Secondary seams

Pricing changes, missing data, double-count prevention, sign correctness, cohort isolation, redaction, backlog/reliability thresholds and scenario labeling.

### Fixtures and privacy

Synthetic fixtures and redacted experiment aggregates only. No raw prompt, transcript, response or Memory content enters the ledger/dashboard.

### Required validation

Formula/gate tests, reconciliation fixtures, redaction/isolation tests, public dashboard/report snapshot, full CI and dual review.

## Acceptance Criteria

- [ ] Aggregation consumes SPEC-016's canonical ledger and pricing adapter without redefining them.
- [ ] Serving, background and experiment units join without double counting.
- [ ] `netMemoryCost` and `memoryROI` use the canonical formulas and tested signs.
- [ ] Avoided serving cost comes from comparable measured control/treatment usage.
- [ ] Missing provider usage, pricing or infrastructure cost remains explicitly unknown.
- [ ] Dashboard reports context reduction, calls/turn, strong-model escalation, Recall@k, irrelevant rate, temporal errors, leakage, consent, latency, backlog and failures.
- [ ] Scale requires 50–70% context reduction, Recall@k above 90%, strong-model escalation below 5%, no quality regression and zero leakage/consent violations.
- [ ] Memory ROI must exceed 3x to pass; above 5x is reported as target achievement.
- [ ] AI COGS 10% target and 20% ceiling appear only for authorized revenue scenarios.
- [ ] Reports include pricing/rate version, sample size, uncertainty and exclusions.
- [ ] Raw conversation and Memory content is absent.
- [ ] An explicit scale/hold/rollback decision is produced.
- [ ] Full CI and both reviews pass.
- [ ] Proven metrics and gates are promoted to the harness.

## Failure Behavior

Unknown or inconsistent inputs block a positive scale decision. Any leakage or consent violation forces rollback. Quality regression, Recall failure, escalation at or above 5%, unreliable background operation or pricing-version mismatch yields hold or rollback. Dashboard failure cannot alter serving and blocks exposure increase.

## Out of Scope

Approving product prices or plans, billing, global autoscaling, finance accounting, clinical outcomes, voice, vector migration and new agent products.

## Evidence and Promotion

Evidence will include deterministic economics/reconciliation fixtures, redaction tests, A/B-linked dashboard output, explicit decision, exact-head CI and both reviews. Stable metric definitions are promoted only after measurement.

## Further Notes

Blocked by SPEC-017. This phase decides whether to scale; it does not assume scale is the successful outcome.
