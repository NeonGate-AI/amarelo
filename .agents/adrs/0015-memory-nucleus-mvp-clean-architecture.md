# ADR 0015: Memory Nucleus MVP Clean Architecture

## Status
Accepted

## Decision
Memory Nucleus becomes one `@nucleus/memory` workspace organized as Domain, Application, Infrastructure and Evals. Production-distribution machinery not required to prove the MVP is deferred.

## Consequences
Dependency inversion becomes explicit while evaluation, judgment, retrieval, projection, economics and observability remain first-class. Pre-release database history may be squashed when no persistent deployment state depends on it.
