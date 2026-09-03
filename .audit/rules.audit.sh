#!/bin/sh
set -eu

AUDIT_DIR=$(
  CDPATH=
  cd -P "$(dirname "$0")"
  pwd
)
PROJECT_ROOT=${GITHUB_WORKSPACE:-$(
  CDPATH=
  cd -P "$AUDIT_DIR/.."
  pwd
)}
RULE_ROOT="$PROJECT_ROOT/.agents/rules"
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-rule-audit.$$"

umask 077
mkdir "$TMP_ROOT" || {
  printf 'Rule catalog FAIL: cannot create temporary directory\n' >&2
  exit 1
}
cleanup() { rm -rf "$TMP_ROOT"; }
trap cleanup 0 1 2 15

failures=0

rule_fail() {
  failures=$((failures + 1))
  printf '\n[%s] %s\n  %s\n  fix: %s\n' "$1" "$2" "$3" "$4" >&2
}

[ -f "$RULE_ROOT/readme.md" ] ||
  rule_fail support-file .agents/rules/readme.md \
    "the canonical rule index is missing" \
    "restore the unnumbered support document"

nested=$(find "$RULE_ROOT" -mindepth 1 -type d -print | sort)
if [ -n "$nested" ]; then
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    rule_fail flat-catalog "${path#"$PROJECT_ROOT"/}" \
      "rule subdirectories are not allowed" \
      "move durable rules directly under .agents/rules"
  done <<EOF
$nested
EOF
fi

inventory="$TMP_ROOT/inventory"
index_inventory="$TMP_ROOT/index-inventory"
prefixes="$TMP_ROOT/prefixes"
: >"$prefixes"
find "$RULE_ROOT" -maxdepth 1 -type f -name '*.rule.md' -print |
  sort >"$inventory"

while IFS= read -r path; do
  [ -n "$path" ] || continue
  base=${path##*/}
  if ! printf '%s\n' "$base" |
    grep -Eq '^[0-9][0-9][0-9]-[a-z0-9]+(-[a-z0-9]+)*\.rule\.md$'
  then
    rule_fail rule-filename "${path#"$PROJECT_ROOT"/}" \
      "durable rules must use NNN-lowercase-kebab-case.rule.md" \
      "rename the rule and update references atomically"
    continue
  fi

  prefix=${base%%-*}
  if grep -Fx "$prefix" "$prefixes" >/dev/null 2>&1; then
    rule_fail duplicate-rule-id "${path#"$PROJECT_ROOT"/}" \
      "rule identity $prefix is duplicated" \
      "preserve one owner and allocate a new highest identity"
  else
    printf '%s\n' "$prefix" >>"$prefixes"
  fi
done <"$inventory"

cat >"$TMP_ROOT/required" <<'CATALOG'
001|architecture
002|code-style
003|context-engineering
004|import-boundaries
005|markdown
006|memory-nucleus
007|package-ownership
008|product-safety-and-privacy
009|react-and-next
010|source-organization
011|spec-driven-development
CATALOG

while IFS='|' read -r number slug; do
  [ -n "$number" ] || continue
  path="$RULE_ROOT/$number-$slug.rule.md"
  [ -f "$path" ] ||
    rule_fail required-rule ".agents/rules/$number-$slug.rule.md" \
      "the initial numbered catalog mapping is incomplete" \
      "restore the canonical rule at its stable identity"
done <"$TMP_ROOT/required"

if [ -f "$RULE_ROOT/readme.md" ]; then
  sed -n 's/.*](\([0-9][0-9][0-9]-[a-z0-9][a-z0-9-]*\.rule\.md\)).*/\1/p' \
    "$RULE_ROOT/readme.md" |
    sort >"$index_inventory"
  sed 's#^.*/##' "$inventory" | sort >"$TMP_ROOT/file-inventory"

  if ! cmp -s "$TMP_ROOT/file-inventory" "$index_inventory"; then
    rule_fail index-drift .agents/rules/readme.md \
      "the rule index and filesystem inventory differ" \
      "list every numbered rule exactly once"
  fi
  if [ "$(sort "$index_inventory" | uniq -d | wc -l | tr -d '[:space:]')" -ne 0 ]; then
    rule_fail index-duplicate .agents/rules/readme.md \
      "a numbered rule is indexed more than once" \
      "keep one catalog row per stable identity"
  fi

  for phrase in \
    'stable catalog identity' \
    'never defines enforcement order or precedence' \
    'never reassigned, compacted, or reused' \
    'only unnumbered support document'
  do
    grep -F "$phrase" "$RULE_ROOT/readme.md" >/dev/null 2>&1 ||
      rule_fail lifecycle-contract .agents/rules/readme.md \
        "missing lifecycle contract: $phrase" \
        "restore stable identity, precedence, and non-reuse guidance"
  done
fi

for path in "$RULE_ROOT"/*.md; do
  [ -f "$path" ] || continue
  base=${path##*/}
  case "$base" in
    readme.md|*.rule.md) ;;
    *)
      rule_fail unexpected-rule-file "${path#"$PROJECT_ROOT"/}" \
        "only readme.md and numbered .rule.md documents are allowed" \
        "remove or relocate the unsupported file"
      ;;
  esac
