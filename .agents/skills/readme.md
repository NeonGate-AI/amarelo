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

## Owner-requested discovery

- [grill-me](grill-me/SKILL.md): explicit entry point for an owner-requested plan/decision interview.
- [grilling](grilling/SKILL.md): required interview engine; ask the current decision frontier in rounds and wait for explicit shared-understanding confirmation before execution.

SPEC-048 restores this minimal pair for SPEC-025 discovery. The other ten maintained skills are unchanged. The upstream source paths and content identifiers are in `skills-lock.json`; the grill-me entry point has one portability adjustment to resolve the repository-local engine without assuming a particular Skill tool.

## Project and domain skills

The current product surfaces justify three maintained domain procedures:

- [accessibility](accessibility/SKILL.md): keyboard, screen-reader, contrast, reflow and authentication review.
- [frontend-ui-engineering](frontend-ui-engineering/SKILL.md): existing design-system UI, transient state and asynchronous interaction.
- [pwa-development](pwa-development/SKILL.md): installation, static-shell privacy and safe service-worker updates.

Load them from the owning workspace/workflow context. They use the current test platform rather than the obsolete static-only verification policy.

Supporting `references/`, `scripts/`, `agents/` and companion Markdown remain colocated with an owning retained skill when applicable.

## SPEC-046 curation

The owner removed these 21 presently unused or redundant packages: `agent-memory-systems`, `best-practices`, `context-engineering`, `core-web-vitals`, `deep-agents-core`, `deep-agents-memory`, `deep-agents-orchestration`, `documentation-and-adrs`, `langchain-architecture`, `langchain-fundamentals`, `langchain-middleware`, `langchain-rag`, `langchain-typescript-quickstart`, `langgraph-docs`, `langgraph-human-in-the-loop`, `langgraph-persistence`, `managed-deep-agents`, `performance`, `seo`, `spec-driven-development` and `web-quality-audit`.

Canonical `to-spec` replaces the redundant spec router; `domain-modeling` and `writing-for-agents` own architectural/documentation procedures. Memory rules and accepted ADRs own the Neo4j boundary. LangChain remains an implementation dependency where declared, but that does not justify LangGraph, vector-store or Deep Agents instruction packages. Removed files remain recoverable from Git history; reintroduction needs a concrete consumer and a maintained contract.
