# ADR 0030: Enforce Memory eligibility and integrity before ranking

## Status

Accepted on 2026-09-04.

## Context

ADR-0003 establishes authorization before private-memory retrieval. Authorization is necessary but not sufficient for safe serving: a record can still be stale, tombstoned, superseded, policy-ineligible, derived from untrusted evidence, cross-scope, or adversarially similar to a query. A similarity or trust-weighted ranker can otherwise promote such a record above legitimate memory without violating the authorization decision itself.

The Memory Nucleus also owns lifecycle and store identity. A write path and a read/rebuild path resolving different effective tenants, schemas or databases can create both correctness failures and privacy failures while each individual operation appears valid.

The project therefore needs a separate integrity boundary between authorization and ranking, plus assurance that every lifecycle path operates on the same effective store identity.

## Decision

Memory serving follows this order:

```text
authority eligibility
→ integrity/provenance eligibility
→ candidate retrieval
→ ranking/salience/decay
→ bounded projection
```

Authorization continues to run before private-memory access. Integrity and provenance policy then determine which authorized records are eligible to participate in ranking and projection.

Ranking, similarity, salience, recency, decay, trust scores and model judgment may order or annotate only eligible records. They cannot make an ineligible record eligible, revive tombstoned or revoked state, cross a tenant/subject/purpose boundary, or bypass provenance requirements.

Evidence and candidates that have not crossed the canonical activation policy remain evidence or candidates; semantic similarity alone cannot promote them into served canonical Memory. When multiple policy-eligible memories conflict and deterministic precedence cannot safely resolve them, the serving path must preserve the conflict and abstain, minimize projection, or use an explicitly governed resolution path rather than silently choosing the most similar statement as truth.

The effective Memory store identity—tenant, subject, configured database/schema/namespace and lifecycle scope—must be resolved explicitly and propagated consistently through write, retrieve, supersede, suppress, replay, restore, reindex and rebuild paths. An explicit non-default configuration may not silently fall back to a default store on any of those paths.

Before user-visible canary exposure, assurance must include adversarial false-memory fixtures that contain no prompt-injection instructions, cross-scope fixtures, lifecycle resurrection attempts, and non-default store-configuration fixtures. Model-assisted integrity detectors may be evaluated, but they are supplemental, costed and never the sole eligibility boundary.

## Consequences

- Authorization and integrity remain separate reviewable concerns.
- Retrieval implementations need explicit provenance/state eligibility before ranking.
- High semantic relevance may legitimately result in abstention when integrity is unresolved.
- Ranking experiments cannot trade privacy or lifecycle correctness for Recall@k.
- Store configuration becomes part of the tested isolation boundary, not merely deployment metadata.
- Assurance gains poisoning, conflict, lifecycle and configured-store evals before canary.
- Optional model-assisted detection adds measurable latency/cost and must justify itself against deterministic alternatives.
- This ADR does not select a new memory framework, graph engine, vector database or retrieval platform.
