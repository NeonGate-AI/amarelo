#!/usr/bin/env sh
set -eu

CLI_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$CLI_DIR/../.." && pwd)"
export ELO_CLI_DIR="$CLI_DIR"
export ELO_PROJECT_ROOT="$PROJECT_ROOT"

command="${1:-help}"
[ "$#" -eq 0 ] || shift

case "$command" in
  help|--help|-h)
    exec "$CLI_DIR/commands/help.sh" "$@"
    ;;
  bootstrap|setup)
    exec "$CLI_DIR/commands/bootstrap.sh" "$@"
    ;;
  doctor)
    exec "$CLI_DIR/commands/doctor.sh" "$@"
    ;;
  cleanup)
    exec "$CLI_DIR/commands/cleanup.sh" "$@"
    ;;
  changelog)
    exec "$CLI_DIR/commands/changelog.sh" "$@"
    ;;
  env)
    subcommand="${1:-}"
    [ "$#" -eq 0 ] || shift
    case "$subcommand" in
      setup) exec "$CLI_DIR/commands/env-setup.sh" "$@" ;;
      validate) exec "$CLI_DIR/commands/env-validate.sh" "$@" ;;
      *) echo "Usage: ./elo env <setup|validate>" >&2; exit 2 ;;
    esac
    ;;
  git)
    subcommand="${1:-}"
    [ "$#" -eq 0 ] || shift
    case "$subcommand" in
      setup) exec "$CLI_DIR/commands/git-setup.sh" "$@" ;;
      doctor) exec "$CLI_DIR/commands/git-doctor.sh" "$@" ;;
      pre-commit) exec "$CLI_DIR/commands/git-pre-commit.sh" "$@" ;;
      commit-msg) exec "$CLI_DIR/commands/git-commit-msg.sh" "$@" ;;
      *) echo "Usage: ./elo git <setup|doctor|pre-commit|commit-msg>" >&2; exit 2 ;;
    esac
    ;;
  check)
    subcommand="${1:-}"
    case "$subcommand" in
      architecture)
        node "$PROJECT_ROOT/.audit/architecture.script.mjs"
        exec node "$PROJECT_ROOT/.audit/elo-platform.script.mjs"
        ;;
      memory) exec node "$PROJECT_ROOT/.audit/memory-invariants.script.mjs" ;;
      *) echo "Usage: ./elo check <architecture|memory>" >&2; exit 2 ;;
    esac
    ;;
  *)
    echo "Unknown Elo command: $command" >&2
    exec "$CLI_DIR/commands/help.sh"
    ;;
esac
