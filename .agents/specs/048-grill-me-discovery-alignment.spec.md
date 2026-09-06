---
id: SPEC-048
title: Install grill-me and align owner-directed discovery gates
type: governance
status: implemented
mode: prospective
created: 2026-09-05
updated: 2026-09-05
owners:
  - Jonatas Sales
targets:
  - .agents
  - .audit
context:
  - .agents/context/engineering/workflow-skills.md
rules:
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - none
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/writing-for-agents/SKILL.md
evidence:
  - .agents/skills/grill-me/SKILL.md
  - .agents/skills/grilling/SKILL.md
  - skills-lock.json
  - .audit/workflow-skills.audit.sh
  - .agents/specs/readme.md
---

# SPEC-048: Install grill-me and align owner-directed discovery gates

## Problem Statement

The owner confirms SPEC-046/047 are completed in staging, closes SPEC-044 and requests a grill-me discovery session for SPEC-025 before the remaining Memory chain. The current skill inventory forbids the requested procedure and does not record the new execution hold.

## Solution

Install only the requested upstream grill-me procedure in the repository, integrate its local routing and inventory, and distinguish owner-reported delivery state from remotely verified evidence. Record the discovery gate without prematurely implementing product decisions.

## User Stories

1. As the owner, I can resolve SPEC-025 decisions through focused decision-frontier interview rounds.
2. As an implementation agent, I honor the updated execution hold and distinguish accepted completion from independently observed remote state.

## Scope

Project-local skill installation, skill inventory/audit alignment, owner-directed status recording and discovery gating. No application runtime change.

## Implementation Decisions

- The owner explicitly requests the upstream mattpocock/skills grill-me procedure. The installed version delegates to grilling: retain only this entry point and its required engine locally, never globally, preserving source metadata. The existing ten maintained procedures are not upgraded.
- Read the complete installed procedure before starting the session. Installation failure is reported; do not claim a missing skill is installed.
- Record SPEC-044 closure and SPEC-046/047 staging completion as owner-reported acceptance on 2026-09-05. No new remote inspection, merge SHA, CI run or branch-protection verification is claimed.
- SPEC-033 stays draft and owner-deferred, preserving its external-exposure safety gate.
- SPEC-016/012/011/043/017/018 execution waits for SPEC-025 discovery conclusion and reconciliation of affected contracts. Their existing technical dependency order remains intact.
- SPEC-025 remains draft during questioning; only explicit owner answers become decisions. Ending the interview does not itself implement billing or authorize guessed entitlements.
- Continue ZIP-only local work from the previously delivered commit, now owner-confirmed integrated in staging. Use a separate local branch without fetching or modifying the Amarelo remote. Local tickets are skill integration and owner-state/gate reconciliation.

## Testing Decisions

### Primary seam

Elo skill, canonical and spec audits against the installed procedure and updated catalog.

### Secondary seams

Verify the skill's local entry point and source metadata, no global/project-agent duplicate install, and no unrequested product or Memory implementation changes.

### Fixtures and privacy

Only public skill instructions and repository metadata. No account, health, billing or credential data.

### Required validation

Run scoped dependency-free Elo checks and diff-check. This documentation-only delivery does not claim remote CI or live repository-settings verification. Record local review findings and persist the changed project.

## Acceptance Criteria

- [x] Only the requested grill-me entry point and its required grilling engine are added to the local harness, with complete instructions read.
- [x] Routing and audits accept grill-me while retaining the previous maintained skills and rejecting retired packages.
- [x] Owner-confirmed completion is recorded with explicit evidence limits.
- [x] SPEC-025 discovery and the deferred/held execution boundaries are clear and no open product decision is invented.
- [x] Scoped validation passes and the changes are recorded locally.

## Failure Behavior

Missing upstream instructions or installation blockers stop an installation claim. Unresolved interview answers keep SPEC-025 draft and hold downstream implementation. Missing remote evidence remains explicitly unverified.

## Out of Scope

Product pricing decisions without owner answers, billing or entitlement implementation, Memory implementation, global skill installation, and remote Amarelo repository operations.

## Evidence and Promotion

Promote only the requested skill/routing, owner-reported status and session gate. Product answers belong to SPEC-025 and affected specs after explicit decisions.

Local validation: `./cli/elo check skills`, `specs`, `canonical` (including 17 regressions), `rules` and `git diff --check` pass on a clean exported checkout. Inventory is seven workflow procedures, two discovery entries and three project skills. No runtime code changed.

The requested npx invocation imported additional packages and overwrote six existing procedures. Those incidental changes were excluded from the delivered tracked tree; the previous ten maintained procedures remain unchanged apart from their inventory README. The new lock contains only grill-me and its required grilling engine. The entry point has one repository-local routing adaptation; engine instructions are unchanged. Upstream content identifiers remain in the lock.

The generic skill-creator validator passes grilling but does not recognize grill-me's upstream `disable-model-invocation` field. That explicit-invocation metadata is intentionally preserved, as in existing Amarelo procedures; this validator limitation is not reported as a pass. The local entry point and dependency are read completely and checked by the project audits.

External repository completion is owner-reported. No remote Amarelo access, new merge evidence, CI run, global skill installation or product entitlement implementation is claimed. This setup completion does not close the SPEC-025 interview.

## Further Notes

The owner requested installation and this discovery session before further Memory work on 2026-09-05. This spec governs setup, not the completion of the interview.
