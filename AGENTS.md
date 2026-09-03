# Amarelo engineering harness

This is the canonical engineering-agent entry point for the monorepo.

Before modifying project code, load every `.agents/rules/*.rule.md` rule whose frontmatter declares `alwaysApply: true`. Then load only the additional context required for the active area.

## Delivery workflow

Before changing repository behavior, load `.agents/specs/workflow.md` and the active numbered `*.spec.md` delivery contract. Implementation starts only from a prospective spec whose status is `ready`; the first implementation change moves it to `in-progress`.

The end-to-end lifecycle is owned by `.agents/specs/workflow.md`. Its seven canonical local procedures are `to-spec`, `to-tickets`, `implement`, `tdd`, `code-review`, `domain-modeling` and `writing-for-agents`. Load them from `.agents/skills/<name>/SKILL.md`; do not substitute a remote copy. The ownership and inventory model is described in `.agents/context/engineering/workflow-skills.md`.

## Navigate

- Understand the system or a workspace -> `.agents/context/`
- Obey durable constraints -> `.agents/rules/`
- Satisfy required behavior -> `.agents/specs/`
- Understand consequential decisions -> `.agents/adrs/`
- Follow a reusable engineering procedure -> `.agents/skills/`

Start from `.agents/context/workspaces/<area>/` when an area manifest exists. Follow referenced scoped rules, specs and ADRs instead of loading the whole harness.

## Semantic harness filenames

Harness artifacts use semantic suffixes at their ownership boundary:

- ADRs: `lowercase-kebab-case.adr.md` under `.agents/adrs/`;
- rules: `lowercase-kebab-case.rule.md` under `.agents/rules/`;
- numbered specs: `NNN-lowercase-kebab-case.spec.md` under `.agents/specs/`;
- executable audit checkers: `lowercase-kebab-case.audit.sh` under `.audit/`.

Context documents, skills and the unnumbered spec support files `readme.md`, `template.md` and `workflow.md` keep their ordinary names. Repository references must use the exact semantic filename; do not reintroduce unsuffixed ADR, rule, numbered-spec or audit-checker paths.

## Evidence is not canonical context

`.audit/` is a temporary execution-evidence plane. Its tracked `*.audit.sh` files are executable invariant checkers, not product truth. Do not treat transient audit output as rules, context, specs, ADRs or skills. Promote durable conclusions into `.agents/` before deleting the corresponding evidence.

## Non-negotiable boundaries

- Personal memory is private by default; authorization precedes retrieval or exposure.
- Product AI agents live under `workspaces/ai/agents/`; `.agents/` is the engineering harness.
- Conversation lives directly at `workspaces/ai/conversation/` and preserves the framework-neutral `@ai/conversation` package boundary.
- `workspaces/ai/agents/` is a structural capability parent; a generic coordination parent requires demonstrated multiple-runtime ownership and a new ADR.
- Memory Nucleus remains a single workspace with semantic Clean Architecture dependency direction.
- AI consumers access Memory Nucleus through its approved public boundary, not workspace internals.
- First-party absolute aliases use `@`, never `#`; source imports stop at directory barrels rather than final semantic files.
- Every code-bearing leaf directory exposes an `index.ts` exporting all project-created semantic modules in that leaf.
- Complex architectural changes update durable harness artifacts and mechanical checks in the same cycle.
