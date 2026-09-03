---
id: SPEC-031
title: Enumerate the canonical rule catalog and reconcile the harness
type: governance
status: implemented
mode: prospective
created: 2026-09-03
updated: 2026-09-03
owners:
  - Jonatas Sales
targets:
  - .agents/rules
  - AGENTS.md
  - .agents/context
  - .agents/specs
  - .agents/adrs
  - .agents/skills
  - .audit
  - cli/src/commands/scaffold.sh
context:
  - .agents/context/architecture/overview.md
  - .agents/context/engineering/workflow-skills.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/002-code-style.rule.md
  - .agents/rules/003-context-engineering.rule.md
  - .agents/rules/004-import-boundaries.rule.md
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/006-memory-nucleus.rule.md
  - .agents/rules/007-package-ownership.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/009-react-and-next.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - .agents/adrs/0018-spec-driven-delivery.adr.md
  - .agents/adrs/0025-agent-artifact-prompt-templates.adr.md
  - .agents/adrs/0026-numbered-rule-catalog.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/to-tickets/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/writing-for-agents/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - .audit/rules.audit.sh
  - .audit/elo-scaffold.audit.sh
  - https://github.com/NeonGate-AI/amarelo/pull/31
---

# SPEC-031: Enumerate the canonical rule catalog and reconcile the harness

## Problem Statement

The durable rule documents use semantic `.rule.md` suffixes but still have unnumbered filenames. SPEC-030 deliberately reserves the first eleven rule positions when scaffolding a new rule, which prevents collision but leaves the existing catalog structurally inconsistent with generated `NNN-slug.rule.md` files. Exact unnumbered paths are also repeated across specs, context, ADRs, skills, audits, and root harness navigation, so a partial rename would silently break agent loading and validation.

## Solution

Assign the eleven current canonical rules stable three-digit catalog prefixes in lexical slug order, from `001` through `011`, while preserving their authored content and semantic slugs. Keep `.agents/rules/readme.md` as the unnumbered support document. Treat the prefix as durable catalog identity that never implies enforcement precedence; existing rule metadata and authored policy remain unchanged.

Update every repository reference atomically, add a catalog table and lifecycle rules to the rules index, simplify Elo rule allocation around the fully numbered catalog, and add an executable rules audit that rejects unnumbered rules, duplicate or malformed identities, stale legacy paths, and index drift.

## User Stories

1. As an engineering agent, I want every durable rule to have a deterministic canonical path, so that loading and citations do not depend on an informal filename set.
2. As a developer, I want `elo rule` to continue at the next durable identity, so that newly scaffolded rules fit the existing catalog without special handling.
3. As a maintainer, I want stale rule references and partial migrations to fail mechanically, so that renaming cannot leave the harness internally inconsistent.

## Scope

- Rename the eleven current `.agents/rules/*.rule.md` documents to prefixes `001`–`011` in lexical slug order.
- Preserve `.agents/rules/readme.md` as unnumbered support documentation.
- Update all exact rule paths in root navigation, specs, ADRs, context, skills, CLI implementation, and audit scripts.
- Document rule identity, ordering, precedence, addition, retirement, and non-reuse semantics.
- Add an executable `.audit/rules.audit.sh` checker and route it through Elo validation.
- Ensure `elo rule` allocates `012` after this migration and fails closed on malformed or ambiguous catalogs.

## Implementation Decisions

- The canonical initial mapping is:
  - `001` architecture
  - `002` code style
  - `003` context engineering
  - `004` import boundaries
  - `005` Markdown
  - `006` Memory Nucleus
  - `007` package ownership
  - `008` product safety and privacy
  - `009` React and Next.js
  - `010` source organization
  - `011` spec-driven development
- Prefixes are stable catalog identities and never define enforcement precedence; existing rule metadata and authored policy remain authoritative.
- Existing identities are not reused. New rules receive one greater than the highest allocated prefix.
- Rule content, frontmatter meaning, and applicability do not change in this migration.
- No compatibility aliases remain at the old unnumbered paths; all consumers move in the same change.
- The rule index is the human-readable catalog, while executable audits remain the mechanical authority for filename and reference integrity.

