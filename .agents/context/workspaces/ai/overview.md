# AI workspace

`workspaces/ai/` owns AI-facing product capabilities.

- `agents/`: structural parent for independently packaged product agents such as `@ai/ana`.
- `conversation/`: `@ai/conversation`, which owns current-interaction behavior, final context assembly and deterministic cognitive routing.
- `knowledge/`: isolated non-personal Knowledge retrieval/RAG.

The `agents/` parent owns no `package.json`, `tsconfig.json` or `src/` of its own. Conversation and Knowledge are direct concrete workspaces. AI may consume Memory Nucleus only through `@repo/memory-sdk`.
