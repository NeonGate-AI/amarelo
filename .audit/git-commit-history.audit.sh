#!/bin/sh
set -eu

PROJECT_ROOT=${GITHUB_WORKSPACE:-$(CDPATH= cd -P "$(dirname "$0")/.." && pwd)}
audit_fixture=$(mktemp -d "${TMPDIR:-/tmp}/amarelo-commit-history.XXXXXX")
trap 'rm -rf "$audit_fixture"' 0
trap 'exit 1' 1 2 15

# Isolate all synthetic Git objects, refs and configuration from the checkout.
git clone --quiet --shared --no-checkout "$PROJECT_ROOT" "$audit_fixture/repository"
audit_repository="$audit_fixture/repository"
cp -R "$PROJECT_ROOT/cli" "$audit_repository/cli"
mkdir -p "$audit_repository/.github"
cp "$PROJECT_ROOT/commitlint.config.js" "$audit_repository/commitlint.config.js"
cp "$PROJECT_ROOT/package.json" "$audit_repository/package.json"
cp "$PROJECT_ROOT/.github/commitlint-history.config.json" "$audit_repository/.github/"
ln -s "$PROJECT_ROOT/node_modules" "$audit_repository/node_modules"
git -C "$audit_repository" config user.name 'Synthetic spec validation'
git -C "$audit_repository" config user.email 'spec-validation@example.invalid'

history_check() {
  "$audit_repository/cli/elo" git lint-history "$@" >"$audit_fixture/output" 2>&1
}

expect_success() {
  if ! history_check "$@"; then
    cat "$audit_fixture/output" >&2
    printf 'Commit history audit FAIL: expected success\n' >&2
    exit 1
  fi
}

expect_failure() {
  audit_expected=$1
  shift
  if history_check "$@"; then
    printf 'Commit history audit FAIL: invalid input passed\n' >&2
    exit 1
  fi
  if ! grep -F "$audit_expected" "$audit_fixture/output" >/dev/null; then
    cat "$audit_fixture/output" >&2
    printf 'Commit history audit FAIL: failed for the wrong reason\n' >&2
    exit 1
  fi
}

for audit_commit in \
  1702ed337d74c4baf6439a10c11d89abdbcc78e1 \
  69e14180645e8a00b9fd3dc7b7c208b51d8160b8 \
  19a971d13c62cb5b196b29b2cdac02b77a9eeadd \
  48784a556d2c9d14e414da595eaf045d4b349967 \
  4694a176df803657b7b515f5772875b2e1321968
do
  audit_parent=$(git -C "$audit_repository" rev-parse "$audit_commit^")
  expect_success "$audit_parent" "$audit_commit"
  grep -F "Historical body-length exception: $audit_commit" "$audit_fixture/output" >/dev/null
done

audit_tree=$(git -C "$audit_repository" mktree </dev/null)
audit_base=$(printf 'chore(test): begin isolated history\n' | git -C "$audit_repository" commit-tree "$audit_tree")
audit_valid=$(printf 'fix(ci): validate a new commit\n' | git -C "$audit_repository" commit-tree "$audit_tree" -p "$audit_base")
expect_success "$audit_base" "$audit_valid"
expect_success "$audit_valid" "$audit_valid"
expect_failure 'Usage:' "$audit_base"
expect_failure 'Usage:' "$audit_base" "$audit_valid" unexpected
expect_failure 'Invalid commit ref:' missing-spec-055-ref "$audit_valid"
expect_failure 'Invalid commit ref:' "$audit_base" missing-spec-055-ref

{
  printf 'fix(ci): exercise a new overlong body\n\n'
  awk 'BEGIN { for (i = 0; i < 101; i++) printf "x"; printf "\n" }'
} >"$audit_fixture/message"
audit_long=$(git -C "$audit_repository" commit-tree "$audit_tree" -p "$audit_valid" <"$audit_fixture/message")
expect_failure 'body-max-line-length' "$audit_base" "$audit_long"

audit_merge=$(printf 'chore(ci): integrate a synthetic side branch\n' | git -C "$audit_repository" commit-tree "$audit_tree" -p "$audit_valid" -p "$audit_long")
expect_failure 'body-max-line-length' "$audit_base" "$audit_merge"
audit_type=$(printf 'unsupported(ci): exercise an invalid new type\n' | git -C "$audit_repository" commit-tree "$audit_tree" -p "$audit_valid")
expect_failure 'type-enum' "$audit_base" "$audit_type"

git -C "$audit_repository" show -s --format=%B 1702ed337d74c4baf6439a10c11d89abdbcc78e1 >"$audit_fixture/copied-message"
audit_copy=$(git -C "$audit_repository" commit-tree "$audit_tree" -p "$audit_valid" <"$audit_fixture/copied-message")
expect_failure 'body-max-line-length' "$audit_base" "$audit_copy"

# The regular local hook must reject the same body, independently of history.
if "$audit_repository/cli/elo" git commit-msg "$audit_fixture/message" >"$audit_fixture/output" 2>&1; then
  printf 'Commit history audit FAIL: local hook accepted an overlong body\n' >&2
  exit 1
fi
grep -F 'body-max-line-length' "$audit_fixture/output" >/dev/null

# An allowed historical object still obeys every other configured rule.
cat >"$audit_repository/commitlint.config.js" <<'CONFIG'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: { 'header-max-length': [2, 'always', 8] }
}
CONFIG
audit_parent=$(git -C "$audit_repository" rev-parse '1702ed337d74c4baf6439a10c11d89abdbcc78e1^')
expect_failure 'header-max-length' "$audit_parent" 1702ed337d74c4baf6439a10c11d89abdbcc78e1

printf 'Commit history audit PASS: exact objects, strict new messages and hook, other rules and invalid refs\n'
