# ADR 0025: Keep agent artifact templates under `.agents/prompts`

## Status

Accepted on 2026-09-03.

## Context

Amarelo has canonical shapes for ADRs, durable rules, delivery specs, and repository-local skills, but authoring starts from several different support files or from memory. The owner requires direct Elo creation commands backed by four visible Markdown templates. Runtime product prompts already belong to their owning source workspaces, so the new directory must not blur runtime AI behavior with engineering-harness scaffolding.

## Decision

Add `.agents/prompts/` as a first-class but narrow engineering-harness category containing exactly `adr.prompt.md`, `rule.prompt.md`, `skill.prompt.md`, and `spec.prompt.md`.

These files are empty authoring skeletons consumed by Elo. They may contain replacement tokens for allocated identifiers and dates, but no project decision, product behavior, or workflow approval. Runtime AI prompts remain in their owning application/package source tree.

Elo creates artifacts from these templates without overwriting existing files. The generated artifact becomes authoritative only after a developer completes it and follows the normal spec/ADR/rule/skill workflow.

## Consequences

- Developers have one discoverable starting point for four engineering artifact types.
- Template structure can be audited independently from generated author content.
- `.agents/prompts/` does not become a general prompt library or product runtime dependency.
- Harness navigation and taxonomy checks must recognize the new category.
- Changes to these templates are governed repository behavior and require a spec.
