# SPEC-0010 — Repository English Language Standard

## 0. Metadata

* ID: SPEC-0010
* Status: Draft
* Author: Codex
* Owner: Human project owner
* Created: 2026-08-09
* Last updated: 2026-08-09
* Target: Repository documentation, agent context, prompts, code comments, non-user-facing code text, file names, and directory names
* Related specs: `.agents/specs/README.md`, `.agents/specs/shared/design-foundation.md`, `.agents/specs/shared/agents-and-orbs.md`
* Related ADRs: `.agents/adr/000-monorepo-and-harness.md`, `.agents/adr/009-provenance-and-status.md`

## 1. Summary

The repository MUST use English as its canonical engineering, documentation, and agent-operation language. Markdown files, prompts, ADRs, specs, rules, comments, non-user-facing code text, file names, and directory names MUST be written in English, while Portuguese product copy embedded in UI code MAY remain Portuguese when it is intentionally visible to the end user.

## 2. Context

The Amar.elo repository currently mixes Portuguese and English across institutional context, ADRs, specs, prompts, README files, rules, and code. This makes the repository harder for future agents and engineers to audit, compare, and evolve consistently.

The product itself is still oriented toward Portuguese-speaking users in the current prototype, so user-facing interface copy inside React components, mock data, metadata, form labels, FAQ content, and templates is intentionally Portuguese and MUST NOT be translated by this migration unless a separate product localization spec approves that change.

This spec is a repository-governance migration, not a product-language migration.

## 3. Problem Statement

The current repository contains Portuguese content in Markdown and operational documentation, including:

* `README.md`;
* `.agents/adr/*.md`;
* `.agents/context/*.md`;
* `.agents/specs/**/*.md`;
* `.agents/prompts/*.md`;
* `.agents/rules/*.md`.

The repository also contains Portuguese user-facing copy inside UI source files under `apps/landing` and `apps/console`. Those strings are part of the current product experience and are not evidence of a repository-language problem by themselves.

Observed file and directory names are already mostly English, but this spec MUST create a gate so future Portuguese file or directory names are not introduced accidentally.

## 4. Objective

Convert the repository's canonical written surfaces to English and create deterministic checks that prevent regression, while preserving intentional Portuguese end-user product copy in code templates and UI components.

## 5. Non-Goals

* Translate landing, console, onboarding, or mobile user-facing copy from Portuguese to English.
* Redesign any UI.
* Rename the Amar.elo product, the `amarelo` repository root, package scopes, brand tokens, or proper nouns such as agent names.
* Rename the legacy `sim` CLI to `neon`; that requires its own spec.
* Standardize ADR format beyond language unless required by the already approved ADR-format audit.
* Rewrite product positioning, clinical safety policy, privacy policy, or feature scope.
* Add i18n infrastructure.
* Create multilingual copy management.
* Modify generated, vendored, cache, dependency, or build output directories.

## 6. Current State

Observed source package:

* The inspected source is `upload/amarelo(1).zip`, extracted read-only for analysis.
* The package contains a monorepo with `apps`, `packages`, `ai`, `cli`, `.agents`, `.github`, and root configuration files.
* Generated or irrelevant directories include `.git`, `.pnpm-store`, `.turbo`, `.next`, `node_modules`, `dist`, and `__MACOSX`.

Observed Markdown surfaces:

* Root documentation: `README.md`.
* Agent institutional context: `.agents/context/*.md`.
* ADRs: `.agents/adr/*.md`.
* Specs: `.agents/specs/**/*.md`.
* Agent prompts: `.agents/prompts/*.md`.
* Agent rules: `.agents/rules/*.md`.
* Skill documentation and references: `.agents/skills/**/*.md`.
* AI skill notes: `ai/skills/**/*.md`.
* App placeholder docs: `apps/docs/README.md`.
* GitHub PR template: `.github/pr_template.md`.

Observed code surfaces:

* `apps/landing/**/*.tsx` and `apps/console/**/*.tsx` contain Portuguese UI copy that is intentionally user-facing.
* `cli/**/*.sh` contains English operational text and legacy `Sim` naming.
* Comments and internal operational messages are not consistently governed by a language rule.

