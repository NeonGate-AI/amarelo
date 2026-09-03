# Specs

The specification catalog is flat, priority-ordered and mechanically checked.

- `readme.md`, `template.md` and `workflow.md` are unnumbered support documents.
- Every spec document is a direct child named `NNN-lowercase-kebab-case.md`.
- Priorities `001`–`099` are delivery specs. Priorities `101`–`199` are living behavior contracts.
- The filename prefix is mutable priority; the frontmatter `id` is the durable identity used by branches, PRs and evidence.
- Priority changes happen atomically through a governance spec and update all repository references.
- Implemented and retrospective delivery specs remain readable in this flat catalog; there is no history subdirectory.

## Delivery priority

| Priority | Durable ID | Status | Contract |
|---:|---|---|---|
| 001 | SPEC-001 | implemented | [Repository harness and Elo foundation](001-repository-harness-and-elo-foundation.md) |
| 002 | SPEC-002 | implemented | [Memory Nucleus MVP foundation](002-memory-nucleus-mvp-foundation.md) |
| 003 | SPEC-003 | implemented | [Product application foundations](003-product-application-foundations.md) |
| 004 | SPEC-004 | implemented | [AI runtime foundations](004-ai-runtime-foundations.md) |
| 005 | SPEC-005 | implemented | [Import and package boundary normalization](005-import-and-package-boundary-normalization.md) |
| 006 | SPEC-006 | implemented | [Spec-driven workflow foundation](006-spec-driven-workflow-foundation.md) |
| 007 | SPEC-010 | implemented | [Direct Elo shell audits](007-direct-elo-shell-audits.md) |
| 008 | SPEC-007 | implemented | [AI orchestrator topology](008-orchestrator-topology.md) |
| 009 | SPEC-008 | implemented | [Conversation runtime](009-conversation-runtime.md) |
| 010 | SPEC-013 | implemented | [Flat priority spec catalog](010-flat-priority-spec-catalog.md) |
| 011 | SPEC-014 | implemented | [Spec-driven pull request evidence](011-spec-driven-pull-request-evidence.md) |
| 012 | SPEC-009 | ready | [First real Ana/PWA conversation and serving baseline](012-first-agentic-pwa-conversation.md) |
| 013 | SPEC-011 | ready | [Bounded Memory Nucleus serving context](013-bounded-nucleus-serving-context.md) |
| 014 | SPEC-012 | ready | [Durable background memory-curation loop](014-background-memory-curation-loop.md) |

The next durable delivery ID is `SPEC-015`. The current declared dependency order is baseline conversation, bounded serving context and background curation. The post-governance audit will rewrite it to the canonical baseline, background, shadow/parity, A/B/canary and scale sequence before product execution.

## Behavior contracts

| Priority | Contract |
|---:|---|
| 101 | [Memory Nucleus](101-memory-nucleus.md) |
| 102 | [Conversation routing](102-routing.md) |
| 103 | [Mobile voice experience](103-mobile-voice-experience.md) |
| 104 | [Account and Elo entry](104-account-and-elo-entry.md) |
| 105 | [Memory control](105-memory-control.md) |
| 106 | [Product narrative](106-product-narrative.md) |
| 107 | [Plans and entitlements](107-plans-and-entitlements.md) |

Use `template.md` and `workflow.md` for every new delivery spec. Rules, context and ADRs remain separate sources of truth and should be referenced rather than copied.
