---
id: SPEC-049
title: Validate integrated Memory delivery and resolve technical debt
type: experiment
status: draft
mode: prospective
created: 2026-09-05
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - workspaces/memory-nucleus
  - workspaces/ai/conversation
  - workspaces/microservices/chatterbox
  - workspaces/packages/runtime
context:
  - .agents/context/workspaces/memory-nucleus/operational-memory.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
adrs:
  - .agents/adrs/0033-neo4j-canonical-memory-graph.adr.md
  - .agents/adrs/0034-memory-outbox-and-redis-isolation.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
evidence:
  - pending
---

# SPEC-049: Validate integrated Memory delivery and resolve technical debt

## Problem Statement

On 2026-09-05 the owner explicitly prioritized implementation and staging integration of SPEC-016, 012, 011, 043, 017 and 018 over new validation. An implemented status records delivered code; it does not certify reliability, cost savings, live infrastructure or voice experience. Existing unverified acceptance criteria remain open evidence debt.

## Solution

Run one focused validation cycle against the integrated staging commit, correct concrete failures, and publish reproducible, redacted evidence. Preserve the original acceptance contracts and explicit unknowns. Do not retrospectively mark unexecuted tests as passing.

## User Stories

1. The owner can distinguish implemented capability from measured product value.
2. An operator can identify which failure or missing measurement prevents internal activation or scale.
3. An investor-facing report uses observed cost and clearly labeled assumptions.

## Scope

- SPEC-016: rerun public SDK/authenticated HTTP/Neo4j readiness and usage observer seams after integration; suppression recovery with retained authoritative journal.
- SPEC-012: actual graph/broker round trip, duplicate/stalled/crash retries, claim fencing, consent changes, shutdown, cross-source deduplication and 100-job load.
- SPEC-011: bounded detached work, paired baseline equivalence, no visible effect, measured quality/recall and provider cost.
- SPEC-043: public SDK configured-store fixtures, low-ratio poisoning, independently held hidden corpus and no-resurrection.
- SPEC-017: live kill switch, verified evidence, sticky assignment, allowlist and canary ceiling, replacement context and measured response accounting.
- SPEC-018: reconciliation of intent/completion/revaluation, missing cost behavior, allocation conservation, comparable measured ROI, dashboard redaction and scale gates.

## Implementation Decisions

- Keep Neo4j canonical, Redis Queue persistent and physically separate from Redis Cache; use the existing worker workspace.
- Keep Free background off, experimental capture internal, and evidence-dependent activation on hold until genuine evidence exists.
- Record failed/cancelled/retried provider work; missing prices or audio measurements stay unknown.
- Do not erase independent privacy, consent or exposure boundaries to obtain a passing result.
- Full-database rollback that loses the suppression journal is unsupported. Physical purge remains separate from immediate suppression.
- Resolve commercial duration accounting under SPEC-025 and voice lifecycle under SPEC-034; 260 monthly minutes is the explicit 60-minute/week average scenario, not a billing decision.

## Testing Decisions

### Primary seam

Authenticated Chatterbox text turn to Memory graph/outbox/worker to SDK serving and economics report on one exact integrated revision.

### Secondary seams

Crash/restart, broker disconnection, database authority/readiness, worker fencing and provider accounting where the main seam cannot localize failures.

### Fixtures and privacy

Synthetic tenant-separated patient text only. Keep assistant output and idle durations out of Memory evidence. Store no transcript in queue payloads, logs or report artifacts. Independently hold integrity evaluation examples.

### Required validation

Targeted build/type integration, public SDK behavior, real Neo4j and Redis worker scenarios, the versioned load and integrity runners, existing repository audits/CI and actual Vercel deployments. Run only to resolve the concrete debt above.

## Acceptance Criteria

- [ ] The integrated exact revision passes the relevant authenticated text/Memory behavior.
- [ ] Queue retry/restart/fencing and suppression failure cases have reproducible evidence.
- [ ] Every attempt reconciles without silently dropping or double counting cost.
- [ ] Independent integrity and paired quality evidence exist for any proposed canary.
- [ ] Economic reports retain unknown costs and cannot claim measured voice margins from text.
- [ ] Known failures and deployment limitations have explicit owners and disposition.

## Failure Behavior

Keep serving on control and scale on hold when evidence is missing. Roll back treatment for observed integrity/privacy failures. Preserve failed jobs and accounting records; do not rerun paid work only to repair telemetry.

## Out of Scope

Main promotion, external participant rollout, commercial pricing decisions, full voice bridge and physical-purge commitments.

## Evidence and Promotion

Pending by explicit owner instruction. Promote proven operational conclusions into Memory context and attach revision-specific reports after this future cycle runs.

## Further Notes

This draft organizes future work and does not restart validation during the current implementation delivery.

