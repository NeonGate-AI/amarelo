---
id: SPEC-053
title: Present Amarelo through its product value
type: chore
status: in-progress
mode: prospective
created: 2026-09-06
updated: 2026-09-06
owners:
  - Jonatas Sales
targets:
  - root readme.md
  - assets/images
context:
  - .agents/context/product/overview.md
rules:
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/008-product-safety-and-privacy.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
adrs:
  - none
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - readme.md
  - assets/images/amarelo-banner.png
  - .audit/canonical.audit.sh
  - https://github.com/NeonGate-AI/amarelo/pull/95
---

# SPEC-053: Present Amarelo through its product value

## Problem Statement

The draft README in PR #95 serves as a detailed architecture walkthrough.
The owner wants the public repository to present Amarelo to recruiters through
its product value while reducing unnecessary implementation disclosure.

## Solution

Present the voice experience, continuity over time and human support network
in a concise product narrative. Preserve the brand banner and a short portfolio
introduction. Remove the detailed architecture illustration from both the README
and the current repository tree, and remove the architecture walkthrough.

## User Stories

1. As a recruiter, I want to understand the product and its creator's contribution
   quickly, so that I can assess the portfolio without studying internal design.
2. As a prospective user, I want development status and product boundaries stated
   clearly, so that future capabilities are not mistaken for available care.
3. As the owner, I want the public introduction to avoid explaining the internal
   mechanism, so that the README reveals only the intended product-level detail.

## Scope

Rewrite the root README in its existing English presentation, preserve the
supplied banner, remove the architecture image and its README references, and
update this spec and the catalog. Use the existing PR #95 into staging.

The owner explicitly expands that PR's earlier README-and-images-only scope to
include this numbered spec and catalog entry. Retaining the existing PR branch
is an intentional exception to the new-spec branch naming convention.

## Implementation Decisions

- Explain longitudinal memory only as continuity from one conversation to another.
- Keep voice, personal agency, the human support network and the adult audience.
- State that the MVP is in development and that the complete experience still
  requires validation; make no clinical, cost-saving or production-ready claims.
- Replace implementation walkthroughs, internal-document links and operational
  details with a short skills/technology summary and simple preview instructions.
- Remove assets/images/memory-nucleus-diagram.png without replacing or relocating
  it. Preserve assets/images/amarelo-banner.png byte-for-byte.
- Use only existing public product facts and synthetic examples. No new images,
  dependency changes, application behavior or architecture decisions are needed.

## Testing Decisions

### Primary seam

The root README as a reader encounters it on GitHub: clear product hierarchy,
honest development status and no detailed architecture illustration or walkthrough.

### Secondary seams

Check local links/fragments, image alt text, Markdown structure and the tracked
tree's image deletion. Inspect the final diff for unintended file changes.

### Fixtures and privacy

Keep the owner-supplied banner and general illustrative product prose. No private
health records, credentials, operational endpoints or customer examples.

### Required validation

Review the prose against the approved product narrative and safety rules. Verify
links, image identity/deletion, spec/catalog consistency and git diff --check.
Run the canonical audit and complete remote CI on the final head, inspect Vercel
statuses, and obtain independent Standards and Spec-fidelity reviews before merge.
Use focused document/tree checks for this reversible content change rather than
introducing tests that duplicate its wording.

## Acceptance Criteria

- [x] README leads with the product, its intended audience and user benefits.
- [x] Continuity is explained without an internal architecture walkthrough.
- [x] The architecture image is absent from the README and current tree.
- [x] The existing banner is unchanged and all remaining local links resolve.
- [x] Copy preserves development status, agency and qualified-care boundaries.
- [x] Spec/catalog agree and the required content checks pass.
- [ ] Required final-head CI, Vercel and both review axes permit staging merge.
- [x] Promotion instructions reserve the staging-to-main merge for the owner.

## Failure Behavior

Broken references or misleading claims block content acceptance. Failed required
CI or deployment checks block staging merge; record any pre-existing blocker
without weakening gates or describing them as passed. If revision is needed,
restore a minimal safe product introduction while keeping the diagram removed.

## Out of Scope

Changing repository visibility, deleting unrelated engineering documentation,
rewriting Git history, removing external copies, modifying runtime behavior or
automatically merging into main. This reduces prominence of implementation
details; it does not make already-public source or historical copies confidential.

## Evidence and Promotion

Record source checks and final review/CI references in this spec and PR #95.
Merge to staging only on a reviewed green head, then open a separate PR whose
head is staging and base is main. The owner performs the main merge. No new ADR
is required because the product architecture and access boundaries do not change.

Content verification on 2026-09-06: the README was reduced from approximately
1,529 to 557 whitespace-delimited words. Its nine Markdown/HTML references were
checked; local files and fragments resolve, image alt text is present and code
fences are balanced. The banner is byte-identical to the supplied PR asset;
the architecture PNG and its README reference are absent. Canonical audit and
git diff --check pass. Independent content review found no blocking claims.

The separate spec workflow audit reports 23 historical acceptance/evidence
metadata failures in unchanged specs; none refers to SPEC-053. Existing staging
CI also fails in the Elo audit suite before later validation runs. This change
does not rewrite historical evidence or waive those failures. Final-head CI
and review links are recorded in PR #95. Keep this spec in-progress while its
merge gate is unresolved; promotion remains conditional on green validation.

## Further Notes

The owner's instruction in this session supplies approval for this prospective
contract. Delivery metadata must not reproduce the removed architecture content.
