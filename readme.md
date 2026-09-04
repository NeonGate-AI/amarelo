# Amarelo

Amarelo is an AI-native, voice-first product organized as a monorepo with explicit product, AI and longitudinal-memory boundaries.

## First checkout

```sh
pnpm install
elo doctor
elo check all
```

The install lifecycle configures the direct user-scoped `elo` command when a supported user binary directory is available. `./cli/elo setup` is the recovery entrypoint before `elo` is on `PATH`; `pnpm postclone` explicitly reruns setup. Elo never edits shell profiles or installs a global npm package.

## Repository map

```text
workspaces/apps/      user-facing products/runtimes
workspaces/microservices/
                      deployable network APIs, beginning with Chatterbox
workspaces/ai/        Conversation, Knowledge and future product Agents
workspaces/memory-nucleus/
                      longitudinal memory: Domain → Application → Infrastructure
                      with cross-cutting Assurance/Evals
workspaces/packages/  cross-workspace contracts/capabilities
cli/src/              Elo monorepo-platform CLI (POSIX shell)
.audit/               executable POSIX shell checks and temporary evidence
.agents/              normative engineering/context harness
```

## Glossary

- **AI** — product AI capabilities.
- **Conversation** — interaction, final context assembly and cognitive routing.
- **Knowledge** — non-personal Knowledge/RAG retrieval.
- **Agents** — future product AI executors; distinct from `.agents` engineering context.
- **Memory Nucleus** — longitudinal memory formation, judgment, retrieval, projection and economics.
- **Evaluation** — answers “was it good?”.
- **Observability** — records and transports “what happened?”.
- **Judgment** — semantic decisions that cannot be reduced to deterministic policy.
- **Cognitive lane** — Reflex, Contextual or Deliberative routing for an interaction.
- **Elo** — project platform CLI for bootstrap, setup, doctor, cleanup, env, Git and invariant checks; it is not Turborepo.

Engineering agents start at [`AGENTS.md`](./AGENTS.md). CLI installation and command contracts are documented in [`cli/readme.md`](./cli/readme.md).
