# AI workspace

`workspaces/ai/` owns AI-facing product capabilities.

- `conversation/`: conversation behavior, final context assembly and cognitive routing.
- `knowledge/`: isolated non-personal Knowledge retrieval/RAG.
- `agents/`: future product AI agent implementations; intentionally empty for this handoff.

AI may consume Memory Nucleus only through `@repo/memory-sdk`.
