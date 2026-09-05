---
id: SPEC-018
title: Establish Memory unit economics dashboard and scale gates
type: experiment
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-05
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
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
  - .agents/adrs/0012-memory-nucleus-layout.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
  - .agents/adrs/0036-memory-eligibility-before-ranking.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-018: Establish Memory unit economics dashboard and scale gates

## Problem Statement

The repository has economics primitives, but scale cannot be justified by synthetic token estimates or inconsistent prices. A decision requires the same versioned ledger to join baseline, background, shadow, integrity assurance and A/B evidence while keeping quality, privacy and retrieval integrity beside cost.

## Solution

Consume SPEC-016's canonical usage-event, immutable pricing metadata and ledger seams to produce deterministic aggregation and a minimum operational dashboard. Compute:

```text
netMemoryCost = memoryProcessingCost - avoidedServingCost
memoryROI = avoidedServingCost / memoryProcessingCost
```

Join context reduction, calls, escalation, recall, relevance, temporal correctness, poisoning/integrity, leakage, consent, latency, queue health and AI COGS. Produce an explicit scale, hold or rollback decision. Revenue and plan prices are versioned scenario inputs only unless separately approved.

## User Stories

1. Cost owners can trace every aggregate to versioned usage and pricing inputs.
2. Product owners see quality, privacy, integrity and cost together.
3. Operators see backlog, retries, latency and failures before exposure grows.
4. Reviewers can reproduce ROI and net-cost signs, including mitigation overhead.
5. Scenario prices cannot become accidental product commitments.

## Scope

- Deterministic aggregation over SPEC-016's canonical ledger and pricing adapter.
- Dashboard/report with cohort, time, provider/model/rate and fixture versions.
- Separation of provider-reported and estimated usage.
- Serving cost avoided, Memory processing cost, net cost, ROI and AI COGS calculations.
- SPEC-043 poisoning/integrity metrics and mitigation overhead.
- Quality, privacy, retrieval, temporal, integrity, latency and queue/reliability gates.
- Explicit scale/hold/rollback decision and redacted evidence retention.

## Implementation Decisions

- Missing price, usage or infrastructure cost remains unknown, never zero.
- Avoided serving cost is derived from comparable control/treatment usage, not hypothetical token removal alone.
- Memory processing cost includes eligible formation, retrieval, retries, eval allocation, integrity mitigation and attributable infrastructure under versioned rules.
- Memory ROI above 3x is the healthy minimum; above 5x is the target.
- Numeric thresholds belong to the versioned experiment/report configuration. Context reduction above the 50–70% target remains eligible when all quality/safety gates pass; thresholds cannot change silently after seeing results.
- Net Memory Cost is ideally negative.
- Scale requires at least 50% context reduction (50–70% target), critical Recall@k above 90%, strong-model escalation below 5%, zero leakage/consent violations, zero policy-ineligible poison projection, no lifecycle resurrection and no quality regression.
- Dashboard integrity metrics include `poison_at_1`, `poison_projection_rate`, `answer_corruption_rate`, `utility_retained_under_attack` and abstention rate from SPEC-043 fixtures.
- Deterministic eligibility and any model-assisted detector are costed separately; model-assisted mitigation cannot hide its token, latency or retry overhead inside aggregate Memory cost.
- AI COGS target is 10% and ceiling is 20% only against an explicitly authorized revenue scenario.
- Prices in the canonical PDF are scenarios, not approved plans or entitlements.
- Scale requires A/B/canary evidence and the preceding hidden integrity gate, not synthetic-only estimates.
- Raw conversation and Memory content is absent from the dashboard and ledger.

## Testing Decisions

### Primary seam

A deterministic report test ingests versioned baseline artifacts and SPEC-016 ledger records from background, shadow, SPEC-043 assurance and A/B fixtures and verifies aggregates, gates and decision output end to end.

### Secondary seams

Pricing changes, missing data, double-count prevention, sign correctness, cohort isolation, redaction, poisoning/integrity reconciliation, mitigation-cost attribution, backlog/reliability thresholds and scenario labeling.

### Fixtures and privacy

Synthetic fixtures and redacted experiment aggregates only. No raw prompt, transcript, response or Memory content enters the ledger/dashboard.

### Required validation

Formula/gate tests, reconciliation fixtures, SPEC-043 metric ingestion, mitigation cost attribution, redaction/isolation tests, public dashboard/report snapshot, full CI and dual review.

## Acceptance Criteria

- [ ] Aggregation consumes SPEC-016's canonical ledger and pricing adapter without redefining them.
- [ ] Serving, background, integrity assurance and experiment units join without double counting.
- [ ] `netMemoryCost` and `memoryROI` use the canonical formulas and tested signs.
- [ ] Avoided serving cost comes from comparable measured control/treatment usage.
- [ ] Missing provider usage, pricing or infrastructure cost remains explicitly unknown.
- [ ] Dashboard reports context reduction, calls/turn, strong-model escalation, Recall@k, irrelevant rate, temporal errors, poisoning/integrity metrics, leakage, consent, latency, backlog and failures.
- [ ] `poison_at_1`, `poison_projection_rate`, `answer_corruption_rate`, `utility_retained_under_attack` and abstention rate are traceable to versioned SPEC-043 fixtures.
- [ ] Any model-assisted integrity mitigation reports separate token, latency and attributable cost deltas.
- [ ] Scale requires at least 50% context reduction (50–70% target), Recall@k above 90%, strong-model escalation below 5%, no quality regression, zero leakage/consent violations, zero policy-ineligible poison projection and no lifecycle resurrection.
- [ ] Memory ROI must exceed 3x to pass; above 5x is reported as target achievement.
- [ ] AI COGS 10% target and 20% ceiling appear only for authorized revenue scenarios.
- [ ] Reports include pricing/rate version, sample size, uncertainty and exclusions.
- [ ] Raw conversation and Memory content is absent.
- [ ] An explicit scale/hold/rollback decision is produced.
- [ ] Full CI and both reviews pass.
- [ ] Proven metrics and gates are promoted to the harness.

## Failure Behavior

Unknown or inconsistent inputs block a positive scale decision. Any leakage, consent violation, policy-ineligible poison projection, lifecycle resurrection or unaccounted mitigation cost forces hold or rollback. Quality regression, Recall failure, escalation at or above 5%, unreliable background operation or pricing-version mismatch yields hold or rollback. Dashboard failure cannot alter serving and blocks exposure increase.

## Out of Scope

Approving product prices or plans, billing, global autoscaling, finance accounting, clinical outcomes, voice, vector migration and new agent products.

## Evidence and Promotion

Evidence will include deterministic economics/reconciliation fixtures, SPEC-043 integrity metric ingestion, mitigation cost accounting, redaction tests, A/B-linked dashboard output, explicit decision, exact-head CI and both reviews. Stable metric definitions are promoted only after measurement.

## Further Notes

Owner execution hold (2026-09-05): do not start implementation until the SPEC-025 grill-me session reaches explicitly confirmed shared understanding and any affected contracts are reconciled. The technical dependency order below remains valid; this hold overrides immediate execution of a ready contract.

Blocked by SPEC-017. SPEC-017 itself is blocked by SPEC-043 before canary exposure. This phase decides whether to scale; it does not assume scale is the successful outcome.