done

grep -F 'NNN-lowercase-kebab-case.rule.md' "$PROJECT_ROOT/AGENTS.md" >/dev/null 2>&1 ||
  rule_fail root-navigation AGENTS.md \
    "the root harness does not document numbered rule identity" \
    "publish the canonical filename contract"
grep -F 'NNN-lowercase-kebab-case.rule.md' \
  "$RULE_ROOT/005-markdown.rule.md" >/dev/null 2>&1 ||
  rule_fail markdown-contract .agents/rules/005-markdown.rule.md \
    "the Markdown rule does not own the numbered filename contract" \
    "restore the canonical naming rule"
grep -F 'NNN-lowercase-kebab-case.rule.md' \
  "$RULE_ROOT/011-spec-driven-development.rule.md" >/dev/null 2>&1 ||
  rule_fail workflow-contract .agents/rules/011-spec-driven-development.rule.md \
    "the delivery rule does not require numbered rule references" \
    "restore the cross-reference contract"
[ -f "$PROJECT_ROOT/.agents/adrs/0026-numbered-rule-catalog.adr.md" ] ||
  rule_fail architecture-decision .agents/adrs/0026-numbered-rule-catalog.adr.md \
    "the stable rule-identity decision is missing" \
    "restore ADR-0026"

if command -v git >/dev/null 2>&1 &&
  git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1
then
  while IFS='|' read -r number slug; do
    [ -n "$number" ] || continue
    stale="$TMP_ROOT/stale-$number"
    if git -C "$PROJECT_ROOT" grep -n -E \
      "(^|[^0-9A-Za-z-])${slug}\.rule\.md([^0-9A-Za-z-]|$)" -- . \
      >"$stale" 2>/dev/null
    then
      rule_fail stale-rule-reference "$slug.rule.md" \
        "legacy unnumbered references remain:\n$(cat "$stale")" \
        "replace every reference with $number-$slug.rule.md"
    fi
  done <"$TMP_ROOT/required"

  git -C "$PROJECT_ROOT" grep -h -o -E \
    '\.agents/rules/[0-9][0-9][0-9]-[a-z0-9]+(-[a-z0-9]+)*\.rule\.md' \
    -- . ':(exclude).audit/**' 2>/dev/null |
    sort -u >"$TMP_ROOT/references" || :

  while IFS= read -r reference; do
    [ -n "$reference" ] || continue
    [ -f "$PROJECT_ROOT/$reference" ] ||
      rule_fail unresolved-rule-reference "$reference" \
        "the referenced numbered rule does not exist" \
        "repair or remove the stale reference"
  done <"$TMP_ROOT/references"
else
  rule_fail git-required .audit/rules.audit.sh \
    "git is required to prove repository-wide reference integrity" \
    "run the audit from a repository checkout"
fi

if [ "$failures" -gt 0 ]; then
  printf '\nRule catalog FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Rule catalog PASS\n'
printf 'numbered inventory and lifecycle: PASS\n'
printf 'index and repository references: PASS\n'
