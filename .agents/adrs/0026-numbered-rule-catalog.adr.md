# ADR 0026: Use stable numbered identities for repository rules

## Status

Accepted on 2026-09-03.

## Context

Amarelo's durable rules already use the semantic `.rule.md` suffix, but the eleven canonical files remain unnumbered while Elo scaffolds future rules with three-digit prefixes. The scaffold therefore has to infer occupied positions from an inconsistent catalog, and exact rule paths are repeated across specs, context, ADRs, skills, audits, and root navigation. A partial rename would break agent loading or leave stale sources of truth.

## Decision

Every durable rule is a direct `.agents/rules/NNN-lowercase-kebab-case.rule.md` child. `.agents/rules/readme.md` remains the only unnumbered support document.

Assign the initial eleven identities in lexical slug order: `001` architecture, `002` code style, `003` context engineering, `004` import boundaries, `005` Markdown, `006` Memory Nucleus, `007` package ownership, `008` product safety and privacy, `009` React and Next.js, `010` source organization, and `011` spec-driven development.

The prefix is a stable catalog identity and never defines enforcement precedence. Existing rule metadata and authored policy remain authoritative. New rules receive one greater than the highest allocated identity. Retired identities are not reused or compacted, and canonical path changes update every repository reference atomically without compatibility aliases.

## Consequences

- Rule paths are deterministic and align with Elo-generated artifacts.
- Agents and maintainers can cite one durable identity without interpreting filename order as precedence.
- Renames and stale references become mechanically detectable.
- Adding or retiring a rule requires an index and checker update in the same governed change.
- The migration changes no existing policy meaning, applicability, or runtime behavior.
