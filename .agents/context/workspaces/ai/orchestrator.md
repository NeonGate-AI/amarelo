# AI Orchestrator context

`workspaces/ai/orchestrator/` is a topology parent for independently declared runtime-orchestration workspaces. It is not a package and owns no `package.json`, `tsconfig.json`, `src/` or parent barrel.

Conversation is the first child at `workspaces/ai/orchestrator/conversation/` and remains package `@ai/conversation`. Conversation owns the current interaction: deterministic cognitive routing, final context assembly, agent invocation, tools and agent-facing runtime behavior.

Named product agents remain under `workspaces/ai/agents/`. Knowledge remains an independent AI capability. Personal longitudinal memory is consumed through `@repo/memory-sdk`; Orchestrator children do not import Memory Nucleus internals.
