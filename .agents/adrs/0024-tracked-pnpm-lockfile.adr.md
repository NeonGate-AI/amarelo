# ADR 0024: Track the pnpm lockfile for reproducible installs

## Status

Accepted on 2026-09-03.

## Context

The repository previously omitted `pnpm-lock.yaml` and installed dependencies with `--no-frozen-lockfile --lockfile=false`. The owner has now deliberately committed the lockfile, but Elo doctor, CI, and the Compose workspace preparation still reject or bypass it. That mismatch makes `main` fail its first validation gate and allows dependency resolution to vary between environments.

## Decision

Track the root `pnpm-lock.yaml` as the authoritative dependency resolution for the monorepo. CI, Elo bootstrap, and Compose workspace preparation use `pnpm install --frozen-lockfile`. Elo doctor fails when the lockfile is missing and directs developers to restore or regenerate it intentionally.

This decision supersedes only the no-lockfile clauses in ADR-0023 and in historical delivery evidence. ADR-0023's Conversation topology decision remains accepted and normative.

## Consequences

- Fresh installations are reproducible against the reviewed dependency graph.
- Manifest changes that do not update the lockfile fail automated installation.
- Dependency upgrades include the lockfile diff in review.
- Local recovery may regenerate the lockfile deliberately, but automated paths never mutate it.
- Historical specs describing the former policy remain readable as evidence and are not current installation guidance.
