#!/bin/sh
set -eu

CLI_DIR=$(
  CDPATH=
  cd -P "$(dirname "$0")"
  pwd
)
PROJECT_ROOT=$(
  CDPATH=
  cd -P "$CLI_DIR/../.."
  pwd
)

export ELO_CLI_DIR="$CLI_DIR"
export ELO_PROJECT_ROOT="$PROJECT_ROOT"

. "$CLI_DIR/core/common.sh"

elo_usage_error() {
  printf 'Elo: %s\n' "$1" >&2
  printf "Run 'elo help' for usage.\n" >&2
  exit 2
}

elo_run_check() {
  elo_check_name=$1
  elo_check_path="$PROJECT_ROOT/.audit/$elo_check_name.audit.sh"
  [ -f "$elo_check_path" ] ||
    elo_die "Audit checker is missing: .audit/$elo_check_name.audit.sh"
  /bin/sh "$elo_check_path"
}

elo_command=${1:-help}
if [ "$#" -gt 0 ]; then
  shift
fi

case "$elo_command" in
  help|--help|-h)
    exec "$CLI_DIR/commands/help.sh" "$@"
    ;;
  version|--version|-V)
    elo_version=$(elo_project_version)
    [ -n "$elo_version" ] || elo_die "Unable to read the Elo version."
    printf 'elo %s\n' "$elo_version"
    ;;
  bootstrap|install)
    exec "$CLI_DIR/commands/bootstrap.sh" "$@"
    ;;
  setup)
    exec "$CLI_DIR/commands/setup.sh" "$@"
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
    elo_subcommand=${1:-}
    [ "$#" -eq 0 ] || shift
    case "$elo_subcommand" in
      setup) exec "$CLI_DIR/commands/env-setup.sh" "$@" ;;
      validate) exec "$CLI_DIR/commands/env-validate.sh" "$@" ;;
      *) elo_usage_error "Usage: elo env <setup|validate>" ;;
    esac
    ;;
  git)
    elo_subcommand=${1:-}
    [ "$#" -eq 0 ] || shift
    case "$elo_subcommand" in
      setup) exec "$CLI_DIR/commands/git-setup.sh" "$@" ;;
      doctor) exec "$CLI_DIR/commands/git-doctor.sh" "$@" ;;
      pre-commit) exec "$CLI_DIR/commands/git-pre-commit.sh" "$@" ;;
      commit-msg) exec "$CLI_DIR/commands/git-commit-msg.sh" "$@" ;;
      *) elo_usage_error "Usage: elo git <setup|doctor|pre-commit|commit-msg>" ;;
    esac
    ;;
  check)
    elo_subcommand=${1:-all}
    [ "$#" -eq 0 ] || shift
    [ "$#" -eq 0 ] || elo_usage_error "Audit checks do not accept additional arguments."
    case "$elo_subcommand" in
      architecture) elo_run_check architecture ;;
      imports) elo_run_check import-boundaries ;;
      memory) elo_run_check memory-invariants ;;
      platform) elo_run_check elo-platform ;;
      skills) elo_run_check workflow-skills ;;
      specs) elo_run_check specs ;;
      all)
        for elo_check in elo-platform architecture specs workflow-skills import-boundaries memory-invariants; do
          elo_run_check "$elo_check"
        done
        ;;
      *) elo_usage_error "Usage: elo check <all|architecture|imports|memory|platform|skills|specs>" ;;
    esac
    ;;
  *)
    elo_usage_error "Unknown command: $elo_command"
    ;;
esac
