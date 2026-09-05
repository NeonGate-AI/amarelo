---
id: SPEC-011
title: Evaluate bounded Memory Nucleus serving in shadow mode
type: experiment
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - workspaces/ai/conversation
  - workspaces/microservices/chatterbox
  - workspaces/packages/memory-sdk
  - Memory serving assurance
context:
  - .agents/context/architecture/boundaries/ai-memory-nucleus.md
  - .agents/context/workspaces/ai/conversation.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0001-shared-longitudinal-memory.adr.md
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
  - .agents/adrs/0012-memory-nucleus-layout.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.adr.md
  - .agents/adrs/0023-direct-ai-conversation-topology.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-011: Evaluate bounded Memory Nucleus serving in shadow mode

## Problem Statement

Core and background phases can produce authorized active memory, but user-visible injection before parity evidence would expose quality, privacy, temporal and cost regressions. Local retrieval evals do not prove the complete serving composition.

## Solution

For eligible synthetic baseline turns, compute the exact authorized projection and treatment context that would be served later, but do not append it to the production model input, invoke a second visible response or change routing, lifecycle events or delivered output.

Compare the baseline and shadow candidate on identical fixtures, timestamps, model configuration, route, instruction version and quality evaluator. Record context units, calls, latency, critical Recall@k, irrelevant-memory rate, temporal correctness, authorization/leakage and experimental economics.

## User Stories

1. As a user, the delivered result is unchanged when shadow is enabled.
2. As a privacy reviewer, denied or cross-scope retrieval yields zero projection.
3. As an evaluator, I can reproduce baseline and projected measurements on the same fixture.
4. As a cost owner, I can see projected savings and processing cost without calling them production savings.
5. As an operator, shadow failure is isolated and separately observable.

## Scope

- Server-owned shadow eligibility and sampling.
- Authorized Memory retrieval through memory-sdk and existing Conversation ports.
- Exact future treatment formatting as delimited untrusted data.
- Strict no-effect separation from delivered serving.
- Versioned paired comparison records using the SPEC-009 measurement protocol and current SPEC-047 authenticated transport.
- Recall, relevance, temporal, leakage, quality, latency and cost reports.
- Explicit go/no-go record for SPEC-017.

## Implementation Decisions

- Shadow cannot change delivered model input, route, response, public event or error.
- Normal Memory retrieval records zero LLM, vector and web calls.
- Identity, actor, purpose and view are server-owned; authorization precedes access and exposure.
- Projection remains typed, bounded and marked as untrusted Memory data.
- Technical shadow failure is isolated from primary serving and recorded as unavailable.
- Provider-reported and estimated usage remain separate.
- Memory source restrictions do not remove assistant turns from the bounded temporary Conversation history. Preserve both roles where needed for immediate coherence; neither the recent buffer nor shadow artifacts become new personal-memory source evidence.
- Keep the original SPEC-009 fixture as a historical regression reference. Freeze a paired baseline for each evaluated model/provider/configuration and workload using the same measurement contract. A model, instruction, route or workload change requires both sides to be regenerated; comparisons across different models cannot be attributed to Memory.
- The future context candidate substitutes a bounded projection plus recent buffer for comparable longitudinal history. Do not inflate the control beyond its actual history budget to manufacture savings; short fragmented histories may correctly show little or no benefit.
- Version the SPEC-025 60-minute weekly workload's duration basis and fragmented-turn distribution. A text-only shadow run reports observed text/Memory costs and labeled voice estimates or unknowns. It does not prove monthly voice affordability or a one-second first-audio target.
- A blinded versioned evaluator compares answer quality; model-assisted judging is supplemental and costed.
- Advancement requires critical-memory Recall@k above 90%, zero unauthorized leakage, zero consent violations, no quality regression and acceptable temporal/latency behavior.

## Testing Decisions

### Primary seam

A Conversation/Fastify shadow test captures baseline model input/result and proves semantic equivalence with shadow disabled while observing a separate candidate projection and comparison record.

### Secondary seams

Cross-tenant/subject/view/purpose denial, budget, prompt-injection treatment, superseded/expired/revoked/tombstoned cases, timeout isolation and economics calculations.

Include recent dialogue requiring an assistant turn for interpretation, abstained ambiguous patient evidence, and repeated Ana output/inactivity that must not create new source evidence. Verify that rebaselining changes both paired records and preserves the original regression fixture.

### Fixtures and privacy

Synthetic multi-tenant fixtures with critical, irrelevant, temporal and adversarial memories. Telemetry contains only IDs/hashes and aggregate metrics.

### Required validation

No-effect tests, Memory SDK/Nucleus evals, recall/irrelevance/temporal/leakage holdouts, paired quality report, full CI and dual review.

## Acceptance Criteria

- [ ] Enabling shadow does not change delivered model input, response, route, public event or error.
- [ ] Authorized projection is computed only through approved Memory boundaries.
- [ ] Cross-tenant, subject, view and purpose violations yield zero projection.
- [ ] Projection remains within its explicit budget and SDK cap.
- [ ] Normal retrieval reports zero model, vector and web calls.
- [ ] Each comparison pair has identical fixture, timestamp, model, route, instruction, workload and evaluator versions; the original SPEC-009 fixture remains a separate regression reference.
- [ ] Patient-only formation does not strip necessary assistant roles from transient Conversation context or copy that context into source evidence.
- [ ] Reports distinguish text/Memory observations, voice estimates and unavailable audio metrics, with explicit workload duration basis and no claim of measured monthly voice savings.
- [ ] Critical-memory Recall@k is above 90%.
- [ ] Unauthorized leakage and consent violations are zero.
- [ ] Temporal cases are correct and response quality does not regress versus baseline.
- [ ] Shadow timeout/failure cannot alter or unboundedly delay primary serving.
- [ ] Reports separate context, total input, calls, latency and experimental cost without claiming production ROI.
- [ ] Full CI and both reviews pass.
- [ ] A go/no-go record explicitly blocks or unlocks SPEC-017.

## Failure Behavior

Denied authority produces no projection. Malformed or over-budget projections are discarded. Missing comparable baseline blocks evaluation. Any leakage, consent violation, Recall@k at or below 90%, temporal failure or quality regression produces no-go. Technical timeout records unavailable without altering primary serving.

## Out of Scope

User-visible Memory injection, A/B assignment, background redesign, vector reranking, support UI, production billing, voice and scale claims.

## Evidence and Promotion

Evidence will include no-effect, authorization, budget and adversarial tests; paired parity reports; explicit go/no-go; exact-head CI and both reviews. Only measured shadow behavior and metric definitions are promoted.

## Further Notes

SPEC-025 reconciliation (2026-09-05): the owner accepted the consolidated discovery and requested this contract revision. The discovery hold is resolved; this phase remains ready and unimplemented. [SPEC-025](007-plans-and-entitlements.spec.md) separates personal-memory evidence, temporary dialogue and timing telemetry. This revision keeps no-effect shadow behavior and allows properly paired model research without attributing a model-price change to Memory. It changes contracts only.

Blocked by SPEC-009, SPEC-047, SPEC-016 and SPEC-012. Its no-effect/parity evidence unlocks SPEC-043; both gates remain prerequisites of SPEC-017.
