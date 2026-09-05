# Operational Memory boundary

Chatterbox owns the process-scoped `createNeo4jMemoryRuntime` and maps trusted WorkOS tenant/person identifiers to versioned tenant-scoped UUIDs. Each `forRequest` client binds the authenticated actor, subject, purpose, expiry and correlation. AI consumers continue to use `@repo/memory-sdk`. The Nucleus package bundles JavaScript and declarations; producer-private aliases are not consumer APIs.

The opt-in development transport supports consent, explicit write, search and immediate suppression. `correct()` remains unsupported. `CHATTERBOX_MEMORY_ENABLED=true` requires the four server-only `MEMORY_NEO4J_*` connection values in Chatterbox's environment template. Ordinary Conversation serving remains at its existing baseline. This internal text profile does not activate voice serving or Free background curation.

The Neo4j unit of work locks current consent and checks request authority and schema readiness around protected work. Explicit write commits evidence, candidate, canonical version, lifecycle and pending outbox atomically. Server-only candidate delivery can stage filtered patient evidence and promote it later under current consent; source identity/version cannot be reused for changed text. Assistant output and inactivity are excluded before evidence hashing and persistence.

Normal retrieval uses structured/full-text policy and the existing hard token budget. SDK diagnostics record actual full-text calls and zero model/web/vector calls. Wire revalidation rejects a supplied context projection that disagrees with its governed record.

Usage events and immutable pricing/conversion snapshots have separate scoped ledger identities. Completed SDK operations dispatch content-free observations through one bounded limiter per runtime. Telemetry failure preserves the completed SDK result; missing delivery must not be counted as measured zero. Unknown cost and text-run audio timings stay null. Failed provider-attempt accounting belongs to the background/serving phases, not this completed-operation observer.

Deletion returns `suppression-only` with no physical-purge deadline. A retained suppression ledger prevents command replay, rebuilt-index retrieval and stale canonical-head restoration from serving the memory. Supported recovery keeps Chatterbox stopped, retains and verifies the latest suppression ledger, restores canonical records, reapplies tombstones by canonical identity, rebuilds indexes and checks readiness before reopening. Whole-database rollback that also rolls back suppression is unsupported; schema readiness cannot certify backup freshness. Do not reopen until the authoritative suppression journal has been established.

SPEC-016 records exact implementation and validation checkpoints. Passing earlier tests does not imply that an unvalidated later commit has passed them.
