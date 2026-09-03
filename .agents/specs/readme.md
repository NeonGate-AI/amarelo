# Specs

The specification catalog is flat, priority-ordered and mechanically checked.

- `readme.md`, `template.md` and `workflow.md` are unnumbered support documents.
- Every numbered spec is a direct child named `NNN-lowercase-kebab-case.spec.md` and uses the canonical template.
- Priorities `001`–`099` form one delivery catalog; there is no separate legacy behavior-spec band.
- The filename prefix is mutable priority; frontmatter `id` is the durable identity used by branches, PRs and evidence.
- Priority changes happen atomically through a governance spec and update all repository references.
- ADRs use `.adr.md`, rules use `.rule.md`, numbered specs use `.spec.md`, and executable audit checkers use `.audit.sh`.
- Implemented and retrospective specs remain readable in this flat catalog; there is no history subdirectory.

## Delivery priority

| Priority | Durable ID | Status | Contract |
|---:|---|---|---|
| 001 | SPEC-019 | implemented | [Canonical Memory Nucleus MVP contract](001-memory-nucleus-product-contract.spec.md) |
| 002 | SPEC-020 | implemented | [Deterministic Conversation routing](002-conversation-routing-contract.spec.md) |
| 003 | SPEC-021 | implemented | [Mobile voice-state experience](003-mobile-voice-experience.spec.md) |
| 004 | SPEC-022 | implemented | [Private account and Elo entry](004-account-and-elo-entry.spec.md) |
| 005 | SPEC-023 | implemented | [Longitudinal-memory review and control](005-memory-control.spec.md) |
| 006 | SPEC-024 | implemented | [Public Amarelo product narrative](006-product-narrative.spec.md) |
| 007 | SPEC-025 | draft | [Plans, voice entitlements and capability gates](007-plans-and-entitlements.spec.md) |
| 008 | SPEC-026 | implemented | [Canonical spec template and priority migration](008-canonical-spec-template-and-priority-migration.spec.md) |
| 009 | SPEC-027 | implemented | [Direct AI Conversation topology](009-direct-ai-conversation-topology.spec.md) |
| 010 | SPEC-028 | implemented | [Elo CLI experience modernization](010-elo-cli-experience-modernization.spec.md) |
| 011 | SPEC-001 | implemented | [Repository harness and Elo foundation](011-repository-harness-and-elo-foundation.spec.md) |
| 012 | SPEC-002 | implemented | [Memory Nucleus MVP foundation](012-memory-nucleus-mvp-foundation.spec.md) |
| 013 | SPEC-003 | implemented | [Product application foundations](013-product-application-foundations.spec.md) |
| 014 | SPEC-004 | implemented | [AI runtime foundations](014-ai-runtime-foundations.spec.md) |
| 015 | SPEC-005 | implemented | [Import and package boundary normalization](015-import-and-package-boundary-normalization.spec.md) |
| 016 | SPEC-006 | implemented | [Spec-driven workflow foundation](016-spec-driven-workflow-foundation.spec.md) |
| 017 | SPEC-010 | implemented | [Direct Elo shell audits](017-direct-elo-shell-audits.spec.md) |
| 018 | SPEC-007 | implemented | [AI orchestrator topology](018-orchestrator-topology.spec.md) |
| 019 | SPEC-008 | implemented | [Conversation runtime](019-conversation-runtime.spec.md) |
| 020 | SPEC-013 | implemented | [Flat priority spec catalog](020-flat-priority-spec-catalog.spec.md) |
| 021 | SPEC-014 | implemented | [Spec-driven pull request evidence](021-spec-driven-pull-request-evidence.spec.md) |
| 022 | SPEC-015 | implemented | [Canonical Memory Nucleus validation roadmap](022-memory-nucleus-validation-roadmap.spec.md) |
| 023 | SPEC-009 | ready | [First Ana/PWA conversation and serving baseline](023-first-ana-pwa-conversation-baseline.spec.md) |
| 024 | SPEC-016 | ready | [Operational Memory Nucleus core](024-operational-memory-nucleus-core.spec.md) |
| 025 | SPEC-012 | ready | [Background memory curation loop](025-background-memory-curation-loop.spec.md) |
| 026 | SPEC-011 | ready | [Shadow Memory serving and parity](026-shadow-memory-serving-parity.spec.md) |
| 027 | SPEC-017 | ready | [Memory serving A/B and canary](027-memory-serving-ab-canary.spec.md) |
| 028 | SPEC-018 | ready | [Memory unit economics and scale gates](028-memory-unit-economics-scale-gates.spec.md) |
| 029 | SPEC-029 | implemented | [Canonical local engineering workflow skills](029-canonical-local-workflow-skills.spec.md) |
| 030 | SPEC-030 | ready | [Agent artifact scaffolding](030-agent-artifact-scaffolding.spec.md) |

The next unallocated durable delivery ID is `SPEC-031`.

The executable Memory Nucleus chain is:

`SPEC-009 baseline → SPEC-016 core → SPEC-012 background → SPEC-011 shadow/parity → SPEC-017 A/B and canary → SPEC-018 scale`.

Each implementation PR starts from the `main` produced by its prerequisite. A later phase cannot merge until the preceding gate is proved on the exact reviewed head.

Use `template.md` and `workflow.md` for every new numbered spec. Rules, context and ADRs remain separate sources of truth and must be referenced by their canonical semantic filenames.
