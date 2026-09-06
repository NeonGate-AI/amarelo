---
id: SPEC-018
title: Establish Memory unit economics dashboard and scale gates
type: experiment
status: in-progress
mode: prospective
created: 2026-09-03
updated: 2026-09-06
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
  - workspaces/memory-nucleus/src/application/reporting/
  - workspaces/memory-nucleus/src/infrastructure/reporting/
  - validation-deferred-by-owner-2026-09-05
---

# SPEC-018: Establish Memory unit economics dashboard and scale gates

## Problem Statement

The owner needs an auditable cost per active family subscription for a stated voice-use volume to explain possible plans and prices to investors. Existing Memory ROI and token-reduction primitives are supporting evidence, not that complete product-cost result. Scale cannot be justified by synthetic token estimates, incomplete voice coverage or inconsistent prices. A decision requires the same versioned ledger to join baseline, background, shadow, integrity assurance and A/B evidence while keeping quality, privacy and retrieval integrity beside cost.

## Solution

Consume SPEC-016's canonical usage-event, immutable pricing metadata and ledger seams to produce deterministic aggregation and a minimum operational dashboard/report. Lead with monthly cost per active family at the SPEC-025 validation workload of 60 minutes/week, beside an explicitly labeled monthly price scenario. Separate LLM, transcription/voice generation, Memory and attributable infrastructure costs without overlap. State whether the monthly amount is observed, normalized from a measured shorter run or simulated. Compute supporting Memory economics:

```text
netMemoryCost = memoryProcessingCost - avoidedServingCost
memoryROI = avoidedServingCost / memoryProcessingCost
```

Join context reduction, calls, escalation, recall, relevance, temporal correctness, poisoning/integrity, leakage, consent, latency, queue health and AI COGS. Produce an explicit scale, hold or rollback decision. Revenue and plan prices are versioned scenario inputs only unless separately approved.

The economic report and the Memory scale decision are separate outputs. A truthful partial-cost report remains useful when scale is held. The text-only SPEC-016→SPEC-017 chain cannot establish total measured voice cost or naturalness; those claims require separately authorized voice-bridge evidence, including both audio directions, interruptions and the SPEC-034 lifecycle boundary. SPEC-033 still gates external exposure.

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
- Monthly affordability report for the versioned 60-minute weekly workload, with fragmented-use distribution, duration basis, observed/normalized/simulated labels and voice-evidence coverage.
- Separate Free investor and internal Memory-enabled scenarios; longer paid durations remain research inputs rather than approved quotas.

## Implementation Decisions

