#!/usr/bin/env bash
# Render the CLI catalog. Called by `sim --help` and `sim audit --help`.
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"
source "$PKG_DIR/shared/catalog.sh"

ONLY_GROUP=""
if [[ "${1:-}" == "--group" ]]; then
  ONLY_GROUP="${2:-}"
fi

in_list() {
  local needle="$1"; shift
  for item in "$@"; do [[ "$item" == "$needle" ]] && return 0; done
  return 1
}

max_cmd_width() {
  local w=0 entry rest cmd
  for entry in "${CLI_CATALOG[@]}"; do
    rest="${entry#*|}"; cmd="${rest%%|*}"
    [ "${#cmd}" -gt "$w" ] && w="${#cmd}"
  done
  echo "$w"
}

render_group() {
  local group="$1" desc="$2" width="$3" entry g rest cmd dsc
  cli_section "$group"
  cli_intent "$desc"
  for entry in "${CLI_CATALOG[@]}"; do
    g="${entry%%|*}"; rest="${entry#*|}"; cmd="${rest%%|*}"; dsc="${rest#*|}"
    [[ "$g" == "$group" ]] || continue
    printf '%s\t%s\n' "$cmd" "$dsc"
  done | sort | while IFS=$'\t' read -r cmd dsc; do
    printf -- "- %-${width}s  %s\n" "$cmd" "$dsc"
  done
  printf "\n"
}

WIDTH="$(max_cmd_width)"

if [[ -n "$ONLY_GROUP" ]]; then
  desc=""
  for ge in "${CLI_GROUPS[@]}"; do
    [[ "${ge%%|*}" == "$ONLY_GROUP" ]] && desc="${ge#*|}"
  done
  render_group "$ONLY_GROUP" "$desc" "$WIDTH"
  exit 0
fi

cli_section "CLI"
cli_intent "Available Sim CLI commands."

for group_entry in "${CLI_GROUPS[@]}"; do
  render_group "${group_entry%%|*}" "${group_entry#*|}" "$WIDTH"
done
