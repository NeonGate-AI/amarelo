---
id: SPEC-006
title: Establish the Amarelo spec-driven delivery workflow
type: governance
status: in-progress
mode: bootstrap
created: 2026-09-02
updated: 2026-09-02
owners:
  - Jonatas Sales
targets:
  - engineering harness
  - specification governance
  - Elo checks
  - continuous integration
context:
  - AGENTS.md
rules:
  - .agents/rules/architecture.md
  - .agents/rules/context-engineering.md
  - .agents/rules/markdown.md
adrs:
  - .agents/adrs/0018-spec-driven-delivery.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-tickets
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/implement
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/code-review
evidence:
  - commit dfab038e2e8f43fb1cbcc194016fbf7c90717f61
  - commit 68d62c717b9beb0a6f1e3d61fbd26ac8ce8fa0a7
  - local ./cli/elo check specs PASS
  - pull-request CI pending
---

# SPEC-006: Establish the Amarelo spec-driven delivery workflow

## Problem Statement

Amarelo has durable rules, context, behavior specs, ADRs and mechanical checks, but previous engineering cycles were coordinated through large handoff artifacts. Those handoffs mixed desired behavior, implementation instructions, temporary status and historical explanation. There was no single required path from an owner decision to an approved implementation contract, vertical task graph, acceptance evidence and harness promotion.

Prior work also lacks delivery specs written in the new format. Without a bounded retrospective reconstruction, future agents would understand current files but not the capability groups and limitations that produced them.

## Solution

Establish a repository-owned spec-driven workflow based on the stable `to-spec`, `to-tickets`, `implement`, `tdd` and two-axis review practices from `NeonGate-AI/skills`.

The workflow will distinguish living behavior specs from numbered delivery specs, define a lifecycle and status model, provide one canonical template, make spec loading an always-applied rule, reconstruct pre-workflow capabilities through evidence-bound retrospective specs and add a structural Elo/CI check.

Handoff 4 is limited to this process foundation. Product implementation resumes with `SPEC-007` or a later prospective spec. There is no Handoff 4.5.

## User Stories

1. As the product owner, I want one approved contract for each bounded change, so that implementation cannot drift away from the decision I accepted.
2. As an implementing agent, I want explicit scope, dependencies, seams and completion criteria, so that I can execute without reconstructing the task from chat history.
3. As a reviewer, I want standards and spec fidelity reviewed separately, so that good code cannot hide wrong behavior and correct behavior cannot hide architectural violations.
4. As a future maintainer, I want prior capability groups reconstructed with evidence and limitations, so that historical context is useful without becoming fictional.
5. As a platform maintainer, I want malformed or duplicate numbered specs rejected mechanically, so that workflow drift is visible in CI.
6. As the product owner, I want handoffs retired as the planning authority after this transition, so that the next work begins directly from a numbered spec.

## Scope

This change owns:

- the canonical spec workflow and vocabulary;
- the numbered delivery spec template and status model;
- the distinction between living behavior specs and historical delivery specs;
- an always-applied spec-driven development rule;
- the consequential workflow ADR;
- retrospective specs for the main pre-workflow capability groups;
- a structural checker exposed through Elo and CI;
- a short loading pointer in `AGENTS.md`.

It does not modify application behavior or relocate workspaces.

## Implementation Decisions

- The repository owns the canonical workflow in `.agents/specs/workflow.md`; external skills are source methods, not runtime dependencies.
- New delivery specs use stable sequential IDs and lowercase filenames.
- GitHub Issues are derived vertical tickets and never replace the delivery spec.
- A prospective spec must be `ready` before implementation and becomes `in-progress` on the first implementation change.
- Implemented delivery specs remain historical. Current behavior continues to be expressed through area behavior specs.
- Retrospective specs are grouped by coherent capability, not by individual commit.
- Retrospective claims are limited by code, commit, pull-request and harness evidence.
- This bootstrap spec is the one-time transition exception to the prospective-ready rule because the workflow did not exist before it could authorize itself.
- Structural validation checks document contracts and unique IDs. Human approval and semantic review remain non-mechanical gates.

