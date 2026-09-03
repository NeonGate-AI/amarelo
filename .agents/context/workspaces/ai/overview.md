# AI workspace

`workspaces/ai/` owns AI-facing product capabilities.

- `agents/`: structural parent for independently packaged product agents such as `@ai/ana`.
- `orchestrator/`: structural parent for independently packaged coordination runtimes.
- `orchestrator/conversation/`: `@ai/conversation`, which owns current-interaction behavior, final context assembly and cognitive routing.
- `knowledge/`: isolated non-personal Knowledge retrieval/RAG.

The `agents/` and `orchestrator/` parents own no `package.json`, `tsconfig.json` or `src/` of their own. AI may consume Memory Nucleus only through `@repo/memory-sdk`.
