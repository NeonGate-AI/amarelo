# ADR 0015: Memory Nucleus MVP Clean Architecture

## Status
Accepted

## Decision
Memory Nucleus becomes one `@nucleus/memory` workspace with production code organized as Domain, Application and Infrastructure under `src/`. Cross-cutting evaluation code lives under `src/assurance/evals/` and is not a fourth Clean Architecture layer. Production-distribution machinery not required to prove the MVP is deferred.

## Consequences
Dependency inversion becomes explicit while evaluation, judgment, retrieval, projection, economics and observability remain first-class. Pre-release database history may be squashed when no persistent deployment state depends on it.
