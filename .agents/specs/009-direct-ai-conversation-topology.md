---
id: SPEC-027
title: Move Conversation directly under the AI workspace
type: refactor
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - workspaces/ai/conversation
  - workspaces/ai/orchestrator/conversation
  - pnpm-workspace.yaml
  - workspaces/packages/runtime
  - AI architecture harness
context:
  - .agents/context/architecture/overview.md
  - .agents/context/workspaces/ai/overview.md
  - .agents/context/workspaces/ai/conversation.md
rules:
  - .agents/rules/architecture.md
  - .agents/rules/import-boundaries.md
  - .agents/rules/source-organization.md
  - .agents/rules/spec-driven-development.md
adrs:
  - .agents/adrs/0019-ai-orchestrator-topology.md
  - .agents/adrs/0020-conversation-agent-port.md
  - .agents/adrs/0023-direct-ai-conversation-topology.md
skills:
  - .agents/skills/spec-driven-development/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - workspaces/ai/conversation package tree with preserved source blobs and public package identity
  - .agents/adrs/0023-direct-ai-conversation-topology.md accepted topology decision
  - .audit/architecture.script.sh direct-path and retired-parent checks
  - workspaces/packages/runtime Docker and Compose no-lockfile-compatible bootstrap
  - pull request 21 final GitHub Actions CI and exact-head independent reviews
---

# SPEC-027: Move Conversation directly under the AI workspace

## Problem Statement

`@ai/conversation` was nested under the structural `workspaces/ai/orchestrator/` parent even though it was the only coordination runtime in that family. The extra directory added workspace discovery, runtime-volume, documentation and audit complexity without representing an independently useful ownership boundary. It also placed a generic architectural category between AI and the concrete Conversation package while the repository already relied on package identity and framework-neutral ports to preserve the true boundary.

The owner selected the simpler topology: Conversation lives directly under `workspaces/ai/`. The migration must not alter routing, history budgeting, Memory access, agent invocation, public exports or package identity.

## Solution

Move the complete Conversation workspace from `workspaces/ai/orchestrator/conversation/` to `workspaces/ai/conversation/`. Preserve package name `@ai/conversation`, source layout, public exports, framework-neutral `ConversationAgentPort`, Memory SDK boundary, deterministic routing and all existing eval behavior.

Remove the empty `orchestrator/` structural parent and its workspace glob. Supersede ADR-0019 with ADR-0023, update current context/rules/spec references, repair runtime bootstrap paths and enforce the direct topology mechanically. Historical records may describe the former topology but point to the superseding decision rather than act as current normative guidance.

## User Stories

1. As a maintainer, I want Conversation at one direct and predictable AI path, so that navigation and workspace composition do not require an unnecessary category level.
2. As an AI implementer, I want the package name and public ports preserved, so that the move does not trigger a runtime or consumer rewrite.
3. As a reviewer, I want a mechanical invariant rejecting the retired parent, so that stale configuration cannot silently recreate the old topology.
4. As a local-runtime user, I want Docker and pnpm bootstrap paths to match the repository and its no-lockfile policy, so that the development environment does not fail on files that must remain absent.

## Scope

- Move every tracked file in `workspaces/ai/orchestrator/conversation/` to `workspaces/ai/conversation/` without semantic source changes.
- Remove `workspaces/ai/orchestrator/` and its pnpm workspace glob.
- Preserve package identity `@ai/conversation`, exports, scripts, TypeScript aliases and Turbo tasks.
- Preserve `ConversationAgentPort`, turn contracts, deterministic routing, history budgeting, Memory context provider and runtime diagnostics.
- Update architecture entrypoints, context, rules, current specs, ADRs and package/runtime documentation.
- Repair local runtime Docker/Compose installation commands to comply with the deliberate absence of `pnpm-lock.yaml`.
- Extend mechanical checks to require exactly one direct Conversation workspace and reject the old parent/path.
- Run the complete repository CI and two independent reviews on the final head.

