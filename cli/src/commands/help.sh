#!/usr/bin/env sh
set -eu
cat <<'EOF'
Elo — Amarelo monorepo platform CLI

Usage:
  ./elo bootstrap
  ./elo doctor [--ci]
  ./elo cleanup [--apply] [--dependencies]
  ./elo changelog <product> [--path <file>] [--editor <command>]
  ./elo env <setup|validate>
  ./elo git <setup|doctor|pre-commit|commit-msg>
  ./elo check <architecture|memory>
  ./elo help

Ownership:
  Elo        bootstrap, doctor, cleanup, env, Git platform and audit-check entrypoints
  Turborepo  dev, start, build, typecheck, tests and workspace task graphs
  .audit/    temporary JavaScript checkers/evidence; not permanent CLI source
EOF
