# Product agents context

`workspaces/ai/agents/` is reserved for runtime/product AI agents. It is not the engineering `.agents/` harness.

Handoff 3.5 introduces the first source scaffold under `src/ana/`. The scaffold establishes Ana's product-agent identity and source boundary only; it does not claim provider wiring, orchestration, tools, prompts, or production runtime behavior that has not been implemented.

Product agents may later consume approved Memory Nucleus capabilities through `@repo/memory-sdk`; they must not import Memory Nucleus internals.
