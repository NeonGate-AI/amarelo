# Elo CLI

Elo is the repository platform CLI for the Amarelo monorepo. Its canonical binary lives at `cli/elo`, its implementation lives under `cli/src/`, and all implementation modules are POSIX shell.

## First checkout

```sh
pnpm install
```

The tracked `pnpm-lock.yaml` is authoritative; automated installation uses `pnpm install --frozen-lockfile`. The root `postinstall` lifecycle then runs `./cli/elo setup --postinstall`. Setup installs a small managed `elo` launcher in the first available user binary directory:

1. `--bin-dir` or `ELO_BIN_DIR`;
2. `PNPM_HOME`;
3. `XDG_BIN_HOME`;
4. `$HOME/.local/bin`.

The destination must already be on `PATH` for direct invocation. Elo reports when it is not, but it never edits shell profiles, invokes `sudo`, publishes or installs a global npm package.

There is no automatic `postclone` lifecycle in npm or pnpm. The first `pnpm install` is the automatic setup event. The repository also exposes an explicit recovery alias:

```sh
pnpm postclone
```

Before the direct command exists, run:

```sh
./cli/elo setup
```

Setup is idempotent. It replaces only a regular launcher with the exact Amarelo managed marker. Symlinks, non-regular paths and unrelated `elo` executables are never overwritten. CI and `ELO_SETUP_DISABLED=1` skip lifecycle installation.

## Entrypoints

```sh
elo --help
elo --logs doctor
elo --version
elo bootstrap
elo setup
elo doctor
elo cleanup
elo env setup
elo env validate
elo git doctor
elo check all
```

`pnpm elo <command>` and `./cli/elo <command>` remain compatibility and recovery entrypoints. Running Elo without arguments shows the yellow ELO wordmark and emoji command catalog without bootstrapping or installing anything. `--logs` may appear before or immediately after a command and sends additional, secret-safe diagnostics to stderr. ANSI color is limited to interactive output and is disabled by `NO_COLOR`. Unknown commands and invalid subcommands return status 2.

The generated user launcher delegates to the checkout that most recently completed setup. After moving or deleting that checkout, run `./cli/elo setup` from a valid checkout.

## Ownership

Elo owns repository-platform operations: bootstrap, direct-command setup, doctor, cleanup, environment validation, Git/Husky/Commitlint/lint-staged setup, and thin invariant-check entrypoints.

`pnpm dev`, `pnpm start`, `pnpm build`, `pnpm typecheck`, and `pnpm test` remain direct Turborepo task-graph entrypoints and are intentionally not duplicated by Elo.

Executable invariant checkers live under `.audit/` as `.audit.sh` files. Executable package automation also enters through shell; the design-system token command uses `build-tokens.sh` and delegates structured token transformation to an erasable TypeScript backend executed by Node.js 24. Framework configuration modules such as `postcss.config.mjs` retain the format required by their framework.
