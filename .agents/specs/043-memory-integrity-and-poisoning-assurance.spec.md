---
id: SPEC-043
title: Add Memory integrity and poisoning assurance before canary
type: experiment
status: ready
mode: prospective
created: 2026-09-04
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - workspaces/memory-nucleus/src/assurance/evals
  - workspaces/packages/memory-sdk
  - Memory serving assurance
  - configured store isolation
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0007-memory-taxonomy-and-longitudinal-projections.adr.md
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
  - .agents/adrs/0033-neo4j-canonical-memory-graph.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
  - .agents/adrs/0036-memory-eligibility-before-ranking.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-043: Add Memory integrity and poisoning assurance before canary

## Problem Statement

The current Memory roadmap is designed to prove authorization-before-retrieval, suppression/no-resurrection, cross-scope isolation, bounded projection, shadow parity, A/B comparability and unit economics. Those future delivery gates are not completed evidence. The roadmap also needs to prove that semantically strong but false, stale, conflicted or provenance-ineligible records cannot outrank legitimate Memory, especially when the adversarial content contains no prompt-injection instructions.

That gap matters because a retrieval system can satisfy authorization and still return the wrong memory. Similarity, recency, salience, trust weighting or model judgment can amplify a poisoned record unless policy eligibility is established before ranking. The repository also needs proof that read/write/replay/rebuild paths all resolve the same effective non-default store identity.

## Solution

Add a bounded assurance phase that preserves the mandatory workflow:

```text
failure → spec → eval → fix → invariant → hidden eval → canary
```

This spec introduces reproducible synthetic adversarial evals and promotion gates without selecting a new memory framework or changing user-visible serving. It measures poisoned retrieval, conflict handling, configured-store isolation and total cost of candidate mitigation strategies.

The implementation must distinguish:

- authorized for access;
- eligible for ranking/projection;
- sufficiently trustworthy to serve as an asserted fact.

## User Stories

1. As a privacy reviewer, an authorized but policy-ineligible memory cannot enter ranking or projection.
2. As a quality reviewer, a false memory with higher semantic similarity cannot silently displace legitimate canonical evidence.
3. As an operator, explicit non-default tenant/schema/database configuration is honored consistently across lifecycle paths.
4. As a cost owner, I can compare deterministic eligibility, ranking-only mitigation and optional model-assisted detection with full token/latency cost.
5. As a canary owner, no user-visible exposure advances without hidden adversarial evals passing.

## Scope

- Poisoned-memory evals with 1–2% synthetic false records.
- False records that contain no imperative prompt-injection text.
- Provenance/state eligibility before ranking.
- Conflict fixtures where multiple eligible memories disagree.
- Configured-store isolation across write, retrieve, supersede, suppress, replay, restore, reindex and rebuild.
- Metrics for poison-at-1, poison-in-projection, answer corruption, utility retained, critical Recall@k, abstention, latency and cost.
- Comparison of deterministic hard eligibility, trust-weighted ranking and optional model-assisted detection.
- Hidden eval gate before SPEC-017 canary advancement.
- Source-attribution assurance for patient text, assistant suggestions, ambiguous acknowledgments and content-free inactivity under SPEC-025.

## Implementation Decisions

- ADR-0003 remains authoritative for authorization-before-retrieval.
- ADR-0036 governs integrity/provenance eligibility before ranking.
- Ineligible records are excluded, not merely down-ranked.
- Ranking signals may order only eligible records.
- Prompt-injection detection is not treated as a substitute for false-memory integrity testing.
- Normal-path deterministic Memory retrieval must remain zero-LLM unless a separately measured experimental branch explicitly invokes a model-assisted detector.
- Any model-assisted detector must record provider/model/version, calls, input/output tokens, latency and attributable cost.
- A conflict between eligible memories that cannot be deterministically resolved must preserve uncertainty; silent winner-takes-all semantic ranking is prohibited.
- Non-default store configuration is part of the test fixture and every lifecycle operation must demonstrate the same effective tenant/schema/database identity.
- This spec must not adopt external memory frameworks, sidecars or retrieval platforms.
- Include an assistant-suggested false fact followed by an ambiguous patient acknowledgment, repeated deterministic Ana replies, a forged person role and a delegate statement mislabeled as patient self-report. Ana's output, silence and unresolved attribution must not become canonical patient facts or eligible projection merely because their text is relevant.
- Test source eligibility at persistence/formation as well as retrieval. Preserve zero-call rejection where deterministic gates can reject the input; preserve extractor abstention for unsupported eligible patient text. Conversational coherence from a temporary assistant turn is not evidence of Memory truth.
- Report correct abstention on ambiguous evidence separately from missed recall on self-contained, eligible patient facts. Cost priority does not relax privacy, provenance, lifecycle or integrity gates; mitigations remain separately costed.

