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
SPEC_ROOT="$PROJECT_ROOT/.agents/specs"
PROMPT_ROOT="$PROJECT_ROOT/.agents/prompts"
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-spec-audit.$$"

umask 077
mkdir "$TMP_ROOT" || {
  printf 'Spec workflow FAIL: cannot create temporary directory\n' >&2
  exit 1
}
cleanup() { rm -rf "$TMP_ROOT"; }
trap cleanup 0 1 2 15

failures=0
spec_count=0

spec_fail() {
  failures=$((failures + 1))
  printf '\n[%s] %s\n  %s\n  fix: %s\n' "$1" "$2" "$3" "$4" >&2
}

frontmatter_scalar() {
  awk -v key="$2" '
    NR == 1 { if ($0 != "---") exit 2; inside = 1; next }
    inside && $0 == "---" { exit }
    inside && index($0, key ":") == 1 {
      value = substr($0, length(key) + 2)
      sub(/^[[:space:]]*/, "", value)
      sub(/[[:space:]]*$/, "", value)
      print value
      exit
    }
  ' "$1"
}

frontmatter_list_count() {
  awk -v key="$2" '
    NR == 1 { inside = ($0 == "---"); next }
    inside && $0 == "---" { exit }
    inside && $0 ~ ("^" key ":[[:space:]]*$") { list = 1; next }
    list && /^  -[[:space:]]+/ { count++; next }
    list && /^[a-z][a-z-]*:/ { list = 0 }
    END { print count + 0 }
  ' "$1"
}

frontmatter_list_contains() {
  awk -v key="$2" -v wanted="$3" '
    NR == 1 { inside = ($0 == "---"); next }
    inside && $0 == "---" { exit }
    inside && $0 ~ ("^" key ":[[:space:]]*$") { list = 1; next }
    list && /^  -[[:space:]]+/ {
      value = $0
      sub(/^  -[[:space:]]+/, "", value)
      sub(/[[:space:]]*$/, "", value)
      if (value == wanted) found = 1
      next
    }
    list && /^[a-z][a-z-]*:/ { list = 0 }
    END { exit(found ? 0 : 1) }
  ' "$1"
}

frontmatter_problem() {
  awk '
    NR == 1 {
      if ($0 != "---") { print "missing opening delimiter"; exit }
      inside = 1
      next
    }
    inside && $0 == "---" { closed = 1; exit }
    inside {
      if ($0 ~ /^[[:space:]]*$/) next
      if ($0 ~ /^[a-z][a-z-]*:[[:space:]]*.*$/) next
      if ($0 ~ /^  -[[:space:]]+.+$/) next
      print "unsupported frontmatter line: " $0
      exit
    }
    END { if (inside && !closed) print "missing closing delimiter" }
  ' "$1"
}

section_text() {
  awk -v heading="$2" '
    $0 == "## " heading { inside = 1; next }
    inside && /^## / { exit }
    inside { print }
  ' "$1"
}

document_title() {
  awk '
    $0 == "---" { delimiters++; next }
    delimiters >= 2 && $0 !~ /^[[:space:]]*$/ { print; exit }
  ' "$1"
}

for required_file in \
  AGENTS.md \
  .agents/rules/005-markdown.rule.md \
  .agents/rules/011-spec-driven-development.rule.md \
  .agents/specs/readme.md \
  .agents/specs/template.md \
  .agents/specs/workflow.md \
  .agents/prompts/adr.prompt.md \
  .agents/prompts/rule.prompt.md \
  .agents/prompts/skill.prompt.md \
  .agents/prompts/spec.prompt.md \
  .github/pull_request_template.md
do
  [ -f "$PROJECT_ROOT/$required_file" ] ||
    spec_fail required-workflow-file "$required_file" \
      "required spec-driven workflow file is missing" \
      "restore the canonical workflow artifact"
done

if [ -d "$PROMPT_ROOT" ]; then
  find "$PROMPT_ROOT" -mindepth 1 -print | sort >"$TMP_ROOT/prompt-paths"
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    case "$path" in
      "$PROMPT_ROOT/adr.prompt.md"|"$PROMPT_ROOT/rule.prompt.md"|"$PROMPT_ROOT/skill.prompt.md"|"$PROMPT_ROOT/spec.prompt.md") ;;
      *)
        spec_fail prompt-inventory "${path#"$PROJECT_ROOT"/}" \
          "only the four canonical agent artifact templates are allowed" \
          "remove the extra path or govern a template-contract change"
        ;;
    esac
  done <"$TMP_ROOT/prompt-paths"
