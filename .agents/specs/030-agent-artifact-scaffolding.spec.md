---
id: SPEC-030
title: Scaffold canonical agent artifacts through Elo
type: feature
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - .agents/prompts
  - cli/src/commands
  - .audit/elo-platform-core.audit.sh
  - .audit/elo-scaffold.audit.sh
  - repository engineering harness
context:
  - .agents/context/architecture/overview.md
  - .agents/context/engineering/workflow-skills.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
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
  - .audit/elo-scaffold.audit.sh
  - .audit/specs.audit.sh
  - https://github.com/NeonGate-AI/amarelo/pull/29
---

# SPEC-030: Scaffold canonical agent artifacts through Elo

## Problem Statement

Creating a spec, ADR, durable rule, or local skill currently requires remembering its location, semantic suffix, numbering convention, and required headings. This creates avoidable formatting drift before substantive work begins. The owner requires four durable empty templates and direct Elo creation commands backed by those templates.

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
- Creation writes through a private same-directory staging path and publishes without overwriting an existing destination.
- The prompts are authoring scaffolds, not runtime product prompts and not replacements for workflow approval.

## Testing Decisions

### Primary seam

Exercise `cli/elo` from an isolated checkout fixture and assert the exact destinations and rendered IDs produced by `elo adr`, `elo rule`, `elo skill`, and `elo spec` with no additional arguments.

### Secondary seams

Verify custom slug validation, required metadata and headings for every template, reported destination paths, non-overwrite behavior, missing-template cleanup, POSIX syntax, help output, and prompt inventory through executable audits.

### Fixtures and privacy

Tests use synthetic empty harness directories and filenames only. Templates contain no product data, credentials, or conversation content.

### Required validation

Run `./cli/elo doctor --ci`, `./cli/elo check all`, Commitlint, Biome, typecheck, tests, database validation, AI evals, build, and Git-hook smoke tests on the exact PR head.

## Acceptance Criteria

- [x] `.agents/prompts/` contains exactly the four requested `.prompt.md` templates.
- [x] Each template has the canonical metadata and Markdown headings with empty author-owned body sections.
- [x] `elo spec` with no argument creates the next `NNN-new-spec.spec.md` with the next durable `SPEC-###` ID.
- [x] `elo adr` and `elo rule` create the next correctly prefixed semantic filename.
- [x] `elo skill` creates `.agents/skills/new-skill/SKILL.md` without inventing a skill numbering scheme.
- [x] Each command accepts an optional lowercase kebab-case slug and rejects invalid or extra arguments with status 2.
- [x] Existing targets are never overwritten and failures do not leave partial files.
- [x] Help, CLI docs, harness taxonomy, and executable audits describe and enforce the capability.
- [x] Exact-head CI and both independent reviews pass before merge.

## Failure Behavior

Missing templates, malformed slugs, exhausted numeric widths, invalid arguments, allocation ambiguity, existing destinations, or write/publish failures produce a clear error and non-zero status. Generation never edits the spec catalog automatically, never marks a spec ready, and never overwrites an existing artifact.

## Out of Scope

- Filling artifact content or making product/architecture decisions for the author.
- Automatically approving specs, updating the catalog, creating issues, branches, or pull requests.
- Renaming existing rule files; that remains the immediately following governance migration.
- Numbering existing or new skill directories.

## Evidence and Promotion

`.audit/elo-scaffold.audit.sh` exercises the four commands through the public `cli/elo` launcher with default and custom names, validates every generated template shape, verifies status-2 argument failures, protects existing content, and checks failure cleanup. `.audit/specs.audit.sh` constrains the exact prompt inventory, while the architecture and Elo platform audits enforce taxonomy and command integration. Pull request #29 is the stable exact-head CI, independent-review, and merge record.

Template ownership is promoted to ADR-0025, root harness navigation, architecture context, the Markdown rule, and source-organization guidance. No transient evidence is retained.

## Further Notes

The generated file is intentionally incomplete repository work. The developer fills it, applies the normal workflow, and updates indexes or references before committing it.
