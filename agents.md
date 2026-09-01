# Amarelo engineering harness

This is the only engineering-agent entry point in the monorepo. Load the smallest context required for the active task and treat the owner's latest instruction as highest authority.

## Navigate

- Understand a workspace or architecture boundary → `.agents/context/`
- Obey durable constraints → `.agents/rules/`
- Implement required behavior → `.agents/specs/`
- Understand consequential decisions → `.agents/adrs/`

Start from `.agents/context/workspaces/<area>/` and follow only relevant links. Do not load the whole harness by default.

## Non-negotiable boundaries

- The person is the primary subject and decision-maker.
- Personal memory is private by default; authorization precedes retrieval/exposure.
- AI organizes/contextualizes; it does not grant itself access or replace qualified human judgment.
- Runtime product agents live under `workspaces/ai/agents/`; `.agents/` is engineering harness context.
- Complex architectural changes update ADRs, rules, specs/contracts and mechanical checks where applicable.