fi

grep -F '.agents/specs/workflow.md' "$PROJECT_ROOT/AGENTS.md" >/dev/null 2>&1 ||
  spec_fail workflow-entrypoint AGENTS.md \
    "the engineering entrypoint does not point to the spec workflow" \
    "add the workflow pointer"
grep -F '.agents/rules/*.rule.md' "$PROJECT_ROOT/AGENTS.md" >/dev/null 2>&1 ||
  spec_fail rule-entrypoint AGENTS.md \
    "the engineering entrypoint does not load canonical rule suffixes" \
    "load alwaysApply rules from .agents/rules/*.rule.md"
grep -Eq '^alwaysApply:[[:space:]]*true[[:space:]]*$' \
  "$PROJECT_ROOT/.agents/rules/011-spec-driven-development.rule.md" ||
  spec_fail always-apply-rule .agents/rules/011-spec-driven-development.rule.md \
    "the spec-driven rule is not always applied" \
    "declare alwaysApply: true"

nested_dirs=$(find "$SPEC_ROOT" -mindepth 1 -type d -print | sort)
if [ -n "$nested_dirs" ]; then
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    spec_fail flat-spec-catalog "${path#"$PROJECT_ROOT"/}" \
      "spec subdirectories are not allowed" \
      "move the document directly under .agents/specs"
  done <<EOF
$nested_dirs
EOF
fi

for path in "$PROJECT_ROOT"/.agents/adrs/*.md; do
  [ -f "$path" ] || continue
  base=${path##*/}
  case "$base" in
    readme.md|template.md|*.adr.md) ;;
    *) spec_fail semantic-suffix "${path#"$PROJECT_ROOT"/}" \
      "ADR filename does not end in .adr.md" \
      "rename the ADR and update references atomically" ;;
  esac
done

for path in "$PROJECT_ROOT"/.agents/rules/*.md; do
  [ -f "$path" ] || continue
  base=${path##*/}
  case "$base" in
    readme.md|template.md|*.rule.md) ;;
    *) spec_fail semantic-suffix "${path#"$PROJECT_ROOT"/}" \
      "rule filename does not end in .rule.md" \
      "rename the rule and update references atomically" ;;
  esac
done

