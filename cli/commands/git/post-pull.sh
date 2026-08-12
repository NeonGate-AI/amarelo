#!/usr/bin/env bash
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"

# Run from repo root so `pnpm install` operates on the workspace root.
REPO_ROOT="$(cd "$PKG_DIR/.." && pwd)"
cd "$REPO_ROOT"

cli_section "Git"
cli_intent "Syncing dependencies after pull..."

cli_step_run 1 1 "Installing dependencies" pnpm install

cli_done "Dependencies synced."