## 7. Proposed Behavior

After implementation:

* All non-generated Markdown files MUST be written in English.
* Markdown headings, body text, tables, prompts, rules, ADRs, specs, and skill documentation MUST be English.
* File and directory names controlled by the repository MUST be English, kebab-case when multi-word, and ASCII unless a proper noun requires otherwise.
* Code comments, internal logs, developer-facing error messages, commit/PR templates, configuration descriptions, script help intended for developers, and agent prompts MUST be English.
* User-facing product copy embedded in UI components, mock data, product templates, FAQ arrays, form labels, accessibility labels for product UI, metadata, and visible descriptions MAY remain Portuguese when intentionally part of the PT-BR prototype.
* Any Portuguese remaining after the migration MUST be classified as an allowed exception with an explicit reason.

## 8. Scope and Change Surface

* In scope:
  * Root `README.md`.
  * `.agents/adr/**/*.md`.
  * `.agents/context/**/*.md`.
  * `.agents/specs/**/*.md`.
  * `.agents/prompts/**/*.md`.
  * `.agents/rules/**/*.md`.
  * `.agents/skills/**/*.md`.
  * `ai/skills/**/*.md`.
  * `.github/*.md`.
  * `apps/**/README.md`.
  * Code comments and developer-facing strings.
  * File and directory names owned by the source tree.
  * Import paths and references required by approved file/directory renames.

* Potentially affected:
  * Links between specs, ADRs, prompts, README files, and rules.
  * GitHub PR template text.
  * CLI comments and developer-facing help.
  * Package scripts or paths if any renamed files are referenced.
  * Agent prompt behavior because prompts themselves will be translated.

* Out of scope:
  * UI copy intentionally shown to Portuguese-speaking users.
  * Product mock content intentionally representing PT-BR examples.
  * Generated directories: `.git`, `.pnpm-store`, `.turbo`, `.next`, `node_modules`, `dist`, coverage output, lockfile metadata produced by tools, and `__MACOSX`.
  * Third-party copied source unless the repository maintains it as first-party code and the text is developer-facing.

## 9. Requirements

* `REQ-001`
  * Description: All repository-owned Markdown content MUST be translated or rewritten into English.
  * Priority: MUST
  * Origin: User request
  * Verification: Static language audit over non-generated `*.md` files with approved proper-noun exceptions.

* `REQ-002`
  * Description: All repository-owned file and directory names MUST be English, ASCII, and kebab-case when multi-word.
  * Priority: MUST
  * Origin: User request
  * Verification: File-tree audit excluding generated, dependency, and VCS directories.

* `REQ-003`
  * Description: Code comments and developer-facing strings MUST be English.
  * Priority: MUST
  * Origin: User request
  * Verification: Static scan over source files, followed by classification of any Portuguese matches as user-facing copy or proper-noun exceptions.

* `REQ-004`
  * Description: Portuguese user-facing product copy embedded in UI code MAY remain Portuguese when it is intentionally visible to end users.
  * Priority: MUST
  * Origin: User clarification
  * Verification: Exception allowlist with file, line or pattern, category, and rationale.

* `REQ-005`
  * Description: The migration MUST NOT change product behavior, UI layout, routing, build outputs, data models, or clinical/privacy positioning.
  * Priority: MUST
  * Origin: Safety and scope control
  * Verification: Diff review, build/lint checks, and absence of unrelated source changes.

* `REQ-006`
  * Description: All links and path references affected by file or directory renames MUST be updated.
  * Priority: MUST
  * Origin: Repository integrity
  * Verification: Link/path scan and targeted `rg` checks for stale names.

* `REQ-007`
  * Description: The canonical spec and ADR prompts MUST be translated to English before they are used to generate future docs.
  * Priority: MUST
  * Origin: Governance consistency
  * Verification: Static language audit over `.agents/prompts/create-spec.md`, `.agents/prompts/create-adr.md`, and `.agents/prompts/audit-specs-adrs.md`.

