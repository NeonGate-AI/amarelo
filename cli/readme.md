# Elo CLI

Elo is the repository-local platform CLI for the Amarelo monorepo.

## Entrypoints

- `pnpm elo` — bootstrap/install the repository-local Elo environment.
- `./cli/elo <command>` — invoke Elo directly.
- `pnpm dev`, `pnpm start`, `pnpm build`, `pnpm typecheck`, and `pnpm test` remain Turborepo task-graph entrypoints and are intentionally not duplicated by Elo.

The executable lives at `cli/elo`. CLI implementation lives under `cli/src/` and is POSIX shell only. There is intentionally no root `./elo` binary.

## Ownership

Elo owns repository-local platform operations such as bootstrap/setup, doctor, cleanup, environment validation, Git hook setup, and platform/architecture checks. It must not mutate host shell profiles, install global packages, or become a second task runner.

`package.json` keeps only the explicit `elo`/`prepare` platform entrypoints plus canonical Turborepo task scripts. Husky hooks are thin adapters that delegate back to `./cli/elo`.
