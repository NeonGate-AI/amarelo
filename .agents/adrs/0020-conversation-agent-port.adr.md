---
id: ADR-0020
title: Separate Conversation orchestration from named agent implementations
status: accepted
date: 2026-09-03
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0020: Separate Conversation orchestration from named agent implementations

## Status

Accepted on 2026-09-03.

## Context

Conversation must coordinate validated user turns, cognitive budgets, recent history and authorized longitudinal memory. Ana and future named agents need provider-specific implementation details such as LangChain agent graphs, persona prompts and model adapters.

If Conversation imported `@ai/ana`, the central orchestrator would depend on a named product agent. If Ana also reused Conversation contracts, that would create a package cycle. Moving LangChain types into Conversation would avoid that cycle but would couple the product-wide runtime seam to one framework and make transport and assurance code provider-aware.

A generic shared agent-runtime package was also considered. No second consumer currently demonstrates shared ownership, so introducing that package would be speculative generality.

## Decision

`@ai/conversation` owns a framework-neutral `ConversationAgentPort` and the executable turn use case.

Named product-agent packages may depend on `@ai/conversation` and implement that port. Conversation does not import named product-agent packages. The service composition root injects the concrete agent implementations into Conversation's registry.

The port carries validated recent messages, structured untrusted Memory projections, the selected routing decision and correlation identifiers. It returns response text plus optional provider/model usage. It carries no LangChain, provider or transport type.

Conversation also owns a framework-neutral Memory context port. The existing Memory SDK provider implements it. Memory retrieval failure is fail-closed for exposure and fail-open for the current turn: no memory reaches the agent, while the agent may respond without longitudinal context.

## Consequences

- Conversation can be tested without provider credentials.
- Ana can use LangChain without making LangChain part of the orchestration contract.
- Dependency direction is one-way from named agents to Conversation.
- A backend composition root is required to instantiate and inject concrete agents.
- Agent result validation and usage accounting occur at the Conversation boundary.
- Adding a second orchestration consumer may later justify a shared package, but the current design does not create one preemptively.
