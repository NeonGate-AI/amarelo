# ADR 0019: Use a POSIX shell control plane and user-scoped Elo launcher

## Status

Accepted on 2026-09-03.

## Context

Amarelo already implements its repository platform CLI in POSIX shell at `cli/elo` and keeps pnpm/Turborepo responsible for workspace task graphs. Developers nevertheless enter the CLI through `pnpm elo` or `./cli/elo`, and dependency installation does not provide a direct `elo <command>` entrypoint.

Five invariant checkers under `.audit/` and the design-system token builder are executable `.mjs` programs. The checkers are repository platform automation and naturally belong to the shell control plane. Token generation performs non-trivial JSON traversal, reference resolution and CSS serialization, which is unsuitable for direct POSIX text processing.

A direct command could be delivered as a published/global npm package, a root binary, shell-profile mutation, a symlink or a generated user launcher. Publishing creates unnecessary distribution ownership, the canonical binary already lives under `cli/`, profile mutation is intrusive, and a symlink would break the launcher's checkout-relative root discovery.

## Decision

Elo remains a thin POSIX shell control plane. pnpm and Turborepo remain authorities for dependency management and repository task graphs. Elo owns bootstrap, setup, environment, Git platform and invariant-check entrypoints.

`elo setup` generates a managed launcher in a user-owned binary directory. Destination precedence is an explicit command/environment override, `PNPM_HOME`, `XDG_BIN_HOME`, then `$HOME/.local/bin`. The launcher records the checkout that installed it and delegates to that checkout's canonical `cli/elo` binary.

Setup is idempotent, uses a managed marker, writes through a temporary file in the destination, and replaces only an existing managed launcher. It does not invoke `sudo`, install an npm package globally, edit shell profiles or overwrite an unrelated executable. The most recent successful setup owns the shared user launcher; moving/deleting that checkout requires setup from a valid checkout.

The root `postinstall` lifecycle invokes setup after local dependency installation. CI and explicitly disabled environments skip user installation. Because npm and pnpm do not define an automatic post-clone lifecycle, the root also exposes a documented explicit `postclone` script. The existing `prepare` lifecycle retains Git/Husky setup ownership.

Executable repository audits use `.audit/*.script.sh` and POSIX shell. The five existing `.script.mjs` audits are replaced rather than wrapped.

Executable package automation also enters through shell. The design-system package uses `build-tokens.sh` for build/watch selection and retains JSON/reference/serialization behavior in `build-tokens.ts`. The typed backend uses erasable TypeScript syntax executed directly by the required Node.js 24 runtime. This preserves the shell-front/typed-backend boundary instead of rebuilding structured-data logic in shell.

Framework-owned configuration modules such as `postcss.config.mjs` remain unchanged.

## Consequences

- Developers can invoke `elo` directly after a normal local install when the selected binary directory is already on `PATH`.
- The repository does not acquire npm publishing, global-package, profile-mutation or CLI auto-update responsibilities.
- Setup reports a missing `PATH` entry but does not repair it automatically.
- Multiple checkouts share one user launcher; the latest successful setup becomes its target.
- CI remains hermetic with respect to runner user directories.
- Repository audit execution has one POSIX-shell convention.
- Non-trivial token generation remains typed and testable while its operational entrypoint is shell.
- Node.js 24 remains a hard repository runtime contract for native erasable-TypeScript execution.
- Required framework `.mjs` configuration remains supported.
- Elo cannot become a second task runner; direct invocation changes ergonomics, not ownership.