- Missing price, usage or infrastructure cost remains unknown, never zero.
- Record patient speech, assistant speech and inactivity separately without content. Declare the duration basis for the workload; do not silently treat patient-only Memory input as the commercial quota rule. Missing or inconsistent basis prevents a per-minute/monthly affordability conclusion.
- Normalize weekly workloads with `52 / 12`: 60 minutes/week corresponds to 260 minutes per average month on the same declared basis. A normalized number remains a projection, not an observed month. Record turn/session distribution, input/output mix and Memory formation/reuse horizon; do not extrapolate one cheap turn as if every future turn had the same context and cost.
- Component totals form one non-overlapping sum. If a realtime provider bundles speech and reasoning usage, preserve its actual audio/text/cached counters and disclose the allocation; do not invent separate STT/TTS charges or count a token twice. Deterministic Ana text can still incur voice generation/delivery cost. Include interrupted generation and retries where attributable; unknown cancellation residue stays unknown.
- Price snapshots identify original currency, model/provider/version, effective date and any BRL exchange-rate source/date. Changing rates may produce a labeled revaluation, not overwrite the historical measured run. Provider-reported usage, calculated monetary cost and invoice reconciliation remain distinct evidence classes.
- Report operational costs per active family separately from one-time experiment/evaluation costs, disclose both, and retain the existing versioned allocation used for Memory ROI. Free excludes background formation under SPEC-025; an internal Memory-enabled run cannot be relabeled Free simply because both use the same duration target.
- Avoided serving cost is derived from comparable control/treatment usage, not hypothetical token removal alone.
- Memory processing cost includes eligible formation, retrieval, retries, eval allocation, integrity mitigation and attributable infrastructure under versioned rules.
- Memory ROI above 3x is the healthy minimum; above 5x is the target.
- Numeric thresholds belong to the versioned experiment/report configuration. Context reduction above the 50–70% target remains eligible when all quality/safety gates pass; thresholds cannot change silently after seeing results.
- Net Memory Cost is ideally negative.
- Scale requires at least 50% context reduction (50–70% target), critical Recall@k above 90%, strong-model escalation below 5%, zero leakage/consent violations, zero policy-ineligible poison projection, no lifecycle resurrection and no quality regression.
- Dashboard integrity metrics include `poison_at_1`, `poison_projection_rate`, `answer_corruption_rate`, `utility_retained_under_attack` and abstention rate from SPEC-043 fixtures.
- Deterministic eligibility and any model-assisted detector are costed separately; model-assisted mitigation cannot hide its token, latency or retry overhead inside aggregate Memory cost.
- AI COGS target is 10% and ceiling is 20% only against an explicitly authorized revenue scenario.
- The 10%/20% ratios are existing scenario/scale diagnostics, not newly approved MVP success thresholds. The R$10-cost/R$30-price example is illustrative and does not relax those gates or prove profit. Free at R$0 reports absolute cost/subsidy and an undefined revenue ratio, never division by zero. Publish observed costs even when a diagnostic or scale gate fails.
- Prices in the canonical PDF are scenarios, not approved plans or entitlements.
- Scale requires A/B/canary evidence and the preceding hidden integrity gate, not synthetic-only estimates.
- Raw conversation and Memory content is absent from the dashboard and ledger.
- A text/Memory-only report labels voice cost and experience as not measured. It may show an explicitly estimated voice scenario with assumptions, but cannot claim measured total voice affordability, choose a production model, approve paid minutes or assert natural voice parity. The one-second p95 proposal is not a gate.

## Testing Decisions

### Primary seam

A deterministic report test ingests versioned baseline artifacts and SPEC-016 ledger records from background, shadow, SPEC-043 assurance and A/B fixtures and verifies aggregates, gates and decision output end to end.

### Secondary seams

Pricing changes, missing data, double-count prevention, sign correctness, cohort isolation, redaction, poisoning/integrity reconciliation, mitigation-cost attribution, backlog/reliability thresholds and scenario labeling.

Add the 60-to-260 weekly/monthly conversion, source-duration versus allowance separation, both audio directions, deterministic-output voice cost, bundled-provider allocation, interruption/retry costs, Free zero-revenue ratios, fragmented-use normalization and partial voice coverage. A result with missing voice evidence must remain a labeled partial report even when every textual Memory gate passes.

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
- [ ] The lead result states monthly cost per active family, the 60-minute weekly workload's explicit duration basis, 260-minute monthly normalization and observed/normalized/simulated evidence status.
- [ ] LLM, speech, Memory and infrastructure costs reconcile without overlap; deterministic replies, interrupted attempts and experiment overhead cannot silently disappear from the relevant totals.
- [ ] Source audio directions and inactivity are separate metrics; patient-only Memory ingestion is not used as an implicit billing or workload denominator.
- [ ] Free and internal Memory-enabled results have distinct capability labels; zero-revenue ratios are undefined and paid allowances/prices remain scenario inputs.
- [ ] Missing measured voice-bridge evidence prevents a measured total-voice-affordability claim, while allowing a clearly labeled text/Memory report and explicit scale/hold decision.
- [ ] Dashboard reports context reduction, calls/turn, strong-model escalation, Recall@k, irrelevant rate, temporal errors, poisoning/integrity metrics, leakage, consent, latency, backlog and failures.
- [ ] `poison_at_1`, `poison_projection_rate`, `answer_corruption_rate`, `utility_retained_under_attack` and abstention rate are traceable to versioned SPEC-043 fixtures.
- [ ] Any model-assisted integrity mitigation reports separate token, latency and attributable cost deltas.
- [ ] Scale requires at least 50% context reduction (50–70% target), Recall@k above 90%, strong-model escalation below 5%, no quality regression, zero leakage/consent violations, zero policy-ineligible poison projection and no lifecycle resurrection.
- [ ] Memory ROI must exceed 3x to pass; above 5x is reported as target achievement.
- [ ] AI COGS 10% target and 20% ceiling appear only for authorized revenue scenarios.
- [ ] Reports include pricing/rate version, sample size, uncertainty and exclusions.
- [ ] Reports preserve currency/BRL conversion provenance, usage distribution and separate operational versus experiment costs; rate revaluation never rewrites the historical run.
- [ ] Raw conversation and Memory content is absent.
- [ ] An explicit scale/hold/rollback decision is produced.
- [ ] Full CI and both reviews pass.
- [ ] Proven metrics and gates are promoted to the harness.

