#!/usr/bin/env bash
# Copy .env.template → .env for every app. Skips files that already exist.
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"

ROOT_DIR="$(git rev-parse --show-toplevel)"

cli_section "Dev"
cli_intent "Setting up environment files..."

TEMPLATE_FILES=()
while IFS= read -r file; do
  TEMPLATE_FILES+=("$file")
done < <(find "$ROOT_DIR" \
  \( -name node_modules -o -name .git -o -name .next -o -name .turbo -o -name dist \) -prune \
  -o -name ".env.template" -print)

created=0
skipped=0

process() {
  for template in "${TEMPLATE_FILES[@]}"; do
    env_file="${template/.template/}"
    if [[ -f "$env_file" ]]; then
      ((++skipped)); continue
    fi
    cp "$template" "$env_file"
    ((++created))
  done
}

cli_step_run 1 1 "Processing env templates" process

CLI_ROW_KEY_WIDTH=10
cli_result "Success"
cli_row "created" "$created" "green"
cli_row "skipped" "$skipped" "dim"
cli_done "Env setup complete."
