---
id: SPEC-030
title: Scaffold canonical agent artifacts through Elo
type: feature
status: ready
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - .agents/prompts
  - cli/src/commands
  - .audit/elo-platform-core.audit.sh
  - repository engineering harness
context:
  - .agents/context/architecture/overview.md
  - .agents/context/engineering/workflow-skills.md
rules:
  - .agents/rules/architecture.rule.md
  - .agents/rules/markdown.rule.md
  - .agents/rules/source-organization.rule.md
  - .agents/rules/spec-driven-development.rule.md
adrs:
  - .agents/adrs/0022-posix-elo-control-plane.adr.md
  - .agents/adrs/0025-agent-artifact-prompt-templates.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/writing-for-agents/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-030: Scaffold canonical agent artifacts through Elo

## Problem Statement

Creating a spec, ADR, durable rule, or local skill currently requires remembering its location, semantic suffix, numbering convention, and required headings. This creates avoidable formatting drift before substantive work begins. The owner requires four durable empty templates and direct Elo commands that create the correctly placed file when invoked without additional input.

## Solution

Add `.agents/prompts/` as the narrowly owned source for four artifact templates: `adr.prompt.md`, `rule.prompt.md`, `skill.prompt.md`, and `spec.prompt.md`. Add public `elo adr`, `elo rule`, `elo skill`, and `elo spec` commands that allocate the next canonical identity, render the selected template, create the destination without overwriting existing work, and print the created path.

## User Stories

1. As a developer, I want `elo spec` to create the next numbered empty spec, so that I can start writing without reconstructing repository metadata and headings.
2. As a developer, I want equivalent commands for ADRs, rules, and skills, so that every engineering artifact begins from its canonical shape.
3. As a maintainer, I want generation to fail rather than overwrite an existing target, so that scaffolding cannot destroy authored knowledge.

## Scope

- The four exact `.agents/prompts/*.prompt.md` files.
- POSIX shell rendering and allocation under the existing Elo command boundary.
- Optional lowercase kebab-case slug arguments and deterministic no-argument defaults.
- ADR four-digit numbering, spec priority plus durable-ID allocation, rule numbering compatible with the planned numbered-rule migration, and directory-owned skill `SKILL.md` placement.
- Harness navigation, taxonomy, CLI documentation, and public-launcher audit coverage.

## Implementation Decisions

- Templates contain canonical metadata fields and section headings but no instructional body prose.
- `elo adr` defaults to `new-adr`, `elo rule` to `new-rule`, `elo skill` to `new-skill`, and `elo spec` to `new-spec`; an optional lowercase kebab-case slug replaces the default.
- ADR filenames allocate the next four-digit prefix from existing ADRs.
- Spec filenames allocate the next three-digit priority and their frontmatter allocates the next durable `SPEC-###` ID independently.
- Rule filenames allocate the next three-digit prefix. Until the numbered-rule migration lands, existing unnumbered rule documents count as occupied positions, so generated rules cannot collide with that migration.
- Skills preserve the established `.agents/skills/<name>/SKILL.md` identity and are not assigned an invented numeric catalog.
- Creation writes through a same-directory temporary file and never overwrites an existing destination.
- The prompts are authoring scaffolds, not runtime product prompts and not replacements for workflow approval.

## Testing Decisions

### Primary seam

Exercise `cli/elo` from an isolated checkout fixture and assert the exact destinations and rendered IDs produced by `elo adr`, `elo rule`, `elo skill`, and `elo spec` with no additional arguments.

### Secondary seams

Verify custom slug validation, required headings, non-overwrite behavior, POSIX syntax, help output, and prompt inventory through executable audits.

### Fixtures and privacy

Tests use synthetic empty harness directories and filenames only. Templates contain no product data, credentials, or conversation content.

### Required validation

Run `./cli/elo doctor --ci`, `./cli/elo check all`, Commitlint, Biome, typecheck, tests, database validation, AI evals, build, and Git-hook smoke tests on the exact PR head.

## Acceptance Criteria

- [ ] `.agents/prompts/` contains exactly the four requested `.prompt.md` templates.
- [ ] Each template has the canonical metadata and Markdown headings with empty author-owned body sections.
- [ ] `elo spec` with no argument creates the next `NNN-new-spec.spec.md` with the next durable `SPEC-###` ID.
- [ ] `elo adr` and `elo rule` create the next correctly prefixed semantic filename.
- [ ] `elo skill` creates `.agents/skills/new-skill/SKILL.md` without inventing a skill numbering scheme.
- [ ] Each command accepts an optional lowercase kebab-case slug and rejects invalid or extra arguments with status 2.
- [ ] Existing targets are never overwritten and failures do not leave partial files.
- [ ] Help, CLI docs, harness taxonomy, and executable audits describe and enforce the capability.
- [ ] Exact-head CI and both independent reviews pass before merge.

## Failure Behavior

Missing templates, malformed slugs, exhausted numeric widths, invalid arguments, allocation ambiguity, existing destinations, or write/move failures produce a clear error and non-zero status. Generation never edits the spec catalog automatically, never marks a spec ready, and never overwrites an existing artifact.

## Out of Scope

- Filling artifact content or making product/architecture decisions for the author.
- Automatically approving specs, updating the catalog, creating issues, branches, or pull requests.
- Renaming existing rule files; that remains the immediately following governance migration.
- Numbering existing or new skill directories.

## Evidence and Promotion

Planned evidence is the isolated public-CLI fixture, prompt inventory checks, exact-head CI, independent Standards review, independent Spec-fidelity review, and merged pull request. Durable prompt ownership is promoted to ADR-0025, root harness navigation, architecture context, and the Markdown rule.

## Further Notes

The generated file is intentionally incomplete repository work. The developer fills it, applies the normal workflow, and updates indexes or references before committing it.
