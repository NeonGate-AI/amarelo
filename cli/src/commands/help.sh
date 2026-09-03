#!/bin/sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

[ "$#" -eq 0 ] || elo_die "Help does not accept arguments." 2

elo_print_logo
cat <<'EOF'
Amarelo monorepo platform CLI

Usage:
  elo [--logs] <command> [--logs] [arguments]
  elo --help

Commands:
  📖 help                                  Show this guide
  🏷️  --version                            Print the Elo version
  🚀 bootstrap                             Install and configure a checkout
  🔗 setup [--bin-dir <directory>]         Install the user-scoped launcher
  🩺 doctor [--ci]                         Diagnose repository prerequisites
  🧹 cleanup [--apply] [--dependencies]    Inspect or remove generated state
  📝 changelog <product> [options]          Prepare a product changelog
  🧱 adr [name]                             Create the next empty ADR
  📏 rule [name]                            Create the next empty rule
  🧰 skill [name]                           Create an empty local skill
  📋 spec [name]                            Create the next empty spec
  🌱 env <setup|validate>                   Prepare or validate environment files
  🔧 git <setup|doctor|pre-commit|commit-msg>
                                             Manage repository Git integration
  🧪 check <all|architecture|imports|memory|platform|skills|specs>
                                             Run invariant checkers

Global flags:
  --help, -h     Show this guide
  --logs         Print additional operational diagnostics to stderr
  --version, -V  Print the Elo version

First checkout:
  pnpm install       Install the frozen dependency graph and direct command
  pnpm postclone     Rerun direct-command setup
  ./cli/elo setup    Recover before the direct command is available

Ownership:
  Elo        bootstrap, setup, doctor, cleanup, env, Git and audit entrypoints
  Turborepo  dev, start, build, typecheck, tests and workspace task graphs
  .audit/    executable POSIX shell invariant checkers

Elo never edits shell profiles or installs a global npm package.
EOF