* `REQ-008`
  * Description: The repository MUST include an audit command or script that separates forbidden Portuguese from allowed Portuguese product copy.
  * Priority: SHOULD
  * Origin: Regression prevention
  * Verification: Running the language audit returns exit code `0` only when blocking surfaces are English or explicitly allowed.

## 10. Invariants

* The product brand `Amarelo` / `Amar.elo` MUST remain unchanged unless a separate brand decision says otherwise.
* The repository root folder `amarelo` MAY remain unchanged because it is a product/repository proper noun.
* Agent display names such as `Ana`, `Nico`, and `Isa` MUST NOT be translated.
* User-facing Portuguese copy inside product UI MUST remain semantically equivalent.
* Clinical and safety boundaries MUST NOT be weakened.
* Privacy constraints MUST NOT be broadened.
* Existing commands MUST keep their behavior unless a referenced path rename requires a mechanical update.
* Generated and dependency directories MUST NOT be edited.
* The legacy CLI rename remains out of scope.

## 11. Contracts and Mappings

Language contracts:

| Surface | Target Language | Rule |
|---|---:|---|
| Markdown documentation | English | Required |
| ADRs | English | Required |
| Specs | English | Required |
| Agent prompts | English | Required |
| Agent rules | English | Required |
| Skill docs owned by this repo | English | Required |
| Code comments | English | Required |
| Developer-facing script/help text | English | Required |
| File names | English | Required, kebab-case for multi-word names |
| Directory names | English | Required, kebab-case for multi-word names |
| UI copy visible to users | Portuguese allowed | Preserve PT-BR prototype copy |
| Product mock examples visible in UI | Portuguese allowed | Preserve if intentionally user-facing |
| Proper nouns and brand names | Original form allowed | Must be classified |

Current high-priority surfaces:

| Current path | Required action |
|---|---|
| `README.md` | Rewrite in English |
| `.agents/context/*.md` | Rewrite in English |
| `.agents/adr/*.md` | Rewrite in English |
| `.agents/specs/**/*.md` | Rewrite in English |
| `.agents/prompts/*.md` | Rewrite in English |
| `.agents/rules/*.md` | Rewrite in English |
| `.agents/skills/**/*.md` | Rewrite in English if first-party |
| `ai/skills/**/*.md` | Audit and rewrite if first-party |
| `.github/pr_template.md` | Rewrite in English |

Allowed exception categories:

| Category | Example | Requirement |
|---|---|---|
| Brand | `Amarelo`, `Amar.elo` | Must be product or repository identity |
| Person/interface name | `Ana`, `Nico`, `Isa` | Must be a proper name |
| User-facing UI copy | FAQ, form labels, hero copy | Must be visible to users |
| Product mock data | Demo entry titles, categories | Must represent UI data |
| Legal/safety phrase intentionally displayed | `Não é terapia` | Must be product copy, not repository instruction |

## 12. Edge Cases and Failure Modes

* A Portuguese word inside a TSX string may be valid UI copy; the audit MUST classify it instead of failing blindly.
* A Portuguese word inside a Markdown quote that represents product copy is still Markdown content; it MAY remain only if explicitly marked as quoted product copy and needed for exact UX documentation.
* Translating prompts may change agent behavior; implementation MUST preserve instruction strength and ordering.
* Renaming files may break links from other docs or prompts; stale path references MUST be checked.
* Translating ADRs may accidentally alter accepted decisions; semantic preservation is required.
* Proper nouns may look like Portuguese words; the audit MUST support a small allowlist.
* The word `amarelo` may appear as brand, package scope, folder, or CSS/token identity; it MUST NOT be translated to `yellow` unless explicitly approved.

## 13. Security, Privacy and Safety

This migration is documentation- and naming-focused. It MUST preserve all mental-health, privacy, authorization, provenance, and safety constraints.

Special care is required because translating safety language can weaken precision. Any sentence involving diagnosis, treatment, emergency support, minors, consent, data sharing, authorization, retention, deletion, export, inference, or clinical claims MUST be translated semantically, not merely word-for-word.

No user data, production data, credentials, or external systems are involved.

## 14. Compatibility and Migration

* Backward compatibility:
  * Internal links and path references MUST be updated.
  * Public routes and UI text MUST NOT change as part of this spec.

