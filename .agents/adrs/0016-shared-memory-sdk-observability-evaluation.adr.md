# ADR 0016: Shared Memory SDK, Observability and Evaluation

## Status
Accepted

## Decision
`@repo/memory-sdk` is the public Memory boundary. `@repo/observability` owns generic metrics/traces/events and telemetry transport. `@repo/evaluation` owns generic quality/ranking evaluation. Memory-specific economics remains in Memory Nucleus Domain/Application.
