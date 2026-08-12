#!/usr/bin/env bash
# Remove generated dependencies, build outputs, caches, and local metadata.
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"

HEALTH=false
for arg in "$@"; do
  [[ "$arg" == "--health" || "$arg" == "--dry-run" ]] && HEALTH=true
done

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null)" \
  || ROOT_DIR="$(cd "$PKG_DIR/.." && pwd)"

if [[ "$HEALTH" == "true" ]]; then
  cli_section "Dev"
  cli_intent "Cleanup dry-run (health check)..."

  dir_count=$(find "$ROOT_DIR" -type d \( \
    -name "node_modules" -o -name ".next" -o -name ".turbo" \
    -o -name ".expo" -o -name ".cache" -o -name ".vercel" \
    -o -name ".mastra" -o -name ".pnpm-store" -o -name "dist" \
    -o -name "dist-ssr" -o -name "out" -o -name "build" \
    -o -name "coverage" -o -name "storybook-static" \
  \) -prune -print 2>/dev/null | wc -l | tr -d ' ')

  file_count=$(find "$ROOT_DIR" -type f \( \
    -name "*.tsbuildinfo" -o -name "next-env.d.ts" -o -name ".DS_Store" \
    -o -name ".pnp" -o -name ".pnp.js" -o -name "*.log" \
    -o -name "npm-debug.log*" -o -name "pnpm-debug.log*" \
    -o -name "yarn-debug.log*" -o -name "yarn-error.log*" \
  \) -print 2>/dev/null | wc -l | tr -d ' ')

  cli_result "Success"
  cli_row "directories to clean" "$dir_count" "dim"
  cli_row "generated files"      "$file_count" "dim"
  cli_done "Dry-run complete. No files removed."
  exit 0
fi

cli_section "Dev"
cli_intent "Cleaning build artifacts..."

cli_step_run 1 2 "Removing generated directories" \
  find "$ROOT_DIR" -type d \( \
    -name "node_modules" -o -name ".next" -o -name ".turbo" \
    -o -name ".expo" -o -name ".cache" -o -name ".vercel" \
    -o -name ".mastra" -o -name ".pnpm-store" -o -name "dist" \
    -o -name "dist-ssr" -o -name "out" -o -name "build" \
    -o -name "coverage" -o -name "storybook-static" \
  \) -prune -exec rm -rf {} +

cli_step_run 2 2 "Removing generated files" \
  find "$ROOT_DIR" -type f \( \
    -name "*.tsbuildinfo" -o -name "next-env.d.ts" -o -name ".DS_Store" \
    -o -name ".pnp" -o -name ".pnp.js" -o -name "*.log" \
    -o -name "npm-debug.log*" -o -name "pnpm-debug.log*" \
    -o -name "yarn-debug.log*" -o -name "yarn-error.log*" \
  \) -delete

cli_done "Cleanup complete."
