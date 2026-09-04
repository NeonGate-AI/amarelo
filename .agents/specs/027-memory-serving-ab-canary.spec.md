---
id: SPEC-017
title: Activate Memory serving through controlled A B and canary gates
type: experiment
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - workspaces/apps/conversation-api
  - workspaces/ai/conversation
  - workspaces/packages/memory-sdk
  - experiment observability
context:
  - .agents/context/workspaces/ai/conversation.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
  - .agents/adrs/0012-memory-nucleus-layout.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.adr.md
  - .agents/adrs/0023-direct-ai-conversation-topology.adr.md
  - .agents/adrs/0030-memory-eligibility-before-ranking.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-017: Activate Memory serving through controlled A B and canary gates

## Problem Statement

Shadow can prove that a projection is safe and promising, but the old treatment description allowed Memory to be appended to the baseline history. An additive treatment cannot prove a 50–70% reduction and makes token, quality and cost comparisons structurally invalid.

A second prerequisite is now explicit: before any user-visible canary, Memory serving must prove resistance to semantically strong false memories, unresolved conflicts, lifecycle resurrection and configured-store isolation through SPEC-039. Authorization parity alone does not establish retrieval integrity.

## Solution

Freeze two comparable context compositions:

```text
CONTROL
= exact SPEC-009 model, route and instruction version
+ current user message
+ SPEC-009 longitudinal conversation history
+ every other comparable context component

TREATMENT
= the same model, route and instruction version
+ the same current user message
+ a minimal versioned recent-turn buffer
+ the authorized, integrity-eligible Memory Nucleus projection
+ every other comparable context component
```

The authorized projection **replaces** the longitudinal history that control would have sent. It cannot be merely added to control. Run a synthetic/internal canary first, then a small stable A/B cohort with server-owned assignment, immediate kill switch and automatic rollback gates. Canary activation is blocked until SPEC-039's adversarial integrity gate passes, including hidden eval evidence.

## User Stories

1. Eligible participants receive stable server-owned control or treatment assignment.
2. Users and browsers cannot choose treatment or private Memory scope.
3. Operators can return all traffic to control without deploy.
4. Evaluators can compare quality, recall, temporal behavior, integrity, leakage, latency and cost because only the longitudinal context strategy differs.
5. Product owners receive an explicit advance, hold or rollback decision.

## Scope

- Exact control composition derived from SPEC-009.
- Treatment composition that substitutes Memory projection for longitudinal history.
- Minimal recent buffer with explicit version, size and purpose.
- Server-owned eligibility, sticky assignment and synthetic/internal canary.
- SPEC-039 integrity/poisoning gate before canary exposure.
- Correlated experiment ledger, kill switch and automatic rollback.
- Comparable served-context and total-model-input metrics.
- Bounded exposure progression; no broad rollout.

## Implementation Decisions

- Control uses exactly the SPEC-009 composition and versions.
- Treatment preserves model, provider route, reasoning configuration, instruction version, current message, fixtures, timestamp, evaluator and quality criteria.
- Treatment removes the comparable longitudinal history and replaces it with the shadow-validated authorized projection.
- Only memories that pass the authorization and integrity eligibility boundaries may enter treatment projection.
- Only a minimal versioned recent buffer may remain for immediate conversational coherence; its tokens are included in treatment measurements.
- Adding Memory on top of control context is prohibited and mechanically tested.
- `comparableServedContextTokens` measures the control longitudinal context versus treatment recent-buffer-plus-projection context.
- `totalModelInputTokens` is recorded separately to prevent savings from being hidden in another prompt category.
- Quality, critical Recall@k, temporal correctness, poisoning/integrity, leakage/consent, latency, calls and cost remain paired and comparable.
- Canary precedes A/B; assignment is server-owned, sticky and purpose-aware.
- SPEC-039 hidden adversarial evals must pass before canary exposure is enabled.
- Kill switch defaults to control. Any unauthorized leakage, consent violation, integrity regression or lifecycle resurrection triggers immediate rollback.
- Advancement requires 50–70% comparable context reduction, Recall@k above 90%, zero unauthorized leakage/consent violations, zero policy-ineligible poisoning in projection, no lifecycle resurrection, no quality regression and Memory ROI above 3x; above 5x remains the target.

## Testing Decisions

### Primary seam

A public Conversation experiment test drives identical versioned fixtures through stable control and treatment assignment and captures both complete context plans before model invocation.

### Secondary seams

Control equivalence, prohibited additive treatment, recent-buffer versioning, assignment stability, client tampering, allowlist, kill switch, rollback thresholds, isolation, SPEC-039 poisoning/integrity evidence and insufficient-sample handling.

### Fixtures and privacy

Synthetic/internal authorized cohorts only. Experiment telemetry excludes raw prompts, responses and Memory content.

### Required validation

Context-plan tests, assignment/kill-switch/rollback tests, authorization adversarial evals, SPEC-039 hidden integrity/poisoning gate, paired quality/Recall/temporal/cost report, full CI and dual review.

## Acceptance Criteria

- [ ] Control matches the exact SPEC-009 model, route, instructions, current message, history and fixture/evaluator versions.
- [ ] Treatment preserves every comparable variable except the longitudinal context strategy.
- [ ] Treatment replaces longitudinal history with authorized and integrity-eligible Memory projection plus only a minimal versioned recent buffer.
- [ ] A test rejects any treatment that appends Memory to the complete control context.
- [ ] Reports record comparable served context and total model input separately.
- [ ] SPEC-039 hidden adversarial integrity evals pass before canary exposure.
- [ ] Canary precedes A/B and uses an explicit allowlist/exposure ceiling.
- [ ] Assignment is server-owned, stable and cannot be selected by the browser.
- [ ] Kill switch returns all requests to control without deploy.
- [ ] Any unauthorized leakage, consent violation, policy-ineligible poisoning or lifecycle resurrection triggers rollback.
- [ ] Advancement requires 50–70% context reduction, Recall@k above 90%, no quality regression, temporal correctness, integrity gates and Memory ROI above 3x.
- [ ] Latency, errors, calls and cost remain within predeclared gates.
- [ ] Reports include sample size, uncertainty and an explicit advance/hold/rollback decision.
- [ ] No broad production rollout or pricing claim is made.
- [ ] Full CI and both reviews pass.

## Failure Behavior

Missing assignment or configuration defaults to control. Authorization or integrity uncertainty prevents treatment. Additive treatment fails validation. Missing paired versions, missing SPEC-039 evidence or insufficient samples yields hold. Any privacy or integrity incident kills treatment. Quality, recall, temporal, poisoning, lifecycle, latency, error or cost regression crossing its gate triggers hold or rollback.

## Out of Scope

Global rollout, billing, plan entitlements, clinical claims, vector activation, voice, new agents and background redesign.

## Evidence and Promotion

Evidence will include exact context-plan diffs, additive-treatment rejection, assignment/tamper/kill-switch tests, SPEC-039 hidden integrity evidence, canary and A/B reports, explicit decision, exact-head CI and both reviews. Only proven treatment and gates are promoted.

## Further Notes

Blocked by SPEC-011 shadow go/no-go and SPEC-039 Memory integrity/poisoning assurance. It blocks SPEC-018 scale gates.