## Testing Decisions

### Primary seam

The primary seam is the repository command:

```text
./cli/elo check specs
```

It must inspect numbered delivery specs and report malformed metadata, duplicate IDs, invalid status/mode combinations, missing required sections and missing retrospective integrity statements.

### Secondary seams

- Elo help and dispatch expose the new check without taking ownership of build, test or typecheck task graphs.
- CI executes the same command from a clean checkout.
- The root harness points to the workflow and active spec.

### Fixtures and privacy

The checker operates only on committed Markdown and repository metadata. It must not read product user data. Retrospective specs use repository paths, commit identifiers and pull-request links only.

### Required validation

- Spec workflow audit.
- Elo platform audit.
- Architecture audit.
- Import boundaries audit.
- Memory invariants audit.
- Markdown and frontmatter manual review.
- Existing repository lint, typecheck, tests, evals and build through CI.

## Acceptance Criteria

- [x] `workflow.md` defines discovery, synthesis, approval, decomposition, execution, review, evidence, promotion and closure.
- [x] `template.md` encodes the metadata and sections required for prospective and retrospective delivery specs.
- [x] An always-applied rule requires a ready numbered spec before implementation.
- [x] ADR 0018 records the replacement of handoff-driven planning with spec-driven delivery.
- [x] `AGENTS.md` directs agents to load the workflow and active spec.
- [x] `SPEC-001` through `SPEC-005` reconstruct the major pre-workflow capabilities without claiming fictional prior process.
- [x] Elo exposes `check specs` and CI executes it.
- [x] The structural checker passes for all numbered delivery specs.
- [ ] Existing repository validation remains green.
- [x] Handoff 4 contains no product runtime, PWA, agent, Fastify, queue or workspace relocation implementation.
- [x] The next available delivery ID is documented as `SPEC-007`.
- [x] No Handoff 4.5 artifact is created.

## Failure Behavior

- A draft or malformed spec blocks implementation.
- Duplicate spec IDs fail the structural check.
- A retrospective spec without evidence or an integrity statement fails the structural check.
- A failed Standards or Spec review axis blocks closure.
- If CI reveals that the checker conflicts with an existing repository invariant, the workflow change remains in progress until the conflict is resolved rather than weakening either check silently.
- This branch can be abandoned without altering product runtime behavior because the change is confined to governance, documentation and validation tooling.

## Out of Scope

- Moving Conversation under `workspaces/ai/orchestrator/`.
- Implementing Ana with LangChain.
- Creating a Fastify conversation service.
- Connecting the Vite PWA to a real model.
- Integrating Memory Nucleus into serving.
- Adding queues, workers or background curation.
- Creating Nico, Isa or multi-agent routing.
- Changing deployment, SSO or Edge architecture.
- Proving Memory ROI or production economics.

## Evidence and Promotion

Current evidence:

- workflow foundation commit `dfab038e2e8f43fb1cbcc194016fbf7c90717f61`;
- retrospective history commit `68d62c717b9beb0a6f1e3d61fbd26ac8ce8fa0a7`;
- local `./cli/elo check specs` result: `Spec workflow PASS - 6 delivery specs`;
- full pull-request CI remains the closure gate;
- two-axis review is recorded in the pull request.

Promotion:

- workflow procedure to `.agents/specs/workflow.md`;
- durable constraint to `.agents/rules/spec-driven-development.md`;
- consequential tradeoff to ADR 0018;
- historical delivery context to `.agents/specs/history/`;
- mechanical contract to the Elo spec checker.

## Further Notes

The first post-bootstrap product change should create a new prospective spec for the first agentic PWA conversation. That later spec should record the owner decision to use `workspaces/ai/orchestrator/conversation`, preserve package name `@ai/conversation`, use a minimal Fastify Node service and keep durable memory workers outside Edge runtimes.

This document is a bootstrap spec, not a retrospective spec. It records the transition while it is being made and will be closed only after its own checks and repository CI pass.
