#!/bin/sh
set -eu

SCRIPT_DIR=$(
  CDPATH=
  cd -P "$(dirname "$0")"
  pwd
)

usage() {
  cat <<'USAGE'
Usage:
  build-tokens.sh [--watch]

Options:
  --watch  Rebuild when token sources change.
  -h, --help
USAGE
}

case "${1:-}" in
  '')
    [ "$#" -eq 0 ] || exit 2
    exec node "$SCRIPT_DIR/build-tokens.ts"
    ;;
  --watch)
    shift
    [ "$#" -eq 0 ] || {
      printf 'build-tokens: --watch does not accept arguments\n' >&2
      exit 2
    }
    exec node --watch "$SCRIPT_DIR/build-tokens.ts"
    ;;
  -h|--help)
    usage
    ;;
  *)
    printf 'build-tokens: unknown option: %s\n' "$1" >&2
    usage >&2
    exit 2
    ;;
esac
