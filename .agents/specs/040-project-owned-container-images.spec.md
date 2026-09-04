---
id: SPEC-040
title: Make runtime application containers project-owned
type: migration
status: in-progress
mode: prospective
created: 2026-09-04
updated: 2026-09-04
owners:
  - Jonatas Sales
targets:
  - workspaces/apps
  - workspaces/microservices/chatterbox
  - workspaces/packages/runtime
  - Kubernetes local runtime
context:
  - .agents/context/workspaces/packages/overview.md
  - workspaces/packages/runtime/readme.md
rules:
  - .agents/rules/001-architecture.rule.md
  - .agents/rules/005-markdown.rule.md
  - .agents/rules/010-source-organization.rule.md
  - .agents/rules/011-spec-driven-development.rule.md
  - .agents/rules/012-container-ownership.rule.md
adrs:
  - .agents/adrs/0029-kubernetes-local-runtime.adr.md
  - .agents/adrs/0031-project-owned-container-images.adr.md
skills:
  - .agents/skills/to-spec/SKILL.md
  - .agents/skills/domain-modeling/SKILL.md
  - .agents/skills/implement/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/code-review/SKILL.md
evidence:
  - pending
---

# SPEC-040: Make runtime application containers project-owned

## Problem Statement

The Kubernetes runtime uses one platform-owned generic application image for multiple independently deployable projects. That hides Docker startup and environment ownership from each project and prevents a service such as Chatterbox from being represented as its own container boundary.

## Solution

Give every declared Amarelo application workload its own workspace-root Dockerfile and safe environment template. Update the Kubernetes runtime to build, load, and deploy a distinct image for landing, console, onboarding, mobile, and Chatterbox while leaving PostgreSQL, Redis, and Cypress as platform-owned images.

## User Stories

1. As a project maintainer, I want the Dockerfile beside the process it starts, so that its container contract is inspectable at the ownership boundary.
2. As a developer, I want a safe environment template for each deployed project, so that required configuration is discoverable without distributing credentials.
3. As a runtime operator, I want Chatterbox represented as its own workload and Service, so that its health is checked with the rest of the local runtime.

## Scope

This spec owns deployable-project Dockerfiles, `.env.template` files, project image identities, Kustomize workload/service wiring, runtime image build/load behavior, runtime documentation, and executable runtime checks.

## Implementation Decisions

- The repository root is the Docker build context for every project Dockerfile.
- Local images are `amarelo-<workload>:local`; an optional common registry prefix may replace the local image source without collapsing workloads into one image.
- The Kubernetes runtime owns orchestration only; each project Dockerfile owns the command that starts its process.
- Chatterbox runs on port `3004` and has HTTP readiness/liveness probes at `/health`.
- Browser templates contain only `VITE_*` public configuration and never an OpenAI key or other secret.

## Testing Decisions

### Primary seam

Invoke the public runtime lifecycle through its controlled-process audit and observe one build/load/deployment image per application workload plus Chatterbox health.

### Secondary seams

Render Kustomize, inspect Dockerfile/template ownership, and run relevant typechecking/static checks.

### Fixtures and privacy

Use temporary fake Docker/Kubernetes commands, generated local runtime credentials, and public placeholder URLs. No real secrets or user data are used.

### Required validation

Run the runtime audit, shell syntax checks, Kustomize rendering when available, and the complete executable repository validation.

## Acceptance Criteria

- [ ] Every declared Amarelo application workload owns a Dockerfile and `.env.template` at its workspace root.
- [ ] The generic runtime `Dockerfile.dev` no longer builds or starts application workloads.
- [ ] Runtime up builds and loads a distinct image for landing, console, onboarding, mobile, and Chatterbox.
- [ ] Kubernetes renders a Chatterbox Deployment/Service with `/health` readiness and liveness checks.
- [ ] Cypress runtime availability checks include Chatterbox health without gaining non-critical browser scenarios.
- [ ] Templates contain no credentials or browser-exposed server secrets.
- [ ] Runtime documentation, context, and executable checks match the new ownership model.

## Failure Behavior

A missing Dockerfile/template, unavailable image loader, failed image build/load, invalid manifest, or failed health rollout returns non-zero and blocks readiness. A browser configuration template containing a secret is a harness failure.

## Out of Scope

- Production registry publishing, multistage production optimization, ingress, TLS, autoscaling, or cloud deployment.
- Changing PostgreSQL, Redis, or Cypress image ownership.
- Broad product end-to-end coverage or a database test seed.

## Evidence and Promotion

Record exact audit/typecheck/render commands and final review evidence at completion. Promote durable ownership to ADR-0031, Rule 012, runtime context, and runtime documentation.

## Further Notes

The shared generic runtime image is retired only for Amarelo-owned application workloads; infrastructure and third-party test images remain platform-owned.
