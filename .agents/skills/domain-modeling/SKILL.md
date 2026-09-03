---
name: domain-modeling
description: Sharpen Amarelo vocabulary, context ownership and consequential architecture decisions.
---

# Domain Modeling

Use this procedure when a term, boundary or hard-to-reverse tradeoff is being changed—not merely when reading existing vocabulary.

## Canonical locations

- Stable vocabulary, responsibilities and relationships: `.agents/context/`.
- Consequential accepted decisions: `.agents/adrs/<number>-<name>.adr.md`.
- Required delivery behavior: `.agents/specs/<priority>-<name>.spec.md`.
- Durable constraints: `.agents/rules/<name>.rule.md`.

Context is not a scratchpad, implementation plan or evidence log. ADRs explain a consequential choice and its alternatives; they do not restate ordinary code structure.

## Procedure

1. Load the narrowest existing context and accepted ADRs for the affected domain.
2. Challenge overloaded or conflicting terms against repository language and current code.
3. Test the proposed model with concrete normal, temporal, authorization and failure scenarios.
4. Resolve one canonical term and owner for each concept. Record implementation-independent meaning in the appropriate scoped context document.
5. Create or supersede an ADR only when the decision is hard to reverse, surprising without rationale and the result of a real tradeoff.
6. Keep delivery requirements in the numbered spec and executable invariants in tests/checkers rather than duplicating them into context.
7. Update every affected reference atomically and preserve `.adr.md`, `.rule.md` and `.spec.md` suffixes.

## Completion criterion

The vocabulary has one source of truth, code and documents use it consistently, ownership boundaries are explicit, and any consequential tradeoff has an accepted or superseding ADR without duplicated implementation detail.
