#!/usr/bin/env bash
# Sim CLI dispatcher.
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${CLI_BANNER_PRINTED:-}" ]]; then
  source "$PKG_DIR/shared/core.sh"
  print_banner
  export CLI_BANNER_PRINTED=1
fi

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  # Audits
  audit)
    sub="${1:-}"; shift || true
    case "$sub" in
      --all)
        exec bash "$PKG_DIR/audit/commands/all.sh" "$@" ;;
      circular)
        exec bash "$PKG_DIR/audit/commands/circular.sh" "$@" ;;
      ""|--help|-h)
        exec bash "$PKG_DIR/commands/utility/list.sh" --group Audit ;;
      *)
        echo "Unknown audit command: $sub" >&2
        echo "Run: sim audit --help" >&2
        exit 1 ;;
    esac ;;

  # Environment
  env)
    sub="${1:-}"; shift || true
    case "$sub" in
      setup)    exec bash "$PKG_DIR/commands/utility/env-setup.sh" "$@" ;;
      validate) exec bash "$PKG_DIR/commands/validate/env.sh" "$@" ;;
      ""|--help|-h)
        printf "Usage: sim env <subcommand>\n\n  setup     Copy .env.template files to .env\n  validate  Verify all template keys exist\n"
        exit 0 ;;
      *)
        echo "Unknown env subcommand: $sub" >&2
        echo "Run: sim env --help" >&2
        exit 1 ;;
    esac ;;

  # Dev
  clean)          exec bash "$PKG_DIR/commands/utility/cleanup.sh" "$@" ;;
  doctor)         exec bash "$PKG_DIR/commands/validate/doctor.sh" "$@" ;;
  health)         exec bash "$PKG_DIR/commands/validate/health.sh" "$@" ;;

  # Git (Husky-invoked)
  git-commit-msg) exec bash "$PKG_DIR/commands/git/commit-msg.sh" "$@" ;;
  git-pre-commit) exec bash "$PKG_DIR/commands/git/pre-commit.sh" "$@" ;;
  git-post-pull)  exec bash "$PKG_DIR/commands/git/post-pull.sh" "$@" ;;

  ""|--help|-h)
    cat <<EOF
Usage: sim <command>

Audits:
  audit --all      Run all audit modules and aggregate report
  audit circular   Detect circular dependencies (madge)
  audit --help     List audit subcommands

Environment:
  env setup        Copy .env.template files to .env (skip if exists)
  env validate     Verify all .env.template keys exist in their .env

Dev:
  clean            Remove node_modules, .turbo, dist, .next, *.tsbuildinfo
  doctor           Diagnose Node/pnpm/env state
  health           Validate core CLI commands

Git (Husky-invoked):
  git-commit-msg   Conventional-commit lint
  git-pre-commit   Build + tests + lint-staged
  git-post-pull    Re-run pnpm install after merge/pull
EOF
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    echo "Run: sim --help" >&2
    exit 1
    ;;
esac
