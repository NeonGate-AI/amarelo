#!/usr/bin/env bash
set -uo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$PKG_DIR/shared/core.sh"

# Run from repo root so root-level commitlint resolves correctly.
REPO_ROOT="$(cd "$PKG_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [[ $# -ne 1 ]]; then
  cli_error "Missing commit-msg file argument" "Usage: sim git-commit-msg <commit-msg-file>"
  exit 1
fi

cli_section "Git"
cli_intent "Validating commit message..."

if pnpm commitlint --edit "$1" >/dev/null 2>&1; then
  cli_done "Commit message valid."
  exit 0
fi

# commitlint failed — show the actual failure output to the developer, then
# emit the structured error block.
pnpm commitlint --edit "$1" || true

cli_error "Commit message does not match Conventional Commits format." \
  "Expected: <type>(optional-scope): <description>
   Examples:
     feat(auth): add refresh token endpoint
     fix(live-view): handle empty income input
   Allowed types: feat, fix, docs, style, refactor, test, chore, ci, build, perf, revert
   See https://www.conventionalcommits.org/en/v1.0.0/ for more details."

exit 1
