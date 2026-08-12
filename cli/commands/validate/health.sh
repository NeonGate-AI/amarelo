#!/usr/bin/env bash
# Validate core CLI commands end-to-end. Exits non-zero if any check fails.

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"

cli_section "CLI Health"
cli_intent "Validating core CLI commands..."

declare -a check_names check_results check_outputs
overall_failed=0

run_check() {
  local name="$1"
  shift
  check_names+=("$name")
  local tmp
  tmp=$(mktemp)
  local output
  if "$@" >"$tmp" 2>&1; then
    check_results+=("ok")
  else
    check_results+=("failed")
    overall_failed=$((overall_failed + 1))
  fi
  output=$(cat "$tmp" 2>/dev/null || true)
  check_outputs+=("$output")
  rm -f "$tmp"
}

run_check "clean"        bash "$PKG_DIR/commands/utility/cleanup.sh" --health
run_check "doctor"       bash "$PKG_DIR/commands/validate/doctor.sh"
run_check "env-validate" bash "$PKG_DIR/commands/validate/env.sh"

if (( overall_failed > 0 )); then
  cli_result "Failure"
else
  cli_result "Success"
fi

CLI_ROW_KEY_WIDTH=12
for i in "${!check_names[@]}"; do
  if [[ "${check_results[$i]}" == "ok" ]]; then
    cli_row "${check_names[$i]}" "ok" "green"
  else
    cli_row "${check_names[$i]}" "failed" "red"
  fi
done

printf "\n"
for i in "${!check_names[@]}"; do
  [[ -z "${check_outputs[$i]}" ]] && continue
  if [[ "${check_results[$i]}" == "failed" ]]; then
    printf "%s%s:%s\n" "$C_BOLD" "${check_names[$i]}" "$C_RESET"
  else
    printf "%s%s%s%s:%s\n" "$C_BOLD" "$C_DIM" "${check_names[$i]}" "$C_RESET" "$C_RESET"
  fi
  while IFS= read -r line; do
    printf "  %s\n" "$line"
  done <<< "${check_outputs[$i]}"
  printf "\n"
done

if (( overall_failed > 0 )); then
  cli_done "✗ CLI health checks failed."
  exit 1
else
  cli_done "✓ CLI health checks passed."
fi
