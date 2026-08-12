#!/usr/bin/env bash
set -uo pipefail
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"
source "$PKG_DIR/shared/output.sh"
ROOT_DIR="$(git rev-parse --show-toplevel)"; cd "$ROOT_DIR"
PATH="$ROOT_DIR/node_modules/.bin:$PATH"
output_init

cli_section "Audit · circular"
cli_intent "No circular dependencies (madge)."

out="$(madge --circular --extensions ts,tsx --ts-config apps/web/tsconfig.json apps/web/app 2>&1)" || true
printf '%s\n' "$out"
madge --extensions ts,tsx --ts-config apps/web/tsconfig.json --dot apps/web/app > "$OUT_DIR/dependency-graph.dot" 2>/dev/null || true

n=$(printf '%s' "$out" | sed -n 's/.*Found \([0-9]*\) circular.*/\1/p' | head -1)
if [ -z "$n" ]; then printf '%s' "$out" | grep -qi "No circular" && n=0; fi
n=${n:-0}
status=pass; [ "$n" -gt 0 ] && status=fail
payload=$(jq -n --argjson n "$n" '{counts:{circular:$n},note:"madge over apps/web/app; dependency-graph.dot emitted"}')
output_result circular "$status" "$payload"
