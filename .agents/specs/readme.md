# Specs

The specification catalog is flat, priority-ordered and mechanically checked.

- `readme.md`, `template.md` and `workflow.md` are unnumbered support documents.
- Every numbered spec is a direct child named `NNN-lowercase-kebab-case.md` and uses the canonical template.
- Priorities `001`–`099` form one delivery catalog; there is no separate legacy behavior-spec band.
- The filename prefix is mutable priority; frontmatter `id` is the durable identity used by branches, PRs and evidence.
- Priority changes happen atomically through a governance spec and update all repository references.
- Implemented and retrospective specs remain readable in this flat catalog; there is no history subdirectory.

## Delivery priority

| Priority | Durable ID | Status | Contract |
|---:|---|---|---|
| 001 | SPEC-019 | implemented | [Canonical Memory Nucleus MVP contract](001-memory-nucleus-product-contract.md) |
| 002 | SPEC-020 | implemented | [Deterministic Conversation routing](002-conversation-routing-contract.md) |
| 003 | SPEC-021 | implemented | [Mobile voice-state experience](003-mobile-voice-experience.md) |
| 004 | SPEC-022 | implemented | [Private account and Elo entry](004-account-and-elo-entry.md) |
| 005 | SPEC-023 | implemented | [Longitudinal-memory review and control](005-memory-control.md) |
| 006 | SPEC-024 | implemented | [Public Amarelo product narrative](006-product-narrative.md) |
| 007 | SPEC-025 | draft | [Plans, voice entitlements and capability gates](007-plans-and-entitlements.md) |
| 008 | SPEC-026 | implemented | [Canonical spec template and priority migration](008-canonical-spec-template-and-priority-migration.md) |
| 009 | SPEC-027 | in-progress | [Direct AI Conversation topology](009-direct-ai-conversation-topology.md) |
| 010 | reserved | — | `SPEC-028`: Elo CLI experience modernization |
| 011 | SPEC-001 | implemented | [Repository harness and Elo foundation](011-repository-harness-and-elo-foundation.md) |
| 012 | SPEC-002 | implemented | [Memory Nucleus MVP foundation](012-memory-nucleus-mvp-foundation.md) |
| 013 | SPEC-003 | implemented | [Product application foundations](013-product-application-foundations.md) |
| 014 | SPEC-004 | implemented | [AI runtime foundations](014-ai-runtime-foundations.md) |
| 015 | SPEC-005 | implemented | [Import and package boundary normalization](015-import-and-package-boundary-normalization.md) |
| 016 | SPEC-006 | implemented | [Spec-driven workflow foundation](016-spec-driven-workflow-foundation.md) |
| 017 | SPEC-010 | implemented | [Direct Elo shell audits](017-direct-elo-shell-audits.md) |
| 018 | SPEC-007 | implemented | [AI orchestrator topology](018-orchestrator-topology.md) |
| 019 | SPEC-008 | implemented | [Conversation runtime](019-conversation-runtime.md) |
| 020 | SPEC-013 | implemented | [Flat priority spec catalog](020-flat-priority-spec-catalog.md) |
| 021 | SPEC-014 | implemented | [Spec-driven pull request evidence](021-spec-driven-pull-request-evidence.md) |
| 022 | SPEC-009 | ready | [First real Ana/PWA conversation and serving baseline](022-first-agentic-pwa-conversation.md) |
| 023 | SPEC-011 | ready | [Bounded Memory Nucleus serving context](023-bounded-nucleus-serving-context.md) |
| 024 | SPEC-012 | ready | [Durable background memory-curation loop](024-background-memory-curation-loop.md) |

The next durable delivery ID is `SPEC-028`. Priority 010 is reserved by `SPEC-026` for the owner-approved Elo CLI migration that immediately follows SPEC-027.

Use `template.md` and `workflow.md` for every new numbered spec. Rules, context and ADRs remain separate sources of truth and should be referenced rather than copied.
