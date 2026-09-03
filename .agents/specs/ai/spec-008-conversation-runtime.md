---
id: SPEC-008
title: Establish the framework-neutral Conversation turn runtime
type: feature
status: in-progress
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - @ai/conversation
  - cognitive routing
  - bounded context assembly
  - conversation assurance
context:
  - .agents/context/workspaces/ai/conversation.md
  - .agents/context/workspaces/ai/overview.md
rules:
  - .agents/rules/architecture.md
  - .agents/rules/context-engineering.md
  - .agents/rules/import-boundaries.md
  - .agents/rules/product-safety-and-privacy.md
  - .agents/rules/source-organization.md
  - .agents/rules/spec-driven-development.md
adrs:
  - .agents/adrs/0017-cognitive-routing-and-memory-boundary.md
  - .agents/adrs/0020-conversation-agent-port.md
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-tickets
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/implement
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/tdd
evidence:
  - https://github.com/NeonGate-AI/amarelo-v2/issues/5
  - red seam committed before implementation
---

# SPEC-008: Establish the framework-neutral Conversation turn runtime

## Problem Statement

The repository defines Conversation identifiers, cognitive-budget contracts and a Memory SDK context provider, but it does not yet have an executable turn-level use case. A transport or named agent wired directly to those fragments would need to decide routing, context budgets, memory failure behavior and output diagnostics itself.

Building Ana first would also risk coupling the orchestrator to LangChain types or creating a package cycle between `@ai/conversation` and `@ai/ana`. The product needs a stable framework-neutral seam that a LangChain agent, a Fastify service and assurance fixtures can all implement or consume independently.

## Solution

Create a validated Conversation turn runtime inside `@ai/conversation`.

The runtime accepts one current user message plus bounded recent history, chooses a deterministic Reflex, Contextual or Deliberative lane, selects recent history within the lane budget, optionally retrieves an authorized Memory Nucleus projection through a framework-neutral memory port, invokes a configured agent through a framework-neutral agent port and returns the response with routing, context, memory and model-usage diagnostics.

Conversation remains independent of LangChain, model providers and HTTP. Named agent workspaces implement the agent port in later specs. A memory retrieval failure exposes no memory and allows the current conversation to continue with explicit `unavailable` diagnostics.

## User Stories

1. As a conversation client, I want one validated turn contract, so that every transport submits the same bounded input.
2. As a product agent, I want a framework-neutral invocation contract, so that I can be implemented with LangChain without leaking LangChain into Conversation.
3. As a runtime maintainer, I want agent implementations resolved by stable agent ID, so that unsupported or duplicate agents fail explicitly.
4. As a cost engineer, I want deterministic cognitive lanes, so that simple turns do not automatically consume longitudinal memory or high reasoning budgets.
5. As a user saying a simple greeting or acknowledgement, I want a Reflex turn, so that latency and cost remain minimal.
6. As a user referring to prior context, I want a Contextual turn, so that a bounded longitudinal projection may inform the response.
7. As a user asking for a complex plan or analysis, I want a Deliberative turn, so that the runtime may allocate the largest bounded context and memory budget.
8. As a privacy reviewer, I want personal memory requested only through the approved SDK boundary, so that Conversation cannot bypass authorization.
9. As a user, I want the conversation to continue when memory infrastructure is unavailable, so that a retrieval outage does not automatically block support.
10. As a privacy reviewer, I want failed retrieval to produce an empty memory projection, so that failure cannot expose stale or partial personal data.
11. As an agent implementer, I want memory delivered as structured untrusted data, so that retrieved content is never interpreted as executable instructions.
12. As a runtime maintainer, I want recent history selected within an explicit estimate, so that a caller cannot grow context without bound.
13. As a product owner, I want response diagnostics for lane, budget, history and memory use, so that later cost and quality experiments are measurable.
14. As an evaluator, I want deterministic fixtures at the public use-case seam, so that routing and memory behavior can be verified without a provider key.
15. As a reviewer, I want this spec isolated from HTTP, PWA and queue work, so that the core contract remains independently reviewable.

## Scope

This spec owns:

- validated turn input and result contracts;
- bounded recent-message history;
- a provider-neutral Conversation agent port;
- a provider-neutral memory context port implemented by the existing Memory SDK provider;
- deterministic lane selection and cognitive budgets;
- a versioned provider-neutral history token estimator;
- the Conversation turn execution use case;
- explicit memory status and model-usage diagnostics;
- typed errors for invalid agent registry and missing agents;
- synthetic assurance fixtures and executable runtime evals;
- package scripts and dependencies required to execute those evals;
- updates to current Conversation context, routing behavior spec and the port-separation ADR.

## Implementation Decisions

