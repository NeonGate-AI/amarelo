# ADR 0019: Use a POSIX shell control plane and user-scoped Elo launcher

## Status

Accepted on 2026-09-03.

## Context

Amarelo already implements its repository platform CLI in POSIX shell at `cli/elo` and keeps pnpm/Turborepo responsible for workspace task graphs. Developers nevertheless enter the CLI through `pnpm elo` or `./cli/elo`, and a normal dependency install does not provide a direct `elo <command>` entrypoint.

The repository also carries five executable invariant checkers as `.audit/*.script.mjs`. They are invoked only as repository automation through Elo and CI, while the durable source rule otherwise establishes shell as the platform automation language. Framework-owned `.mjs` configuration modules are a separate concern and cannot be converted to shell.

A direct command could be delivered as a published/global npm package, a root binary, shell-profile mutation, a symlink or a generated user launcher. Publishing would create unnecessary distribution/versioning ownership, a root binary is already forbidden by the repository topology, profile mutation is intrusive, and a direct symlink would break the existing launcher's relative root discovery.

## Decision

Elo remains a thin POSIX shell control plane. pnpm and Turborepo remain the authorities for dependency management and repository task graphs; Elo continues to own bootstrap, environment, Git platform and invariant-check entrypoints only.

`elo setup` will generate a small managed launcher in a user-owned binary directory. Destination precedence is an explicit command/environment override, `PNPM_HOME`, `XDG_BIN_HOME`, then `$HOME/.local/bin`. The launcher records the checkout that installed it and delegates to that checkout's canonical `cli/elo` binary.

The setup operation is idempotent, uses a managed marker, writes through a temporary file in the destination directory and replaces only an existing managed launcher. It does not invoke `sudo`, install an npm package globally, edit shell profiles or overwrite an unrelated `elo` executable. The most recent successful setup owns the user launcher; moving or replacing the checkout requires setup to run again.

The root `postinstall` lifecycle invokes setup after local dependency installation. CI and explicitly disabled environments skip user installation. Because npm and pnpm do not define an automatic post-clone lifecycle, the repository also exposes a documented explicit `postclone` script that delegates to the same setup command. The existing `prepare` lifecycle retains Git/Husky setup ownership.

Executable repository audits will use `.audit/*.script.sh` and POSIX shell. The five existing `.script.mjs` audit programs will be replaced rather than wrapped. Shell implementations may compose standard Unix tools but must preserve quoting, avoid `eval`, return deterministic exit statuses and remain accessible through Elo. Framework-owned modules such as `postcss.config.mjs` remain unchanged.

## Consequences

- Developers can invoke `elo` directly after a normal local install when the selected binary directory is already on PATH.
- The repository does not acquire npm publishing, global-package or auto-update responsibilities for Elo.
- Setup can report that a selected binary directory is not on PATH, but it cannot repair that automatically without violating the no-profile-mutation decision.
- Multiple checkouts share one user launcher; the last successful setup becomes its fallback target.
- A moved or deleted checkout makes the installed launcher fail clearly until setup runs from another valid checkout.
- CI remains hermetic with respect to the runner's home directory.
- Audit automation has one shell execution model, while required framework `.mjs` configuration remains supported.
- Complex audit logic becomes more sensitive to Unix quoting and text-processing behavior, so the platform audit must validate POSIX syntax and contract fixtures.
- Elo still cannot become a second build/test/task runner; direct invocation changes ergonomics, not ownership.