## Failure Behavior

Unknown or inconsistent inputs required for a scoped scale decision block that decision. Missing audio measurements prevent a measured total-voice-affordability conclusion; they do not invalidate otherwise complete text/Memory observations or authorize voice exposure. Any leakage, consent violation, policy-ineligible poison projection, lifecycle resurrection or unaccounted mitigation cost forces hold or rollback. Quality regression, Recall failure, escalation at or above 5%, unreliable background operation or pricing-version mismatch yields hold or rollback. Dashboard failure cannot alter serving and blocks exposure increase.

## Out of Scope

Approving product prices or plans, billing, global autoscaling, finance accounting, clinical outcomes, voice, vector migration and new agent products.

## Evidence and Promotion

Evidence will include deterministic economics/reconciliation fixtures, SPEC-043 integrity metric ingestion, mitigation cost accounting, redaction tests, A/B-linked dashboard output, explicit decision, exact-head CI and both reviews. Stable metric definitions are promoted only after measurement.

## Further Notes

SPEC-025 reconciliation (2026-09-05): the owner accepted the consolidated discovery and requested this contract revision. The discovery hold is resolved; this phase remains ready and unimplemented. [SPEC-025](007-plans-and-entitlements.spec.md) governs the monthly investor metric, initial duration and open commercial choices. Technical Memory scale gates are retained, with evidence coverage preventing a textual result from being marketed as proven voice economics. This revision changes contracts only.

Blocked by SPEC-017 evidence. SPEC-017 itself is blocked by SPEC-043 before canary exposure. This phase decides whether to scale; it does not assume scale is the successful outcome.

## Implementation handoff · 2026-09-05

The owner explicitly prioritized implementation and integration and deferred validation execution. The new `application/reporting` leaf implements a strict redacted input contract and deterministic canonical-ledger aggregation. The `infrastructure/reporting` leaf provides a JSON-to-JSON/HTML CLI and standalone dashboard renderer without frontend dependencies or provider calls. Runtime and public package integration remain owned by the delivery composition.

The implementation separates operational and experiment allocations, reconciles background intent/completion observations by attempt, rejects overlapping valuations and inconsistent immutable rates, retains unknown money/durations, and derives Memory savings only from comparable provider-measured serving evidence. Monthly reporting declares the 60-to-260 conversion, duration basis, distribution and observed/normalized/simulated status. Free has zero scenario revenue and an undefined revenue ratio. Missing voice evidence cannot become measured total voice affordability.

Versioned SPEC-011/SPEC-017/SPEC-043/SPEC-012 gate references and configured quality/privacy/integrity/queue thresholds produce scale, hold or rollback. The report consumes supplied gate evidence and does not execute, fabricate or certify upstream results. Numeric ROI and COGS outputs are scenario diagnostics, not approved plans, quotas or exposure changes.

No tests, evaluations, report snapshots, CI runs or reviews were executed for this implementation slice. No measured cost/rate/result artifact was invented. Required validation and evidence-based acceptance remain deferred, so this delivery note does not mark those criteria complete or authorize scale.

## Current validation status — SPEC-055

Implementation remains delivered in staging. On 2026-09-06, SPEC-055 reconciles
the lifecycle to `in-progress` because the existing acceptance/evidence debt is
still open. Historical delivery notes and every unchecked criterion are retained.
Repository CI recovery does not by itself complete this product contract.