- `@ai/conversation` owns the turn use case and public ports; it imports no LangChain or provider implementation.
- A named agent implements `ConversationAgentPort` and may depend on `@ai/conversation`; Conversation does not depend on named agent packages.
- The runtime registry rejects duplicate configured agent IDs and fails explicitly when the requested agent is absent.
- Input is runtime-validated with strict schemas before routing, retrieval or agent invocation.
- Recent history contains only `user` and `assistant` messages and has a hard item limit.
- Current user input is never silently truncated. History is selected newest-first within the lane context budget and restored to chronological order.
- The history estimate is deterministic, provider-neutral and versioned; it is an accounting guard, not a claim of tokenizer-perfect usage.
- Reflex is selected only for narrowly recognized greetings, acknowledgements and brief social turns.
- Contextual is the default lane.
- Deliberative is selected for explicitly complex planning, comparison, research or analysis requests and for unusually large input.
- Lane selection is deterministic code and uses zero LLM calls.
- Reflex allocates no longitudinal memory budget.
- Contextual allocates a bounded intermediate memory budget.
- Deliberative allocates the current Memory SDK maximum of 600 tokens.
- Memory retrieval receives the current message, timestamp, purpose and lane budget.
- A memory-port exception results in `unavailable`, an empty projection and continued agent invocation.
- Retrieved memory remains structured and marked `untrusted-memory-data` through the agent-port boundary.
- Agent failure is not converted into a fabricated response; it propagates as a typed runtime error.
- Result diagnostics identify selected lane, declared budgets, estimated context use, selected history count, memory status, memory request ID and used memory tokens.
- Model usage is optional and provider-described by the agent implementation.

## Testing Decisions

### Primary seam

The primary seam is `ConversationRuntime.execute()` with synthetic implementations of the agent and memory ports.

Tests observe only validated inputs, port calls, returned results and typed failures. They do not test private helpers or mock internal functions.

### Secondary seams

- The deterministic routing policy is evaluated with a small boundary-focused fixture table because route classification errors are easier to localize there.
- The history budget computation is evaluated with exact synthetic messages and an independent expected selection.
- Package typecheck verifies that no LangChain or provider type enters the public runtime contract.
- Repository architecture and import checks verify the Memory SDK boundary and package direction.

### Fixtures and privacy

All conversations, IDs, timestamps and memory statements are synthetic. No production transcript, patient identifier or personal record is authorized for this spec.

Memory fixtures retain the `untrusted-memory-data` marker. A failing memory fixture throws before returning any projection.

### Required validation

- Conversation runtime evals.
- `@ai/conversation` typecheck and test.
- Spec workflow audit.
- Architecture, import and Memory invariant audits.
- Repository typecheck, tests, evals and build through CI.

## Acceptance Criteria

- [ ] Turn input is strict, bounded and runtime-validated before dependency calls.
- [ ] The public agent port has no LangChain or provider-specific type.
- [ ] The public memory port is satisfied by the existing Memory SDK context provider.
- [ ] Duplicate configured agent IDs fail during runtime construction.
- [ ] An unconfigured requested agent fails with a typed error before model invocation.
- [ ] Reflex, Contextual and Deliberative routes are deterministic and make zero model calls.
- [ ] Reflex turns request no longitudinal memory.
- [ ] Contextual turns request at most the configured intermediate memory budget.
- [ ] Deliberative turns request at most 600 Memory SDK tokens.
- [ ] Recent history is selected within the declared context estimate and remains chronological.
- [ ] Successful memory retrieval reaches the agent only as structured untrusted projections.
- [ ] Memory retrieval failure yields an empty projection, `unavailable` diagnostics and continued agent invocation.
- [ ] Agent failure propagates as a typed runtime error without a fabricated answer.
- [ ] Results include routing, history, memory and optional model-usage diagnostics.
- [ ] Synthetic evals cover success, lane boundaries, unavailable memory, missing agent and duplicate registry cases.
- [ ] `@ai/conversation` exposes the runtime through its public package API.
- [ ] The living routing spec and Conversation context describe the implemented behavior.
- [ ] No LangChain agent, provider, HTTP route, PWA integration, queue or worker is implemented.
- [ ] Full repository CI passes.

## Failure Behavior

- Invalid IDs, timestamps, purposes, roles, message lengths or history sizes fail schema parsing before any external call.
- Duplicate agent IDs fail runtime construction.
- A missing agent fails with `ConversationAgentNotConfiguredError`.
- An agent exception is wrapped with `ConversationAgentInvocationError` while preserving the cause.
- A memory exception is not exposed to the agent or caller as memory content; the turn continues with explicit unavailable diagnostics.
- A history item that does not fit is omitted rather than partially truncated.
- A current message that consumes most of the context estimate reduces history selection but remains intact.

## Out of Scope

- Ana persona or LangChain `createAgent` implementation.
- Model-provider initialization and API keys.
- Tool execution.
- Knowledge RAG invocation.
- LangGraph checkpointers or short-term persistence.
- Fastify, HTTP, streaming or SSE.
- Mobile/PWA calls or UI state changes.
- Speech recognition and synthesis.
- Durable queues, background workers and Memory curation.
- PostgreSQL composition for Conversation.
- Nico or Isa implementation.
- Production quality, clinical or ROI claims.

## Evidence and Promotion

Current evidence:

- implementation issue #5;
- red assurance seam committed before the production runtime;
- package and repository validation pending after implementation.

Planned promotion:

- current runtime ownership and failure behavior to Conversation context;
- implemented lane budgets to the living routing spec;
- package direction and framework-neutral port tradeoff to ADR 0020;
- public contracts and executable evals to `@ai/conversation`;
- final evidence to this delivery spec.

## Further Notes

This spec deliberately creates the seam that the next named-agent spec will implement. The first concrete implementation is expected to be Ana using LangChain `createAgent`, with the model injected rather than created inside the persona package.
