# ADR 0023: Keep Conversation directly under the AI workspace

## Status

Accepted on 2026-09-03. Supersedes ADR-0019.

## Context

`@ai/conversation` is the repository's only current-interaction coordination runtime. ADR-0019 placed it under a generic `workspaces/ai/orchestrator/` structural parent to distinguish coordination from named agents. In practice, the parent owns no package or behavior and contains one child. It therefore adds navigation, workspace-glob, runtime-volume, documentation and audit surface without protecting a boundary that is not already expressed by package identity, public exports and framework-neutral ports.

`workspaces/ai/agents/` remains justified because it contains independently packaged named product agents. Conversation is itself the concrete capability and does not need a single-child category parent.

## Decision

Move the complete Conversation workspace to `workspaces/ai/conversation/` and remove `workspaces/ai/orchestrator/`.

Preserve:

- package identity `@ai/conversation`;
- the public package exports;
- `ConversationAgentPort` as the framework-neutral named-agent boundary;
- deterministic Reflex, Contextual and Deliberative routing;
- bounded recent-history selection;
- Memory Nucleus consumption through `@repo/memory-sdk` only;
- normalized invocation and diagnostics;
- existing tests and eval behavior.

`workspaces/ai/agents/` remains a structural parent that owns no package, source root or TypeScript configuration. Conversation and Knowledge are direct concrete AI workspaces. A future structural coordination parent requires at least two independently owned runtimes, an accepted ADR and evidence that the grouping reduces rather than adds ambiguity.

Local runtime and pnpm configuration must follow the direct path. ADR-0024 supersedes the former no-lockfile clause: Docker and Compose copy and install from the tracked `pnpm-lock.yaml` with frozen-lockfile behavior.

## Alternatives considered

- **Keep the orchestrator parent:** rejected because one child does not justify the extra category and package/port boundaries already express ownership.
- **Make orchestrator a package:** rejected because it would duplicate ownership with Conversation and introduce a generic god-runtime risk.
- **Move orchestration into Ana:** rejected because Conversation coordinates named agents and remains framework/provider neutral.
- **Flatten named agents too:** rejected because multiple named agent workspaces already form a demonstrated family.

## Consequences

- The common Conversation path is shorter and matches the package's concrete ownership.
- `workspaces/ai/*` discovers Conversation without a dedicated nested workspace glob.
- Runtime Docker/Compose paths align with the source tree and the tracked-lockfile policy in ADR-0024.
- Historical ADR-0019 and its delivery record remain readable but are no longer normative.
- A mechanical architecture check rejects recreation of `workspaces/ai/orchestrator`.
- Future coordination work must either extend `@ai/conversation` within its contract or justify a new independent runtime and topology decision.
