---
id: ADR-0007
title: Separate canonical memory kinds from longitudinal projections
status: accepted
date: 2026-08-27
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0007: Separate canonical memory kinds from longitudinal projections

## Context

Amarelo needs vocabulary that supports a person-centric history without treating transcripts, summaries, framework state, and model inferences as interchangeable memory. Calling episodic, semantic, and longitudinal records three peer kinds would turn a cross-time view into another competing source of truth and make correction, provenance, and cost control harder.

## Decision

Longitudinal memory is the aggregate person-centric system across time. It is not a durable record `kind`.

The canonical durable record kinds are:

- **episodic record:** an accepted event, experience, or interaction outcome linked to source and either a supported exact occurrence time or a supported approximate temporal reference with explicit precision; an exact date is never inferred when the source does not provide one;
- **semantic assertion:** a versioned, time-aware assertion such as an explicit preference, relationship, mutable fact, or qualified derived pattern.

A **longitudinal projection** is a purpose-, audience-, and time-window-specific read model over eligible episodic records and semantic assertions. It is lossy, expiring, source-versioned, and rebuildable. It is never a universal profile or canonical truth.

Procedural memory governs agent behavior through versioned prompts, rules, approved examples, and workflows outside the person's memory namespace. LangGraph checkpoints and per-call working context are operational state, not durable person memory.

## Alternatives considered

- **Store `longitudinal` as a third durable kind:** rejected because it duplicates and can contradict the records it summarizes.
- **Use one mutable person-profile blob:** rejected because it obscures provenance, time, uncertainty, correction, and partial revocation.
- **Treat transcripts or checkpoints as durable memory:** rejected because source interaction and execution state have different authority and retention semantics.
- **Let each conversation agent maintain its own profile:** rejected because it fragments the person's record and conflicts with ADR-0001.

## Consequences

Schemas and model outputs may propose only episodic or semantic candidate kinds. Episodic schemas preserve temporal precision and support either exact occurrence time or approximate source wording without fabricated dates. Longitudinal projections require source references, a source version, purpose, time window, expiry, and deterministic invalidation after lifecycle changes. Person-specific communication preferences remain semantic assertions; they do not silently rewrite procedural instructions.

## Compliance and verification

Contracts and synthetic offline evals must reject `longitudinal` as a candidate kind, preserve provenance and uncertainty, and demonstrate that projections can be invalidated and rebuilt from canonical records. No agent or framework store may create an independent canonical profile.

## Links

- Shared-memory decision: `.agents/decisions/0001-shared-longitudinal-memory.md`
- Memory constitution: `.agents/MEMORY.md`
- Runtime memory design: `elos/memory-nucleus/docs/MEMORY.md`
- Memory behavior spec: `.agents/specs/101-memory-nucleus.md`
