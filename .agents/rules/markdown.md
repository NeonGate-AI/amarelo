---
version: 2
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
- Temporary handoffs, checkpoints, audits, completion reports and one-shot plans are deleted when their cycle ends after durable knowledge is migrated.
- `.agents` contains only `context/`, `rules/`, `specs/`, `adrs/` and `skills/` as first-class knowledge categories.
- `.audit/` is a separate temporary evidence plane and must never become canonical harness context.
- Local workspace/app `agents.md` files are not allowed; engineering context is centralized in `.agents/`.
- READMEs are high-level navigation, not duplicate architecture documentation.
