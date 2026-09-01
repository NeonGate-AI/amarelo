# Amarelo engineering harness

This is the canonical engineering-agent entry point for the monorepo.

Before modifying project code, load every `.agents/rules/*.md` rule whose frontmatter declares `alwaysApply: true`. Then load only the additional context required for the active area.

## Navigate

- Understand the system or a workspace → `.agents/context/`
- Obey durable constraints → `.agents/rules/`
- Satisfy required behavior → `.agents/specs/`
- Understand consequential decisions → `.agents/adrs/`
- Follow a reusable engineering procedure → `.agents/skills/`

Start from `.agents/context/workspaces/<area>/` when an area manifest exists. Follow referenced scoped rules/specs/ADRs instead of loading the whole harness.

## Evidence is not canonical context

`.audit/` is a temporary execution-evidence plane. Do not treat audit artifacts as rules, context, specs, ADRs, or skills. Promote durable conclusions into `.agents/` before deleting the corresponding audit output.

## Non-negotiable boundaries

- Personal memory is private by default; authorization precedes retrieval or exposure.
- Product AI agents live under `workspaces/ai/agents/`; `.agents/` is the engineering harness.
- Memory Nucleus remains a single workspace with semantic Clean Architecture dependency direction.
- AI consumers access Memory Nucleus through its approved public boundary, not workspace internals.
- Complex architectural changes update durable harness artifacts and mechanical checks in the same cycle.