* Existing data or configuration:
  * Not applicable — this spec does not change persisted product data.

* Aliases:
  * Not applicable unless a file or folder is externally referenced. If such references exist, the implementation MUST surface them before deleting or renaming.

* Deprecation:
  * Portuguese repository docs and prompts become deprecated once the English canonical versions land.

* Migration:
  * Translate or rewrite docs in-place when names are already English.
  * Rename files/directories only when their names violate the English naming standard.
  * Update references in the same change.

* Behavior for existing installations:
  * Not applicable to runtime product behavior.

## 15. Observability

The migration needs static observability, not runtime observability:

* A language audit report listing remaining Portuguese matches by category.
* A file/directory naming audit report.
* A stale path/reference report for renamed files.
* Build/lint output proving that code still compiles after path updates.

## 16. Eval Plan

* `EVAL-001`
  * Purpose: Detect Portuguese in forbidden Markdown surfaces.
  * Type: static
  * Setup: Exclude `.git`, `.pnpm-store`, `.turbo`, `.next`, `node_modules`, `dist`, generated outputs, and `__MACOSX`.
  * Action: Scan all `*.md` files for Portuguese stopwords, diacritics, and project-specific Portuguese terms.
  * Expected result: No blocking Portuguese remains outside approved exception annotations.
  * Pass criteria: Exit code `0` and report contains no blocking findings.
  * Criticality: blocking

* `EVAL-002`
  * Purpose: Detect Portuguese file or directory names.
  * Type: static
  * Setup: Use the source tree excluding generated/dependency directories.
  * Action: Scan paths for non-ASCII Portuguese characters and known Portuguese slugs.
  * Expected result: No blocking path findings.
  * Pass criteria: All findings are either absent or classified as approved proper nouns.
  * Criticality: blocking

* `EVAL-003`
  * Purpose: Detect Portuguese in code where it is not user-facing copy.
  * Type: static
  * Setup: Scan repository-owned source files: `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.json`, `*.sh`, `*.css`, and config files.
  * Action: Classify matches as user-facing copy, proper noun, developer-facing text, comment, or unknown.
  * Expected result: No developer-facing/comment/unknown Portuguese remains.
  * Pass criteria: Only approved exceptions remain.
  * Criticality: blocking

* `EVAL-004`
  * Purpose: Verify that UI Portuguese copy was preserved.
  * Type: behavioral
  * Setup: Capture representative UI copy before migration for landing and console.
  * Action: Compare protected UI strings after migration.
  * Expected result: Protected product copy remains semantically unchanged.
  * Pass criteria: No protected UI string is translated unless separately approved.
  * Criticality: blocking

* `EVAL-005`
  * Purpose: Verify docs links and renamed path references.
  * Type: static
  * Setup: Build a list of renamed files/directories.
  * Action: Search for stale old paths and run a Markdown link checker if available.
  * Expected result: No stale references.
  * Pass criteria: No broken internal references caused by this migration.
  * Criticality: blocking

* `EVAL-006`
  * Purpose: Verify code health after path/reference updates.
  * Type: syntax
  * Setup: Install dependencies if not already installed.
  * Action: Run the repository's existing lint, typecheck, and build commands.
  * Expected result: The same or better result than baseline.
  * Pass criteria: No new failure introduced by this migration.
  * Criticality: blocking

* `EVAL-007`
  * Purpose: Human review of semantic preservation for safety-critical docs.
  * Type: manual
  * Setup: Identify changed sections involving clinical, privacy, consent, authorization, minors, crisis, and AI limitations.
  * Action: Review translated text against original intent.
  * Expected result: No safety or privacy boundary is weakened.
  * Pass criteria: Human reviewer approves the translated meaning.
  * Criticality: blocking

## 17. Acceptance Criteria

