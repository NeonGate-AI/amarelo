#!/usr/bin/env bash
set -uo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"

ROOT_DIR="$(git rev-parse --show-toplevel)"

cli_section "Validate"
cli_intent "Validating environment files..."

templates=()
while IFS= read -r file; do
  templates+=("$file")
done < <(find "$ROOT_DIR" \
  \( -name node_modules -o -name .git -o -name .next -o -name .turbo -o -name dist \) -prune \
  -o -name ".env.template" -print)
TOTAL=${#templates[@]}

declare -a row_keys row_vals row_colors
declare -a missing_lines
errors=0
i=0

for template in "${templates[@]}"; do
  i=$((i + 1))
  env_file="${template/.template/}"
  rel="${env_file#$ROOT_DIR/}"
  cli_step "$i" "$TOTAL" "$rel"

  if [[ ! -f "$env_file" ]]; then
    row_keys+=("$rel"); row_vals+=("missing"); row_colors+=("red")
    missing_lines+=("$rel: file does not exist")
    errors=$((errors + 1))
    continue
  fi

  file_errors=0
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    if ! grep -q "^$key=" "$env_file"; then
      missing_lines+=("$rel: missing key $key")
      file_errors=$((file_errors + 1))
    fi
  done < "$template"

  if (( file_errors > 0 )); then
    row_keys+=("$rel"); row_vals+=("$file_errors missing keys"); row_colors+=("red")
    errors=$((errors + file_errors))
  else
    row_keys+=("$rel"); row_vals+=("valid"); row_colors+=("green")
  fi
done

max_key=0
for k in "${row_keys[@]}"; do
  (( ${#k} > max_key )) && max_key=${#k}
done
CLI_ROW_KEY_WIDTH=$max_key

if (( errors > 0 )); then
  cli_result "Failure"
else
  cli_result "Success"
fi

for j in "${!row_keys[@]}"; do
  cli_row "${row_keys[$j]}" "${row_vals[$j]}" "${row_colors[$j]}"
done

if (( errors > 0 )); then
  for line in "${missing_lines[@]}"; do
    cli_warn "$line"
  done
  cli_done "Environment validation failed."
  exit 1
fi

cli_done "All environment files valid."
