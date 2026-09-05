# Integrated Memory delivery

On 2026-09-05 Jonatas explicitly prioritized implementation and staging integration over new validation. SPEC-016, 012, 011, 043, 017 and 018 are implemented as separate branches/PRs. This records delivered source, not proven operation, costs, quality or production readiness. [SPEC-049](../../../specs/049-integrated-memory-validation-debt.spec.md) owns the deferred validation cycle.

| Spec | Implemented boundary | Delivery |
|---|---|---|
| 016 | Authenticated SDK/Neo4j composition, schema readiness, candidates and usage ledger | PR87 |
| 012 | Durable patient fragment buffer, outbox, isolated BullMQ worker and attempt accounting | PR88 |
| 011 | Detached bounded shadow, exact replacement plan and paired evidence contract | PR89 |
| 043 | Eligible same-key conflict abstention, configured-store integrity runner and trace/gate | PR90 |
| 017 | Internal server assignment, live kill/evidence policy and actual serving attempt ledger | PR91 |
| 018 | Deterministic ledger aggregation, JSON/HTML report and scale/hold/rollback | feat/spec-018-memory-economics |

## Runtime ownership

Neo4j remains canonical. The Memory workspace owns `createNeo4jMemoryRuntime`, `createNeo4jMemoryBackgroundRuntime` and the separately started `startMemoryBackgroundWorker`. The worker owns one reference-only `memory-curation-v1` queue on persistent Redis Queue. Redis Cache uses a physically separate instance. MinIO retains its existing object-store boundary.

Chatterbox captures only the authenticated current patient message. Short eligible statements accumulate in a durable bounded conversation buffer; queue jobs contain references, never text. The server internal allowlist and profile decide ingestion. Free does not start paid background work. Consent, actor attribution, source identity, lease fences and suppression still constrain protected operations. Model extraction proposes candidates; deterministic high-confidence policy activates derived records with truthful transformation provenance.

Ana output and inactivity never become Memory evidence. A transient recent buffer may contain both roles for conversation coherence. Source scope is separate from commercial duration or provider billing.

## Serving and measurement

Conversation's shadow and experiment decorators keep one visible underlying invocation. Shadow compares a proposed replacement without invoking another model. Canary treatment replaces bounded history with governed Memory plus minimal recent context; it does not append two full histories. Server policy and evidence are read before assignment and again before returning treatment. Default flags are off and missing evidence retains control/hold.

The Chatterbox model wrapper records actual provider attempts, including failures. Usage and costs that are unavailable remain unknown. A failed observation does not cause another provider call. Background intent/completion entries reconcile by attempt; unresolved crash intents remain unknown.

The SPEC-018 report consumes canonical ledger entries and explicit nonoverlapping allocations. It writes redacted JSON and standalone HTML without provider calls. It separates operational family cost from one-time experiment cost, supports measured paired ROI, and normalizes an explicitly declared 60 minutes/week to 260 minutes per average month. Free revenue is zero and its revenue ratio is null. This is not a decision about billing duration.

## Current limitations

No new build, test, evaluation, load, CI/deployment validation or rollout was executed for this implementation-first delivery. The 100-job load entry/report remains to be authored and run. Canary exposure accounting is process-local and requires a single process until durable distributed admission is added. Physical purge and full-database rollback without the authoritative suppression journal remain unsupported.

SPEC-025 retains open commercial decisions. SPEC-033 is owner-deferred and still required before external exposure; SPEC-034 owns later voice lifecycle semantics. Full voice-to-voice cost and naturalness are not measured by this textual Memory implementation. Unknown audio cost cannot become a claimed plan margin.

