# Agent Skills

Skills are durable, on-demand operational context. Repository rules and numbered specs remain authoritative when generic guidance differs.

## Loading

1. Start from `AGENTS.md` and apply every rule marked `alwaysApply: true`.
2. Load `.agents/specs/workflow.md` and the active `.spec.md` contract for delivery work.
3. Read only the local `SKILL.md` procedures required for the current phase or domain.
4. Use repository-local paths as normative references. External skill repositories are attribution or historical provenance only.

## Canonical engineering workflow procedures

The end-to-end lifecycle is owned by `.agents/specs/workflow.md`. These seven local procedures support it:

- [to-spec](to-spec/SKILL.md)
- [to-tickets](to-tickets/SKILL.md)
- [implement](implement/SKILL.md)
- [tdd](tdd/SKILL.md)
- [code-review](code-review/SKILL.md)
- [domain-modeling](domain-modeling/SKILL.md)
- [writing-for-agents](writing-for-agents/SKILL.md)

They are the only retained workflow skills from the Matt Pocock import lineage. They are adapted to Amarelo and do not depend on its deleted router, setup, triage or session-management skills.

## Project and domain skills

These independently sourced or project-native skills remain available:

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

Supporting `references/`, `scripts/`, `agents/` and companion Markdown remain colocated with an owning retained skill when applicable.
