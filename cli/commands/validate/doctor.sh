#!/usr/bin/env bash
# Diagnose Node, pnpm and env state. Exits non-zero on hard failures.
set -uo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"

ROOT_DIR="$(git rev-parse --show-toplevel)"

cli_section "Dev"
cli_intent "Running diagnostics..."

declare -a row_keys row_vals row_colors
overall="Success"

note_row() {
  local key="$1" val="$2" color="$3" severity="${4:-info}"
  row_keys+=("$key"); row_vals+=("$val"); row_colors+=("$color")
  case "$severity" in
    error) overall="Failure" ;;
    warn)  [[ "$overall" == "Success" ]] && overall="Warnings" ;;
  esac
}

# Step 1: probe tools.
cli_step 1 2 "Probing tools"

if command -v node >/dev/null; then
  note_row "node" "$(node -v)" "green"
else
  note_row "node" "missing" "red" "error"
fi

if command -v pnpm >/dev/null; then
  note_row "pnpm" "$(pnpm -v)" "green"
else
  note_row "pnpm" "missing" "red" "error"
fi

if [[ -d "$ROOT_DIR/node_modules" ]]; then
  note_row "node_modules" "installed" "green"
else
  note_row "node_modules" "missing" "yellow" "warn"
fi

# Step 2: validate environment.
cli_step 2 2 "Validating environment"
if bash "$PKG_DIR/cli.sh" env-validate >/dev/null 2>&1; then
  note_row "env files" "valid" "green"
else
  note_row "env files" "invalid" "yellow" "warn"
fi

# Render result block with aligned key column.
max_key=0
for k in "${row_keys[@]}"; do
  (( ${#k} > max_key )) && max_key=${#k}
done
CLI_ROW_KEY_WIDTH=$max_key

cli_result "$overall"
for i in "${!row_keys[@]}"; do
  cli_row "${row_keys[$i]}" "${row_vals[$i]}" "${row_colors[$i]}"
done

case "$overall" in
  Success)  cli_done "System ready." ;;
  Warnings) cli_done "System usable, with warnings." ;;
  Failure)  cli_done "System has issues to resolve."; exit 1 ;;
esac
