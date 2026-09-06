---
id: ADR-0014
title: Workspaces and centralized harness
status: accepted
date: null
deciders:
  - product-owner
supersedes: []
superseded-by: null
---

# ADR-0014: Workspaces and centralized harness

## Status
Accepted

## Decision
Rename `elos/` to `workspaces/` and centralize engineering-agent knowledge under `.agents/context|rules|specs|adrs`. Remove local agent instruction files after migrating durable context.

## Consequences
Repository vocabulary becomes conventional and the harness supports progressive disclosure instead of duplicated local instructions.
