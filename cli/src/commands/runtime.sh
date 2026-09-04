#!/bin/sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

runtime_usage() {
  printf 'Usage: elo runtime <up|down|prune|e2e>\n'
}

if [ "$#" -ne 1 ]; then
  runtime_usage >&2
  exit 2
fi

case "$1" in
  --help|-h)
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

elo_log "runtime action=$runtime_action"
exec corepack pnpm --dir "$ELO_PROJECT_ROOT" --filter @repo/runtime start -- "$runtime_action"
