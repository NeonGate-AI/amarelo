#!/usr/bin/env sh
set -eu
cat <<'EOF'
Elo - Amarelo monorepo platform CLI

Usage:
  pnpm elo                         Bootstrap/install the local Elo environment
  ./cli/elo bootstrap
  ./cli/elo doctor [--ci]
  ./cli/elo cleanup [--apply] [--dependencies]
  ./cli/elo changelog <product> [--path <file>] [--editor <command>]
  ./cli/elo env <setup|validate>
  ./cli/elo git <setup|doctor|pre-commit|commit-msg>
  ./cli/elo check <architecture|imports|memory|platform|specs>
  ./cli/elo help

Ownership:
  Elo        bootstrap, doctor, cleanup, env, Git platform and audit-check entrypoints
  Turborepo  dev, start, build, typecheck, tests and workspace task graphs
  .audit/    temporary JavaScript checkers/evidence; not permanent CLI source
EOF
