# Amarelo

Amarelo is an AI-native, voice-first product organized as a monorepo with explicit product, AI and longitudinal-memory boundaries.

## Repository map

```text
workspaces/apps/      user-facing products/runtimes
workspaces/ai/        Conversation, Knowledge and future product Agents
workspaces/memory-nucleus/
                      longitudinal memory: Domain → Application → Infrastructure + Evals
workspaces/packages/  cross-workspace contracts/capabilities
.agents/              engineering/context harness
```

## Glossary

- **AI** — product AI capabilities.
- **Conversation** — interaction, final context assembly and cognitive routing.
- **Knowledge** — non-personal Knowledge/RAG retrieval.
- **Agents** — future product AI executors; distinct from `.agents` engineering context.
- **Memory Nucleus** — longitudinal memory formation, judgment, retrieval, projection and economics.
- **Evaluation** — answers “was it good?”.
- **Observability** — records and transports “what happened?”.
- **Judgment** — semantic decisions that cannot be reduced to deterministic policy.
- **Cognitive lane** — Reflex, Contextual or Deliberative routing for an interaction.

Engineering agents start at [`agents.md`](./agents.md).
