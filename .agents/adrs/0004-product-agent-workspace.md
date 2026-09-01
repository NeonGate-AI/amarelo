---
id: ADR-0004
title: Keep product-agent runtime in one AI workspace
status: superseded
date: 2026-08-25
deciders:
  - product-owner
supersedes: []
superseded-by: ADR-0010
---

# ADR-0004: Keep product-agent runtime in one AI workspace

This historical decision was superseded by ADR-0010 when the owner approved multiple feature-first AI domain workspaces under the internal `elos/` source root.

## Context

The repository previously mixed reusable coding-agent skill documents with empty product-runtime placeholders under `ai/`. The owner clarified that root `ai/` exists for agents built with LangChain, LangGraph, and LangMem.

## Decision

`ai/` is one monorepo workspace containing executable product-agent code, memory adapters, policies, providers, tools, and workflows. Engineering-agent skills live under `.agents/skills/`.

The workspace starts as a scaffold until runtime dependencies and providers are explicitly selected.

## Alternatives considered

- **Keep skills and runtime together:** rejected because coding instructions and product behavior have different consumers and authority.
- **One workspace per contextual agent immediately:** rejected because shared memory and policy are central and no independent deployment need is established.
- **Embed agents in each application:** rejected as the default because it would duplicate orchestration and memory policy across surfaces.

## Consequences

The root build could typecheck the AI workspace without prematurely selecting LangChain dependencies. Under this historical layout, nested runtime instructions lived in `ai/AGENTS.md`.

## Compliance and verification

The historical compliance target required `pnpm-workspace.yaml` to include `ai` as one package and product runtime code to stay in `ai/src`; coding-agent skills stayed in `.agents/skills`. ADR-0010 replaces these runtime paths and workspace boundaries.

## Links

- Repository architecture: `.agents/ARCHITECTURE.md`
- Superseding decision: `.agents/decisions/0010-elos-and-ai-domain-workspaces.md`
