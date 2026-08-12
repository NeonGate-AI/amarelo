#!/usr/bin/env bash
# Run every audit module and aggregate canonical results.
set -uo pipefail
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"
source "$PKG_DIR/shared/output.sh"
ROOT_DIR="$(git rev-parse --show-toplevel)"; cd "$ROOT_DIR"
output_init

cli_section "Audit · all"
cli_intent "Running all audit modules..."

for f in "$PKG_DIR/audit/commands"/*.sh; do
  sub="$(basename "$f" .sh)"
  case "$sub" in all|_*) continue ;; esac
  bash "$f" || true
done

output_aggregate
cli_done "Audit complete — see cli/audit/reports/ (summary.json, baseline.md)."
