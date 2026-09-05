#!/bin/sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

runtime_usage() {
  printf 'Usage: elo runtime <up|down|prune|e2e>\n'
  printf '  up/e2e: [--profile <application|memory|reference>] (default: application)\n'
}

if [ "$#" -ne 1 ] && [ "$#" -ne 3 ]; then
  runtime_usage >&2
  exit 2
fi

case "$1" in
  --help|-h)
    [ "$#" -eq 1 ] || { runtime_usage >&2; exit 2; }
    runtime_usage
    exit 0
    ;;
  up|down|prune|e2e)
    runtime_action=$1
    ;;
  *)
    elo_print_error "Unknown runtime action: $1"
    runtime_usage >&2
    exit 2
    ;;
esac

runtime_profile=${AMARELO_RUNTIME_PROFILE-application}
if [ "$#" -eq 3 ]; then
  case "$runtime_action:$2" in
    up:--profile|e2e:--profile) runtime_profile=$3 ;;
    *) runtime_usage >&2; exit 2 ;;
  esac
fi
case "$runtime_profile" in
  application|memory|reference) ;;
  *) elo_print_error 'Unknown runtime profile.'; runtime_usage >&2; exit 2 ;;
esac

elo_log "runtime action=$runtime_action profile=$runtime_profile"
exec corepack pnpm --dir "$ELO_PROJECT_ROOT" --filter @repo/runtime start -- "$@"
