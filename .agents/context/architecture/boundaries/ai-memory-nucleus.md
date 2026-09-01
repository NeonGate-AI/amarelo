# AI ↔ Memory Nucleus boundary

```text
@ai/conversation
      │
      ▼
@repo/memory-sdk
      │
      ▼
@nucleus/memory
```

AI owns conversation behavior, context assembly, tools, routing and product agents. Memory Nucleus owns longitudinal-memory formation, judgment, canonical state, retrieval, projection, lifecycle and memory economics. AI must never import Nucleus internals.

The model may propose memory; deterministic policy decides what becomes canonical memory. Memory Nucleus returns structured memory projections; Conversation owns final LLM context.
