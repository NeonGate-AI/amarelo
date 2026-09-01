# Agent Skills

Skills are durable, on-demand operational context. They live outside the always-applied rules so agents can load specialized guidance only when a task needs it.

## Loading

1. Start from `AGENTS.md` and apply every rule marked `alwaysApply: true`.
2. Inspect this directory for a skill whose scope matches the current task.
3. Read that skill's `SKILL.md` before implementing the specialized work.
4. Follow repository rules and product/spec decisions over generic guidance inside a restored skill when they differ.

## Available skills

- accessibility
- agent-memory-systems
- best-practices
- context-engineering
- core-web-vitals
- deep-agents-core
- deep-agents-memory
- deep-agents-orchestration
- documentation-and-adrs
- frontend-ui-engineering
- langchain-architecture
- langchain-fundamentals
- langchain-middleware
- langchain-rag
- langchain-typescript-quickstart
- langgraph-docs
- langgraph-human-in-the-loop
- langgraph-persistence
- managed-deep-agents
- performance
- pwa-development
- seo
- spec-driven-development
- web-quality-audit

Restored skills retain their original supporting `references/` and `scripts/` files where applicable. Repository-specific rules remain authoritative.
