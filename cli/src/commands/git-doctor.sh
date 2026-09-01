#!/usr/bin/env sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

failures=0
check_file() { if [ -f "$ELO_PROJECT_ROOT/$1" ]; then printf 'PASS  %s\n' "$1"; else printf 'FAIL  %s\n' "$1" >&2; failures=$((failures + 1)); fi; }

elo_git_checkout || elo_die "Not inside the Amarelo Git checkout."
check_file .husky/pre-commit
check_file .husky/commit-msg
check_file commitlint.config.js

grep -q 'elo git pre-commit' "$ELO_PROJECT_ROOT/.husky/pre-commit" 2>/dev/null || { printf 'FAIL  pre-commit is not a thin Elo adapter\n' >&2; failures=$((failures + 1)); }
grep -q 'elo git commit-msg' "$ELO_PROJECT_ROOT/.husky/commit-msg" 2>/dev/null || { printf 'FAIL  commit-msg is not a thin Elo adapter\n' >&2; failures=$((failures + 1)); }

[ "$failures" -eq 0 ] || exit 1
printf 'Elo Git doctor PASS\n'