## Testing Decisions

### Primary seam

Drive synthetic multi-tenant fixtures through the public Memory SDK / Nucleus serving seam, inject adversarial records and observe the exact ranked candidate set, bounded projection and resulting evaluation artifact.

### Secondary seams

- candidate eligibility policy;
- provenance/state resolution;
- conflict/abstention behavior;
- explicit non-default store configuration;
- replay/reindex/restore/rebuild no-resurrection;
- model-assisted detector accounting when enabled experimentally.

### Fixtures and privacy

Use synthetic tenants, subjects, evidence, memories and false memories only. No real conversation or personal data may be added to fixtures, snapshots or reports. Telemetry remains content-redacted.

### Required validation

- poisoned retrieval eval;
- conflict/abstention eval;
- configured-store isolation test;
- no-resurrection regression suite;
- cross-tenant/subject/view/purpose denial;
- token-budget assertion;
- zero-normal-path-LLM assertion;
- deterministic-versus-model-assisted cost comparison;
- hidden adversarial holdout;
- full CI and dual review on the exact final head.

## Acceptance Criteria

- [ ] False-memory fixtures representing 1–2% of a synthetic corpus are reproducible and versioned.
- [ ] At least one false-memory class contains no prompt-injection instruction and is more semantically similar to the query than the legitimate memory.
- [ ] Policy-ineligible records have zero ranking/projection eligibility regardless of similarity, salience, recency, decay or trust score.
- [ ] `poison_at_1`, `poison_projection_rate`, `answer_corruption_rate`, `utility_retained_under_attack`, critical Recall@k and abstention rate are reported.
- [ ] A conflict between unresolved eligible memories cannot silently become a single asserted fact through similarity alone.
- [ ] Assistant suggestions/repetitions, inactivity and forged or mismatched speaker attribution cannot be laundered into patient-reported Memory through formation, replay or projection.
- [ ] Ambiguous patient acknowledgments produce no unsupported fact; metrics distinguish correct abstention from recall failures on eligible self-contained facts.
- [ ] Explicit non-default store configuration is honored by write, retrieve, supersede, suppress, replay, restore, reindex and rebuild paths.
- [ ] No lifecycle path silently falls back to a default tenant/schema/database.
- [ ] Normal deterministic retrieval remains zero-LLM.
- [ ] Any experimental model-assisted detector reports full token, latency and cost deltas and cannot be the sole eligibility boundary.
- [ ] No strategy passes by improving Recall while increasing unauthorized leakage, consent violation or lifecycle resurrection above zero.
- [ ] Hidden adversarial evals pass before SPEC-017 canary exposure can advance.
- [ ] Full CI and both reviews pass on the exact final head.
- [ ] Measured thresholds and implementation-specific invariants are promoted only after validation; decision-level assurance requirements remain governed by ADR-0036 and the Memory Nucleus rule.

## Failure Behavior

Any unauthorized leakage, consent violation, cross-store access, resurrection, default-store fallback, poisoned ineligible projection or unaccounted model-assisted cost is a hard failure. Unresolved conflict yields abstention/minimization rather than fabricated certainty. Missing comparable baseline or missing cost metadata yields hold, not pass.

## Out of Scope

User-visible rollout, production pricing, vector activation, graph-database adoption, redesign of the Memory architecture, new agent products, and adoption of any external memory framework.

## Evidence and Promotion

This harness change promotes the durable decision-level assurance requirements in ADR-0036, the Memory Nucleus rule and workspace context. Implementation evidence will include versioned adversarial fixtures, deterministic eval artifacts, configured-store isolation results, cost/latency comparisons, hidden holdout results, exact-head CI and both reviews. Measured thresholds, mitigation mechanics and implementation-specific invariants are promoted to the harness only after those validations succeed.

## Further Notes

SPEC-025 reconciliation (2026-09-05): the owner accepted the consolidated discovery and requested this contract revision. The discovery hold is resolved; this phase remains ready and unimplemented. [SPEC-025](007-plans-and-entitlements.spec.md) adds source-contamination and correct-abstention cases to the existing poisoning gate. Lower cost and greater duration never waive these protections. This revision changes contracts only.

Blocked by SPEC-011's paired shadow/parity evidence over the SPEC-016/SPEC-012 path. This assurance phase is a required gate before user-visible canary advancement. It strengthens the existing roadmap rather than replacing authorization, lifecycle, shadow, A/B or economics phases.