for path in "$PROJECT_ROOT"/.audit/*.sh; do
  [ -f "$path" ] || continue
  case "$path" in
    *.audit.sh) ;;
    *) spec_fail semantic-suffix "${path#"$PROJECT_ROOT"/}" \
      "tracked audit checker does not end in .audit.sh" \
      "rename the checker and update references atomically" ;;
  esac
done

legacy_numbered=$(find "$SPEC_ROOT" -maxdepth 1 -type f \
  -name '[0-9][0-9][0-9]-*.md' ! -name '*.spec.md' -print | sort)
if [ -n "$legacy_numbered" ]; then
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    spec_fail semantic-suffix "${path#"$PROJECT_ROOT"/}" \
      "numbered spec filename does not end in .spec.md" \
      "rename the spec and update references atomically"
  done <<EOF
$legacy_numbered
EOF
fi

spec_files="$TMP_ROOT/spec-files"
priorities="$TMP_ROOT/priorities"
ids="$TMP_ROOT/ids"
numbers="$TMP_ROOT/numbers"
: >"$priorities"
: >"$ids"
: >"$numbers"
find "$SPEC_ROOT" -maxdepth 1 -type f -name '*.spec.md' -print | sort >"$spec_files"
spec_count=$(awk 'END { print NR + 0 }' "$spec_files")
[ "$spec_count" -gt 0 ] ||
  spec_fail spec-presence .agents/specs \
    "no numbered specs were found" \
    "create a NNN-lowercase-slug.spec.md document"

while IFS= read -r path; do
  [ -n "$path" ] || continue
  file=${path#"$PROJECT_ROOT"/}
  base=${path##*/}

  if ! printf '%s\n' "$base" |
    grep -Eq '^0[0-9][0-9]-[a-z0-9]+(-[a-z0-9]+)*\.spec\.md$'
  then
    spec_fail catalog-filename "$file" \
      "every numbered spec must use priority 001-099 and .spec.md" \
      "rename to 0NN-lowercase-slug.spec.md"
    continue
  fi

  priority=$(printf '%s\n' "$base" | cut -c 1-3)
  if [ "$priority" = 000 ]; then
    spec_fail priority-band "$file" \
      "priority 000 is reserved" \
      "choose priority 001 through 099"
    continue
  fi
  if grep -Fx "$priority" "$priorities" >/dev/null 2>&1; then
    spec_fail duplicate-priority "$file" \
      "priority $priority is already assigned" \
      "assign one unique priority"
  else
    printf '%s\n' "$priority" >>"$priorities"
  fi

  problem=$(frontmatter_problem "$path")
  if [ -n "$problem" ]; then
    spec_fail frontmatter "$file" "$problem" \
      "use scalar values and two-space list items"
    continue
  fi

  for key in id title type status mode created updated; do
    value=$(frontmatter_scalar "$path" "$key")
    [ -n "$value" ] ||
      spec_fail required-metadata "$file" \
        "$key must be a non-empty scalar" \
        "complete canonical frontmatter"
  done
  for key in owners targets context rules adrs skills evidence; do
    count=$(frontmatter_list_count "$path" "$key")
    [ "$count" -gt 0 ] ||
      spec_fail required-list-metadata "$file" \
        "$key must contain at least one item" \
        "complete canonical frontmatter"
  done

  spec_id=$(frontmatter_scalar "$path" id)
  spec_type=$(frontmatter_scalar "$path" type)
  spec_status=$(frontmatter_scalar "$path" status)
  spec_mode=$(frontmatter_scalar "$path" mode)

  if ! printf '%s\n' "$spec_id" | grep -Eq '^SPEC-[0-9][0-9][0-9]$'; then
    spec_fail spec-id-format "$file" \
      "${spec_id:-<missing>} is not SPEC-###" \
      "assign a unique durable ID"
  else
    if awk -F '|' -v wanted="$spec_id" '$1 == wanted { found = 1 } END { exit(found ? 0 : 1) }' "$ids"; then
      first_file=$(awk -F '|' -v wanted="$spec_id" '$1 == wanted { print $2; exit }' "$ids")
      spec_fail duplicate-spec-id "$file" \
        "$spec_id is already used by $first_file" \
        "assign the next unused durable ID"
    else
      printf '%s|%s\n' "$spec_id" "$file" >>"$ids"
    fi
    printf '%s\n' "$spec_id" | sed -n 's/^SPEC-\([0-9][0-9][0-9]\)$/\1/p' >>"$numbers"
  fi

  case "$spec_type" in
    chore|experiment|feature|fix|governance|migration|refactor) ;;
    *) spec_fail spec-type "$file" \
      "${spec_type:-<missing>} is not allowed" \
      "use an allowed spec type" ;;
  esac
  case "$spec_status" in
    draft|ready|in-progress|implemented|superseded|retired) ;;
    *) spec_fail spec-status "$file" \
      "${spec_status:-<missing>} is not allowed" \
      "use an allowed status" ;;
  esac
  case "$spec_mode" in
    bootstrap|prospective|retrospective) ;;
    *) spec_fail spec-mode "$file" \
      "${spec_mode:-<missing>} is not allowed" \
      "use an allowed mode" ;;
  esac

  if [ "$spec_mode" = retrospective ]; then
    [ "$spec_status" = implemented ] ||
      spec_fail retrospective-status "$file" \
        "retrospective specs must be implemented" \
        "set implemented or use prospective mode"
    integrity=$(section_text "$path" "Retrospective Integrity")
    integrity_length=$(printf '%s' "$integrity" | wc -c | tr -d '[:space:]')
    [ "${integrity_length:-0}" -ge 80 ] ||
      spec_fail retrospective-integrity "$file" \
        "retrospective integrity disclosure is too short" \
        "state reconstruction evidence and limitations"
  fi

  if [ "$spec_status" = implemented ]; then
    acceptance=$(section_text "$path" "Acceptance Criteria")
    printf '%s\n' "$acceptance" | grep -Eq '^- \[[xX]\][[:space:]]+' ||
      spec_fail implemented-acceptance "$file" \
        "implemented spec has no checked criteria" \
        "record evidenced completion"
    if printf '%s\n' "$acceptance" | grep -Eq '^- \[ \][[:space:]]+'; then
      spec_fail implemented-acceptance "$file" \
        "implemented spec still has unchecked criteria" \
        "finish, supersede or retire unmet scope"
    fi
    if frontmatter_list_contains "$path" evidence pending; then
      spec_fail implemented-evidence "$file" \
        "implemented spec still has pending evidence" \
        "record stable evidence"
    fi
  fi

  for heading in \
    "Problem Statement" "Solution" "User Stories" "Scope" \
    "Implementation Decisions" "Testing Decisions" "Acceptance Criteria" \
    "Failure Behavior" "Out of Scope" "Evidence and Promotion" "Further Notes"
  do
    compact=$(section_text "$path" "$heading" | tr -d '[:space:]')
    [ -n "$compact" ] ||
      spec_fail required-section "$file" \
        "missing or empty section: $heading" \
        "complete the canonical body"
  done

  title=$(document_title "$path")
  case "$title" in
    "# $spec_id: "*) ;;
    *) spec_fail spec-title "$file" \
      "document title must start with # $spec_id:" \
      "align H1 with the durable ID" ;;
  esac

  grep -F "($base)" "$SPEC_ROOT/readme.md" >/dev/null 2>&1 ||
    spec_fail missing-index-entry "$file" \
      "numbered spec is not linked from the catalog" \
      "add the exact semantic filename"