## Testing Decisions

### Primary seam

Run the public `./cli/elo check rules` command and verify the complete numbered rule inventory, unique identities, index membership, absence of unnumbered aliases, and absence of stale exact paths.

### Secondary seams

Exercise `elo rule` in an isolated checkout fixture to prove that the next generated path is `012-new-rule.rule.md`, custom names still work, and malformed or ambiguous rule catalogs fail without creating a target. Run the complete repository audit suite to prove every harness reference resolves after the atomic rename.

### Fixtures and privacy

Tests use repository metadata and synthetic rule files only. No product data, conversation content, Memory records, credentials, or personal data are involved.

### Required validation

Run `./cli/elo doctor --ci`, `./cli/elo check all`, Commitlint, lint, typecheck, tests, PostgreSQL Memory validation, AI evals, build, Git-hook smoke tests, and both independent review axes on the exact final head.

## Acceptance Criteria

- [x] Every canonical rule except `readme.md` uses a unique `NNN-lowercase-kebab-case.rule.md` path.
- [x] The eleven existing rules map to `001`–`011` in lexical slug order without semantic content changes.
- [x] Prefixes are documented as stable identities that never imply precedence, and existing rule metadata is preserved.
- [x] Every exact repository reference uses the numbered path and no old unnumbered rule path remains.
- [x] The rule index lists every numbered rule exactly once and documents addition, retirement, and non-reuse behavior.
- [x] `elo rule` allocates `012` for the next rule and fails closed on malformed, duplicate, or ambiguous catalogs.
- [x] `./cli/elo check rules` and `./cli/elo check all` enforce the numbered catalog and reference integrity.
- [x] The migration changes no product, runtime, Memory Nucleus, authorization, safety, or rule-policy behavior.
- [x] Exact-head CI and both independent reviews pass before merge.

## Failure Behavior

An unnumbered rule, malformed or duplicate prefix, catalog/index mismatch, stale legacy path, unresolved rule reference, allocation ambiguity, existing target, or partial publish fails with a clear non-zero result. The migration does not preserve old-path aliases, silently renumber rules, reuse retired identities, or weaken checks to accommodate stale references.

## Out of Scope

- Rewriting rule policy, applicability, priority, metadata meaning, or body content.
- Numbering `readme.md`, skills, context documents, prompts, or runtime product prompts.
- Reprioritizing the numbered spec catalog.
- Product, application, AI runtime, Conversation, or Memory Nucleus implementation.
- Automatic rule approval or catalog mutation beyond scaffolding one new empty file.

## Evidence and Promotion

`.audit/rules.audit.sh`, exposed as `./cli/elo check rules` and included in `./cli/elo check all`, verifies the flat numbered inventory, unique and required identities, exact index parity, lifecycle wording, absence of legacy unnumbered paths, and resolution of every canonical-looking numbered rule reference across the repository. Synthetic filenames used by scaffold checks are composed from fixture-local variables rather than stored as durable-looking path literals, so `.audit/` remains within the repository-wide scan without producing false references. `.audit/elo-scaffold.audit.sh` proves that `elo rule` allocates `012`, accepts custom slugs, rejects malformed and duplicate catalogs, preserves existing targets, and leaves no partial staging state.

ADR-0026, the root harness, architecture context, the Markdown/source-organization/spec-driven rules, CLI help, CLI documentation, historical rule references, and every spec reference now publish the same numbered identity model. Pull request #31 is the stable exact-head CI, independent-review, and merge record. No temporary migration workflow or transient report remains in the repository.

## Further Notes

The owner explicitly requested enumeration of all current rules and a complete harness update after SPEC-030. That instruction constitutes approval of this bounded migration contract; material changes to rule semantics remain separately approval-gated.
