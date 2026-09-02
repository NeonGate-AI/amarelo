# Product agents context

`workspaces/ai/agents/` is the parent directory for independently declared runtime/product agent workspaces. It is not itself a package and it is not the engineering `.agents/` harness.

Each product agent owns its package and source boundary:

```text
workspaces/ai/agents/<agent>/
  package.json
  tsconfig.json
  src/
```

Ana is the first scaffold at `workspaces/ai/agents/ana/`, with package name `@ai/ana` and implementation under `workspaces/ai/agents/ana/src/`. The scaffold establishes Ana's product-agent identity and package/source boundary only; it does not claim provider wiring, orchestration, tools, prompts, or production runtime behavior that has not been implemented.

Product agents may later consume approved Memory Nucleus capabilities through `@repo/memory-sdk`; they must not import Memory Nucleus internals.
