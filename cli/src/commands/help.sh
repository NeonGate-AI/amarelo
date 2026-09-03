#!/bin/sh
set -eu

cat <<'EOF'
Elo - Amarelo monorepo platform CLI

Usage:
  elo <command> [arguments]

Commands:
  help
  --version
  bootstrap
  setup [--bin-dir <directory>]
  doctor [--ci]
  cleanup [--apply] [--dependencies]
  changelog <product> [--path <file>] [--editor <command>]
  env <setup|validate>
  git <setup|doctor|pre-commit|commit-msg>
  check <all|architecture|imports|memory|platform|specs>

First checkout:
  pnpm install       installs dependencies and configures the direct user command
  pnpm postclone     explicitly reruns direct-command setup
  ./cli/elo setup    recovery path before the direct command is available

Ownership:
  Elo        bootstrap, setup, doctor, cleanup, env, Git platform and audit entrypoints
  Turborepo  dev, start, build, typecheck, tests and workspace task graphs
  .audit/    executable POSIX shell invariant checkers; not canonical engineering context

Elo never edits shell profiles or installs a global npm package. The selected user
binary directory must already be present on PATH for direct invocation.
EOF