## Implementation Decisions

- `workspaces/ai/conversation/` is the canonical physical path; `@ai/conversation` remains the canonical package identity.
- `workspaces/ai/agents/` remains a structural parent because it contains independently packaged named agents. No equivalent parent is retained for one coordination runtime.
- Package and port boundaries, not a generic directory name, express Conversation ownership.
- A future coordination family may receive a structural parent only after at least two independently owned runtimes demonstrate the need and a new ADR accepts the topology.
- This is a path-only refactor for Conversation source. It adds no Fastify app, model provider, named-agent adapter, Memory serving behavior, queue or product feature.
- Runtime bootstrap uses pnpm's no-lockfile-compatible install behavior. The migration does not create, copy, require or document `pnpm-lock.yaml` as present.
- Historical specs and ADRs remain readable; current context and prospective work reference ADR-0023 and the direct path.

## Testing Decisions

### Primary seam

The public `@ai/conversation` package and its existing runtime evals are the primary seam. Imports and behavior remain unchanged while the resolved workspace path moves.

### Secondary seams

- Architecture audit requires the direct path exactly once and rejects `workspaces/ai/orchestrator`.
- Workspace discovery verifies pnpm resolves `@ai/conversation` through `workspaces/ai/*` without a dedicated orchestrator glob.
- Import/export audits verify package identity and public barrels.
- Runtime Docker/Compose inspection verifies direct paths and no-lockfile-compatible installation.
- Repository-wide stale-reference scans identify obsolete current-path claims.

### Fixtures and privacy

Existing synthetic Conversation fixtures remain unchanged. This refactor introduces no personal data, provider calls or new telemetry.

### Required validation

Run `./cli/elo doctor --ci`, `./cli/elo check all`, Conversation typecheck/tests/evals, repository lint/typecheck/tests, PostgreSQL Memory validation, AI evals, full build and Git-hook smoke tests. Review the final diff independently for Standards and SPEC-027 fidelity.

## Acceptance Criteria

- [x] `@ai/conversation` exists exactly once at `workspaces/ai/conversation/`.
- [x] `workspaces/ai/orchestrator/` and its workspace glob are absent.
- [x] Conversation package name, exports, scripts, source modules and public behavior remain unchanged.
- [x] `ConversationAgentPort`, deterministic routing, history budgets, Memory SDK boundary and diagnostics retain their existing tests/evals.
- [x] Current architecture context, rules, prospective specs and package/runtime documentation use the direct path and ADR-0023.
- [x] ADR-0019 is explicitly superseded by ADR-0023 while historical evidence remains readable.
- [x] Architecture checks require the direct path and reject the retired topology.
- [x] Docker/Compose bootstrap no longer copies, requires or freezes against an absent `pnpm-lock.yaml`.
- [x] `pnpm-lock.yaml` remains absent and ignored.
- [x] Full CI and both independent review axes pass on the exact final head.

## Failure Behavior

A duplicate `@ai/conversation` package, surviving old directory, unresolved workspace, changed public export, stale normative path, lockfile creation or behavioral eval regression blocks merge. Runtime bootstrap fails explicitly on real dependency/network errors; it does not manufacture a lockfile requirement. Any semantic Conversation change is removed or moved to its owning later spec.

## Out of Scope

Ana model instructions, Fastify `conversation-api`, browser SDK, PWA HTTP integration, Memory background processing, shadow serving, A/B experiments, voice transport, Knowledge integration and provider selection are not part of this topology refactor.

## Evidence and Promotion

The Git tree move, package-resolution and architecture audits, unchanged Conversation evals, runtime bootstrap checks, full CI and exact-head reviews provide the evidence. The accepted direct topology is promoted to ADR-0023, architecture context, rules and mechanical checks.

## Further Notes

SPEC-027 supersedes only the physical topology decision represented by ADR-0019. It does not supersede SPEC-008's Conversation runtime behavior or ADR-0020's framework-neutral agent port.
