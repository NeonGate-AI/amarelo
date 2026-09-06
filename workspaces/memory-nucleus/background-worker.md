# Memory background worker

SPEC-012 owns one long-lived worker in this workspace. The worker polls Neo4j outbox references, acknowledges BullMQ enqueue before marking publication and uses the dedicated persistent Redis Queue. Cache and queue must have different server endpoints, not just database numbers.

Start separately from Chatterbox:

```sh
pnpm --filter @nucleus/memory background:start
```

Server-only environment: MEMORY_BACKGROUND_ENABLED=true; MEMORY_NEO4J_URI, MEMORY_NEO4J_USERNAME, MEMORY_NEO4J_PASSWORD, MEMORY_NEO4J_DATABASE; MEMORY_REDIS_QUEUE_URL; MEMORY_REDIS_CACHE_URL; OPENAI_API_KEY; MEMORY_EXTRACTION_MODEL. Model selection is explicit. There are no automatic stronger-model escalations or provider retries hidden inside the SDK. MEMORY_WORKER_CONCURRENCY defaults to one and is capped at four.

Use an internal allowlist in Chatterbox to opt in source capture. Free profiles never enqueue paid background work. Only the authenticated current patient text is eligible evidence; client-supplied history, assistant output and idle durations are excluded. Consent must already authorize collection, processing and search.

Every attempt is fenced in Neo4j and records provider accounting. Missing rates or provider usage remain unknown; worker metrics do not prove a price, margin, voice quality or scale readiness. Failed final attempts remain bounded failed jobs and durable graph state for later operator inspection. Replaying a reference cannot bypass current consent or suppression.

The optional Kubernetes memory-worker overlay starts with zero replicas. Build the included Dockerfile, provide the runtime Secret and explicitly scale to one after selecting an internal workload. The base runtime does not enable paid calls.

Implementation was integrated at the owner's request before validation. Broker restart, process crash/retry, 100-job load, physical deletion and voice economics remain unproven until the separate debt/validation cycle.

