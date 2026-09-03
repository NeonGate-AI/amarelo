---
id: SPEC-015
title: Align the Memory Nucleus validation roadmap with repository reality
type: governance
status: in-progress
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - .agents/specs
  - .agents/context/architecture/overview.md
  - repository validation and Memory Nucleus delivery order
context:
  - .agents/context/product/strategy.md
  - .agents/context/workspaces/ai/conversation.md
  - .agents/context/workspaces/memory-nucleus/overview.md
rules:
  - .agents/rules/architecture.rule.md
  - .agents/rules/markdown.rule.md
  - .agents/rules/memory-nucleus.rule.md
  - .agents/rules/product-safety-and-privacy.rule.md
  - .agents/rules/spec-driven-development.rule.md
adrs:
  - .agents/adrs/0003-authorization-before-retrieval.adr.md
  - .agents/adrs/0008-cost-first-background-memory-curation.adr.md
  - .agents/adrs/0012-memory-nucleus-layout.adr.md
  - .agents/adrs/0015-memory-nucleus-mvp-clean-architecture.adr.md
  - .agents/adrs/0016-shared-memory-sdk-observability-evaluation.adr.md
  - .agents/adrs/0023-direct-ai-conversation-topology.adr.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement-spec/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-015: Align the Memory Nucleus validation roadmap with repository reality

## Problem Statement

The previous roadmap branch was created before the canonical spec reorder, direct Conversation topology and semantic harness suffix migration. It now conflicts with `main`, references superseded paths and does not make the A/B treatment mathematically capable of proving the required context reduction. The current repository also needs one executable order that distinguishes already useful Memory primitives from product gates that remain unproved.

## Solution

Rebuild the roadmap on current `main`, preserve the semantic filename contract and define this mandatory progression:

```text
baseline → core → background → shadow/parity → A/B and canary → scale
```

The baseline supplies the comparison denominator. Core proves governed durable memory. Background proves operational formation. Shadow measures the exact future projection without affecting the response. A/B replaces longitudinal history with the authorized projection under a minimal versioned recent buffer. Scale consumes measured economics only after quality and privacy parity.

## User Stories

1. As a product owner, I want one dependency-ordered roadmap, so that each phase removes a specific technical or economic risk.
2. As an implementer, I want each spec to consume previous public seams without re-owning them, so that PRs remain bounded and reviewable.
3. As a privacy reviewer, I want authorization, deletion suppression and leakage proof before user-visible Memory activation.
4. As a cost owner, I want baseline, shadow and treatment measurements to remain comparable, so that Memory ROI is measured rather than asserted.
5. As a maintainer, I want suffixes and direct Conversation paths preserved through conflict resolution, so that the harness remains mechanically coherent.

## Scope

- Replace the stale roadmap diff with current `.spec.md`, `.rule.md`, `.adr.md` and `.audit.sh` paths.
- Establish priorities 022–028 for the roadmap and six executable phases without changing their durable IDs.
- Rewrite SPEC-009 as the real Ana/PWA serving baseline.
- Add SPEC-016 operational core hardening.
- Rewrite SPEC-012 as background-only curation and activation.
- Rewrite SPEC-011 as no-effect shadow/parity evaluation.
- Define SPEC-017 control/treatment substitution, canary and rollback.
- Define SPEC-018 economics and scale gates.
- Remove ADR-0011 as a normative dependency; use accepted current ADRs by responsibility.
- Repair the suffix-aware harness and CI checks without restoring `pnpm-lock.yaml`.

## Implementation Decisions

- Durable IDs remain stable; numeric filenames express priority only.
- Every numbered spec ends in `.spec.md`; every rule and ADR reference uses `.rule.md` and `.adr.md` respectively.
- Conversation is `workspaces/ai/conversation`; the removed orchestrator parent is not restored.
- The PDF's prices remain scenarios rather than approved plans.
- The phase gates are 50–70% comparable context reduction, critical-memory Recall@k above 90%, strong-model escalation below 5%, zero unauthorized leakage or consent violations, no quality regression, Memory ROI above 3x as healthy and above 5x as target, AI COGS 10% target and 20% ceiling, and normal retrieval with zero LLM calls.
- `netMemoryCost = memoryProcessingCost - avoidedServingCost` is the canonical sign convention.
- No product implementation is performed by this governance spec.

## Testing Decisions

### Primary seam

The flat catalog and the six phase contracts are reviewed together against current repository paths and the canonical Memory Nucleus PDF.

### Secondary seams

Suffix-aware spec and architecture audits, stale-reference checks, no-lockfile installation, dependency-order review and exact-head CI.

### Fixtures and privacy

This governance change uses repository documentation and synthetic examples only. It introduces no private conversation or Memory data.

### Required validation

Run `./cli/elo doctor --ci`, `./cli/elo check all`, full repository lint/typecheck/tests/evals/build, verify `pnpm-lock.yaml` remains absent, and complete independent Standards and PDF Spec-fidelity reviews on the exact final head.

## Acceptance Criteria

- [ ] The catalog exposes one executable dependency chain from baseline through scale.
- [ ] All affected harness paths preserve `.spec.md`, `.rule.md`, `.adr.md` and `.audit.sh` suffixes.
- [ ] Conversation references use `workspaces/ai/conversation` and do not restore the orchestrator parent.
- [ ] SPEC-017 requires Memory projection to replace longitudinal history rather than being appended to control context.
- [ ] SPEC-017 measures comparable served context and total model input while preserving all other experimental variables.
- [ ] ADR-0011 is absent from normative dependencies of the roadmap, core, background, shadow and economics specs.
- [ ] The baseline, core, background, shadow, A/B/canary and scale gates are non-overlapping and ordered.
- [ ] `pnpm-lock.yaml` remains absent and ignored.
- [ ] Full CI and both independent reviews pass on the exact final head.

## Failure Behavior

Any suffix regression, conflict, stale topology, ambiguous control/treatment contract, invalid phase dependency, red CI, missing review, leakage, quality regression or recreated lockfile blocks merge. A later phase cannot compensate for missing evidence in an earlier phase.

## Out of Scope

Product implementation, provider activation, production pricing, voice, multi-agent expansion, vector migration and claims that Memory ROI has already been achieved.

## Evidence and Promotion

Final evidence will include the suffix-aware catalog, six reconciled contracts, exact-head CI, conflict-free mergeability and the two independent reviews. Durable suffix and topology rules are promoted to `AGENTS.md`, architecture context and always-applied rules.

## Further Notes

This spec replaces the stale state of PR #19 while retaining its durable roadmap identity. The canonical source establishes a margin thesis and a de-risking sequence; it does not authorize skipping gates merely because lower-level primitives already exist.
