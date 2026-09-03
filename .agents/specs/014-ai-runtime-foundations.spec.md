---
id: SPEC-004
title: Establish the AI runtime boundaries and Ana agent scaffold
type: refactor
status: implemented
mode: retrospective
created: 2026-09-02
updated: 2026-09-02
owners:
  - Jonatas Sales
targets:
  - workspaces/ai/conversation
  - workspaces/ai/agents/ana
  - workspaces/ai/knowledge
context:
  - .agents/context/workspaces/ai/
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/007-package-ownership.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
adrs:
  - .agents/adrs/
skills:
  - .agents/skills/
evidence:
  - https://github.com/NeonGate-AI/amarelo-v2/pull/1
  - workspaces/ai/conversation/src/
  - workspaces/ai/agents/ana/src/
  - commit 21d2ac9c34b0cd0c68caefe5502256143e729e39
  - commit 13f0e3c82087c5b59be8f48308e3c7f0c100d1
---

# SPEC-004: Establish the AI runtime boundaries and Ana agent scaffold

## Problem Statement

Product agents, conversation orchestration, shared knowledge and personal memory have different ownership and security boundaries. Treating them as one package would couple agent identity to transport, provider, routing and Memory Nucleus internals.

The repository needed an initial topology that could support named product agents while keeping Conversation responsible for the current interaction and ensuring personal memory is consumed only through its public SDK.

## Solution

Create independently declared product-agent workspaces under `workspaces/ai/agents/`, beginning with the Ana identity scaffold in `@ai/ana`.

Keep `@ai/conversation` as the owner of current-interaction contracts, final context assembly, memory projection and cognitive routing. Represent Reflex, Contextual and Deliberative as internal routing lanes with explicit budgets rather than separate packages.

Connect Conversation to `@repo/memory-sdk` through a `MemoryContextProvider` that returns structured projections, a memory request ID and used token budget. Keep Knowledge an independent AI capability.

## User Stories

1. As a product maintainer, I want each named agent to own an independent package boundary, so that agent-specific behavior can evolve without a generic parent package.
2. As a conversation-runtime maintainer, I want routing and context assembly outside the named agent, so that Ana does not own transport or system-wide policy.
3. As a privacy reviewer, I want Conversation to consume personal memory only through the SDK, so that it cannot bypass authorization and governance.
4. As a cost engineer, I want explicit cognitive and memory budgets, so that every turn does not default to maximum context and reasoning.
5. As a future agent implementer, I want Ana's identity separated from provider wiring, so that model selection can change without redefining the product agent.
6. As a reviewer, I want unimplemented runtime behavior stated explicitly, so that a scaffold is not mistaken for a functioning agent.

## Scope

The reconstructed foundation includes:

- independent `@ai/ana` workspace and identity constant;
- `@ai/conversation` public package;
- supported agent identifiers;
- cognitive routing contract;
- memory context provider through `@repo/memory-sdk`;
- AI workspace context explaining agent and Conversation ownership;
- Knowledge as a separate capability boundary.

## Implementation Decisions

- `workspaces/ai/agents/` is a parent directory, not a package.
- Every named product agent owns its own package, TypeScript configuration and source root.
- Ana currently owns identity only.
- Conversation owns current interaction, final context assembly, tools, agent-facing behavior and routing.
- Reflex, Contextual and Deliberative are routing lanes internal to Conversation.
- Routing decisions carry context tokens, memory tokens, reasoning level and permissions for knowledge/tools.
- Conversation uses Memory Nucleus through `@repo/memory-sdk`; direct `@nucleus/memory` imports are forbidden.
- Memory projections remain structured data and include budget usage.
- Provider wiring, prompts, tools and agent-loop behavior are not inferred from the scaffold.

## Testing Decisions

### Primary seam

The primary observed seam is package compilation and public-contract consumption across `@ai/conversation`, `@ai/ana` and `@repo/memory-sdk`.

### Secondary seams

- Architecture check for product-agent workspace topology.
- Memory SDK import boundary.
- Routing contract typecheck.
- Memory projection contract and SDK assurance.

### Fixtures and privacy

No real model or personal user data is required by the current scaffold. Memory-related tests use authorized synthetic fixtures.

### Required validation

Pull request #1 reports typecheck of `@ai/ana`, Conversation, Memory SDK and the repository task graph after the workspace split and import migration.

## Acceptance Criteria

- [x] `workspaces/ai/agents/` is only a parent for named agent workspaces.
- [x] Ana exists as independent package `@ai/ana`.
- [x] Ana has a stable product-agent identity.
- [x] `@ai/conversation` owns current interaction and routing contracts.
- [x] Reflex, Contextual and Deliberative are represented as internal lanes.
- [x] Cognitive budget fields exist for context, memory, reasoning, knowledge and tools.
- [x] Conversation retrieves personal memory through `@repo/memory-sdk`.
- [x] Memory context exposes structured projections, request correlation and used token budget.
- [x] No current code is represented as a complete production Ana agent.
- [x] No current code is represented as a PWA-to-LLM conversation service.

## Failure Behavior

- A package directly under `workspaces/ai/agents/` rather than a named subdirectory violates the topology.
- A direct AI import of `@nucleus/memory` fails the architecture boundary.
- A Conversation memory request that fails SDK validation does not produce an untyped context payload.
- Unsupported agent identifiers fail the conversation contract guard.
- Missing provider or runtime wiring remains an explicit unimplemented capability rather than a hidden fallback.

## Out of Scope

- LangChain `createAgent` wiring for Ana.
- Provider/model configuration.
- Ana prompts, tools or clinical behavior.
- Fastify transport.
- Streaming or voice.
- Conversation persistence/checkpointing.
- Queue-based memory curation.
- Nico and Isa implementations.
- Moving Conversation under the future `orchestrator` parent.

## Evidence and Promotion

Primary evidence is the current AI source, package manifests, workspace context, the listed commits and pull request #1.

Durable ownership was promoted into AI context, architecture rules, package namespaces and the memory SDK boundary check.

## Further Notes

After the spec workflow bootstrap, the owner has selected `workspaces/ai/orchestrator/conversation` as the future physical topology while retaining package name `@ai/conversation`. That move and the first real PWA conversation require a prospective delivery spec and are not part of this retrospective record.

## Retrospective Integrity

This spec was written after the AI workspace boundaries were implemented. It reconstructs a coherent foundation from current code, current context and commit evidence.

It does not claim Ana is already a LangChain agent, that Conversation has an HTTP runtime or that the original work was executed from these user stories and acceptance criteria.
