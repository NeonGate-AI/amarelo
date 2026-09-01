# Memory Nucleus eval world spec

Memory Nucleus owns longitudinal personal memory. Conversation owns final model-context assembly. Knowledge/RAG is an independent non-personal domain.

Hard invariants:

- authorization is resolved before personal-memory row access;
- candidates are proposals, never canonical truth by model authority alone;
- canonical memory retains evidence lineage and version history;
- tombstoned/expired/superseded records are never normal serving candidates;
- serving retrieval uses deterministic structured/exact/FTS paths and a hard token budget;
- vector/model reranking is optional and disabled until eval evidence justifies it;
- authority changes (consent/revocation/delete) fail closed and take effect before optimization jobs;
- candidate formation is idempotent enough to avoid paying twice for the same source while remaining single-process MVP infrastructure;
- economic metrics distinguish estimated savings from billed cost.
