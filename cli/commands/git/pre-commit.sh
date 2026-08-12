#!/usr/bin/env bash
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"

# Run from repo root so root-level scripts (build/test/lint-staged) resolve
# correctly when pnpm --filter dispatched us out of the CLI package dir.
REPO_ROOT="$(cd "$PKG_DIR/.." && pwd)"
cd "$REPO_ROOT"

cli_section "Git"
cli_intent "Pre-commit checks..."

cli_step_run 1 4 "Building project" pnpm build
cli_step_run 2 4 "Checking contract ownership" bash "$PKG_DIR/commands/validate/contract-ownership.sh"
cli_step_run 3 4 "Running tests" pnpm -r --if-present test
cli_step_run 4 4 "Running lint-staged" pnpm lint-staged

cli_done "Pre-commit passed."