* `AC-001`: Every repository-owned Markdown file is in English, except explicitly marked product-copy quotes or proper nouns. Traces to `REQ-001`.
* `AC-002`: No repository-owned file or directory name uses Portuguese words unless classified as a brand/proper-noun exception. Traces to `REQ-002`.
* `AC-003`: No code comment or developer-facing string remains in Portuguese. Traces to `REQ-003`.
* `AC-004`: Portuguese UI copy inside product templates and components remains Portuguese unless a separate product-language decision approves translation. Traces to `REQ-004`.
* `AC-005`: All affected internal links and path references resolve after renames. Traces to `REQ-006`.
* `AC-006`: The canonical spec, ADR, and audit prompts are in English. Traces to `REQ-007`.
* `AC-007`: The language audit can distinguish blocking Portuguese from allowed Portuguese UI copy. Traces to `REQ-008`.
* `AC-008`: The migration introduces no UI redesign, runtime behavior change, clinical claim change, privacy weakening, or CLI rename. Traces to `REQ-005`.
* `AC-009`: Safety-critical translations are manually reviewed and approved. Traces to `REQ-001`, `REQ-005`, and `REQ-007`.

## 18. Rollout and Rollback

Rollout:

1. Approve this spec.
2. Create or approve the language audit harness.
3. Capture baseline audit findings.
4. Translate Markdown and developer-facing code text in small batches.
5. Rename only violating paths, if any, and update references immediately.
6. Run evals after each batch.
7. Perform final safety/privacy semantic review.

Rollback:

* Revert the migration commit if translation weakens safety or breaks references.
* If only a specific path rename breaks tooling, revert that rename and reopen the naming decision.
* Do not partially rollback by restoring Portuguese docs while keeping English references unless the audit is updated accordingly.

## 19. Risks and Dependencies

| Risk | Probability | Impact | Mitigation |
|---|---:|---:|---|
| Safety-critical meaning changes during translation | Medium | High | Manual review for clinical/privacy/safety sections |
| Agent prompts lose instruction strength | Medium | Medium | Compare prompt structure before/after and preserve normative wording |
| UI copy is translated by mistake | Medium | Medium | Protected UI-copy eval and exception allowlist |
| Path renames break links or imports | Low | Medium | Stale-reference scan and build checks |
| Audit produces noisy false positives | High | Low | Classify findings by surface and exception category |
| `amarelo` is incorrectly translated to `yellow` | Medium | High | Treat as brand/proper noun invariant |

Dependencies:

* Existing repository commands for lint/build/typecheck.
* A deterministic language audit script or equivalent command.
* Human approval for safety-critical translated meaning.

## 20. Assumptions

* `Amarelo`, `Amar.elo`, and the root folder `amarelo` are product/repository names and should remain unchanged.
* The current product UI is intended to remain PT-BR for this migration.
* `.agents/skills/**/*.md` are first-party enough to be governed by this spec unless explicitly classified as third-party/vendor content.
* Generated outputs should be excluded from migration and audit.
* The migration will happen before the CLI rename loop.

## 21. Open Questions

* Should the root extracted folder/repository name `amarelo` be treated permanently as a brand exception?
* Should first-party skill names remain as existing English slugs, or should any internal skill folder be renamed for consistency?
* Should Portuguese product-copy quotes inside specs be preserved verbatim, translated, or represented as English descriptions with references to source UI files?
* Which exact command set is authoritative for final verification in this snapshot, given that the scratch extraction is not currently the active Git repository root?
* Should this migration include `.agents/skills` content now, or should local skills be audited in a separate pass?

## 22. Definition of Done

* [ ] This spec is reviewed and explicitly approved by the human project owner.
* [ ] A language audit harness exists and has a documented exception model.
* [ ] Baseline Portuguese findings are captured before implementation.
* [ ] All repository-owned Markdown files are English or have approved exceptions.
* [ ] Canonical Spec, ADR, and audit prompts are English.
* [ ] All repository-owned file and directory names comply with the naming rule or have approved brand/proper-noun exceptions.
* [ ] Code comments and developer-facing text are English.
* [ ] Portuguese product UI copy remains intentionally Portuguese.
* [ ] Stale references caused by any rename are resolved.
* [ ] Lint/typecheck/build results show no new failures.
* [ ] Safety-critical translations are manually reviewed.
* [ ] No unrelated CLI rename, UI redesign, runtime behavior change, or privacy/clinical policy change is included.
