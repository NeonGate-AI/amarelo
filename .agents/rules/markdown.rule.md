---
version: 4
name: Markdown
description: Canonical Markdown naming, lifecycle, harness placement, and audit-evidence rules.
alwaysApply: true
priority: high
tags:
  - documentation
  - harness
  - audit
---

# Markdown rules

- Project-owned Markdown filenames are lowercase, except tool-mandated compatibility files such as root `AGENTS.md`.
- ADRs under `.agents/adrs/` end in `.adr.md`.
- Durable rules under `.agents/rules/` end in `.rule.md`.
- Numbered specs under `.agents/specs/` use `NNN-lowercase-kebab-case.spec.md`; `readme.md`, `template.md` and `workflow.md` are the only unnumbered support-file exceptions there.
- Engineering artifact templates under `.agents/prompts/` are exactly `adr.prompt.md`, `rule.prompt.md`, `skill.prompt.md` and `spec.prompt.md`.
- Executable repository checkers under `.audit/` end in `.audit.sh`. Transient evidence may use other descriptive names but must not be tracked as a canonical checker.
- Context documents and skills keep ordinary Markdown names because their containing directory already defines their semantic role.
- Every repository reference uses the exact canonical semantic filename. Do not add compatibility copies or restore retired unsuffixed ADR, rule, numbered-spec or audit-checker paths.
- Temporary handoffs, checkpoints, audits, completion reports and one-shot plans are deleted when their cycle ends after durable knowledge is migrated.
- `.agents` contains only `context/`, `rules/`, `specs/`, `adrs/`, `skills/` and the narrowly scoped `prompts/` authoring-template category.
- `.audit/` is a separate temporary evidence plane and must never become canonical product context.
- Local workspace/app `agents.md` files are not allowed; engineering context is centralized in `.agents/`.
- READMEs are high-level navigation, not duplicate architecture documentation.
