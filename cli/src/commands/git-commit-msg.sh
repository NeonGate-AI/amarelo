#!/usr/bin/env sh
set -eu
message_file="${1:-}"
[ -n "$message_file" ] || { echo 'Usage: ./elo git commit-msg <message-file>' >&2; exit 2; }
cd "$ELO_PROJECT_ROOT"
exec pnpm exec commitlint --edit "$message_file"