done <"$spec_files"

index_targets="$TMP_ROOT/index-targets"
sed -n 's/.*](\([^)]*\.md\)).*/\1/p' "$SPEC_ROOT/readme.md" >"$index_targets"
while IFS= read -r target; do
  [ -n "$target" ] || continue
  case "$target" in http://*|https://*) continue ;; esac
  [ -f "$SPEC_ROOT/$target" ] ||
    spec_fail spec-index-reference .agents/specs/readme.md \
      "catalog link $target does not resolve" \
      "point the index at an existing flat spec"
done <"$index_targets"

reference_files="$TMP_ROOT/semantic-reference-files"
find "$PROJECT_ROOT" \
  \( -path "$PROJECT_ROOT/.git" -o -path '*/node_modules' -o \
     -path '*/dist' -o -path '*/.next' -o -path '*/.turbo' -o \
     -path '*/coverage' \) -prune -o \
  -type f \( -name '*.md' -o -name '*.sh' -o -name '*.yml' -o \
    -name '*.yaml' -o -name '*.json' -o -name '*.ts' -o \
    -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \) -print | \
  sort >"$reference_files"

while IFS= read -r reference_file; do
  [ -n "$reference_file" ] || continue
  [ "$reference_file" != "$PROJECT_ROOT/.audit/specs.audit.sh" ] || continue

  if grep -Eq '\.agents/adrs/[0-9][0-9][0-9][0-9]-[a-z0-9-]+\.md([^a-zA-Z0-9.]|$)' "$reference_file"; then
    spec_fail unsuffixed-adr-reference "${reference_file#"$PROJECT_ROOT"/}" \
      "reference points to an ADR without the canonical .adr.md suffix" \
      "replace it with the canonical semantic-suffix path"
  fi
  if sed 's#\.agents/rules/readme\.md##g' "$reference_file" | \
    grep -Eq '\.agents/rules/[a-z0-9-]+\.md([^a-zA-Z0-9.]|$)'; then
    spec_fail unsuffixed-rule-reference "${reference_file#"$PROJECT_ROOT"/}" \
      "reference points to a rule without the canonical .rule.md suffix" \
      "replace it with the canonical semantic-suffix path"
  fi
  if grep -Eq '\.agents/specs/[0-9][0-9][0-9]-[a-z0-9-]+\.md([^a-zA-Z0-9.]|$)' "$reference_file"; then
    spec_fail unsuffixed-spec-reference "${reference_file#"$PROJECT_ROOT"/}" \
      "reference points to a numbered spec without the canonical .spec.md suffix" \
      "replace it with the canonical semantic-suffix path"
  fi
  if grep -Eq '\.audit/[a-z0-9-]+\.script\.sh([^a-zA-Z0-9.]|$)' "$reference_file"; then
    spec_fail legacy-audit-reference "${reference_file#"$PROJECT_ROOT"/}" \
      "reference points to a retired .script.sh audit path" \
      "replace it with the canonical .audit.sh path"
  fi
done <"$reference_files"

if [ -s "$numbers" ]; then
  max_id=$(sort -n "$numbers" | tail -n 1)
  next_id=$(awk -v value="$max_id" 'BEGIN { printf "SPEC-%03d", value + 1 }')
  grep -F "$next_id" "$SPEC_ROOT/readme.md" >/dev/null 2>&1 ||
    spec_fail next-spec-id .agents/specs/readme.md \
      "next available durable ID should be $next_id" \
      "update the catalog"
fi

if [ "$failures" -gt 0 ]; then
  printf 'Spec workflow FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Spec workflow PASS - %s numbered specs\n' "$spec_count"
