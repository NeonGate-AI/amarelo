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
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-spec-audit.$$"

umask 077
mkdir "$TMP_ROOT" || {
  printf 'Spec workflow FAIL: cannot create temporary directory\n' >&2
  exit 1
}

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup 0 1 2 15

failures=0
spec_count=0

spec_fail() {
  rule=$1
  file=$2
  detail=$3
  fix=$4
  failures=$((failures + 1))
  printf '\n[%s] %s\n  %s\n  fix: %s\n' "$rule" "$file" "$detail" "$fix" >&2
}

frontmatter_scalar() {
  awk -v key="$2" '
    NR == 1 {
      if ($0 != "---") exit 2
      inside = 1
      next
    }
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
    inside && $0 ~ ("^" key ":[[:space:]]*$") {
      list = 1
      next
    }
    list && /^  -[[:space:]]+/ {
      count++
      next
    }
    list && /^[a-z][a-z-]*:/ { list = 0 }
    END { print count + 0 }
  ' "$1"
}

frontmatter_list_contains() {
  awk -v key="$2" -v wanted="$3" '
    NR == 1 { inside = ($0 == "---"); next }
    inside && $0 == "---" { exit }
    inside && $0 ~ ("^" key ":[[:space:]]*$") {
      list = 1
      next
    }
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
      if ($0 != "---") {
        print "missing opening delimiter"
        exit
      }
      inside = 1
      next
    }
    inside && $0 == "---" {
      closed = 1
      exit
    }
    inside {
      if ($0 ~ /^[[:space:]]*$/) next
      if ($0 ~ /^[a-z][a-z-]*:[[:space:]]*.*$/) next
      if ($0 ~ /^  -[[:space:]]+.+$/) next
      print "unsupported frontmatter line: " $0
      exit
    }
    END {
      if (inside && !closed) print "missing closing delimiter"
    }
  ' "$1"
}

section_text() {
  awk -v heading="$2" '
    $0 == "## " heading {
      inside = 1
      next
    }
    inside && /^## / { exit }
    inside { print }
  ' "$1"
}

document_title() {
  awk '
    $0 == "---" {
      delimiters++
      next
    }
    delimiters >= 2 && $0 !~ /^[[:space:]]*$/ {
      print
      exit
    }
  ' "$1"
}

for required_file in \
  AGENTS.md \
  .agents/rules/spec-driven-development.md \
  .agents/specs/readme.md \
  .agents/specs/template.md \
  .agents/specs/workflow.md \
  .github/pull_request_template.md
do
  if [ ! -f "$PROJECT_ROOT/$required_file" ]; then
    spec_fail \
      required-workflow-file \
      "$required_file" \
      "required spec-driven workflow file is missing" \
      "restore the canonical workflow artifact"
  fi
done

if ! grep -F '.agents/specs/workflow.md' "$PROJECT_ROOT/AGENTS.md" >/dev/null 2>&1; then
  spec_fail \
    workflow-entrypoint \
    AGENTS.md \
    "the engineering entrypoint does not point to the spec workflow" \
    "add a concise workflow and active-spec loading pointer"
fi

if ! grep -Eq '^alwaysApply:[[:space:]]*true[[:space:]]*$' \
  "$PROJECT_ROOT/.agents/rules/spec-driven-development.md"
then
  spec_fail \
    always-apply-rule \
    .agents/rules/spec-driven-development.md \
    "the spec-driven rule is not always applied" \
    "declare alwaysApply: true in rule frontmatter"
fi

if [ -f "$PROJECT_ROOT/.github/pr_template.md" ]; then
  spec_fail \
    legacy-pr-template \
    .github/pr_template.md \
    "GitHub does not discover the legacy pull request template filename" \
    "remove it and use .github/pull_request_template.md"
fi

PR_TEMPLATE="$PROJECT_ROOT/.github/pull_request_template.md"
if [ -f "$PR_TEMPLATE" ]; then
  for heading in \
    "## Delivery contract" \
    "## Outcome" \
    "## Scope" \
    "## Dependencies and order" \
    "## Acceptance evidence" \
    "## Validation" \
    "## Independent review" \
    "### Standards" \
    "### Spec fidelity" \
    "## Safety and privacy" \
    "## Memory ROI" \
    "## Promotion" \
    "## Merge gate"
  do
    if ! grep -Fx "$heading" "$PR_TEMPLATE" >/dev/null 2>&1; then
      spec_fail \
        pr-template-section \
        .github/pull_request_template.md \
        "required section is missing: $heading" \
        "restore the spec-driven pull request evidence contract"
    fi
  done

  for phrase in \
    "Fixed merge-base SHA:" \
    "Reviewed head SHA:" \
    "CI run:" \
    "delivery spec is \`implemented\`" \
    "conflict-free" \
    "Both independent review axes pass on the final head"
  do
    if ! grep -F "$phrase" "$PR_TEMPLATE" >/dev/null 2>&1; then
      spec_fail \
        pr-template-gate \
        .github/pull_request_template.md \
        "required merge evidence is missing: $phrase" \
        "restore the exact-head review, CI and conflict gate"
    fi
  done
fi

nested_dirs=$(find "$SPEC_ROOT" -mindepth 1 -type d -print | sort)
if [ -n "$nested_dirs" ]; then
  while IFS= read -r nested_dir; do
    [ -n "$nested_dir" ] || continue
    spec_fail \
      flat-spec-catalog \
      "${nested_dir#"$PROJECT_ROOT"/}" \
      "spec subdirectories are not allowed" \
      "move every spec document directly under .agents/specs"
  done <<EOF
$nested_dirs
EOF
fi

spec_files="$TMP_ROOT/spec-files"
priorities="$TMP_ROOT/priorities"
ids="$TMP_ROOT/ids"
numbers="$TMP_ROOT/numbers"
: >"$spec_files"
: >"$priorities"
: >"$ids"
: >"$numbers"

for path in "$SPEC_ROOT"/*.md; do
  [ -f "$path" ] || continue
  base=$(basename "$path")
  case "$base" in
    readme.md|template.md|workflow.md) continue ;;
  esac

  file=${path#"$PROJECT_ROOT"/}
  if ! printf '%s\n' "$base" |
    grep -Eq '^0[0-9][0-9]-[a-z0-9]+(-[a-z0-9]+)*\.md$'
  then
    spec_fail \
      catalog-filename \
      "$file" \
      "every numbered spec must use priority 001-099 and lowercase kebab-case" \
      "rename the file to 0NN-lowercase-slug.md"
    continue
  fi

  priority=$(printf '%s\n' "$base" | cut -c 1-3)
  case "$priority" in
    000)
      spec_fail \
        priority-band \
        "$file" \
        "priority 000 is reserved and cannot identify a spec" \
        "choose a unique priority from 001 through 099"
      continue
      ;;
  esac

  if grep -Fx "$priority" "$priorities" >/dev/null 2>&1; then
    spec_fail \
      duplicate-priority \
      "$file" \
      "priority $priority is already assigned" \
      "assign one unique catalog priority"
  else
    printf '%s\n' "$priority" >>"$priorities"
  fi
  printf '%s\n' "$path" >>"$spec_files"
done

spec_count=$(awk 'END { print NR + 0 }' "$spec_files")
if [ "$spec_count" -eq 0 ]; then
  spec_fail \
    spec-presence \
    .agents/specs \
    "no numbered specs were found" \
    "create a SPEC-### document from the canonical template"
fi

while IFS= read -r path; do
  [ -n "$path" ] || continue
  file=${path#"$PROJECT_ROOT"/}
  base=$(basename "$path")

  problem=$(frontmatter_problem "$path")
  if [ -n "$problem" ]; then
    spec_fail \
      frontmatter \
      "$file" \
      "$problem" \
      "use scalar values and two-space list items from the template"
    continue
  fi

  for key in id title type status mode created updated; do
    value=$(frontmatter_scalar "$path" "$key")
    if [ -z "$value" ]; then
      spec_fail \
        required-metadata \
        "$file" \
        "$key must be a non-empty scalar" \
        "complete the canonical numbered-spec frontmatter"
    fi
  done

  for key in owners targets context rules adrs skills evidence; do
    count=$(frontmatter_list_count "$path" "$key")
    if [ "$count" -eq 0 ]; then
      spec_fail \
        required-list-metadata \
        "$file" \
        "$key must contain at least one item" \
        "complete the canonical numbered-spec frontmatter"
    fi
  done

  spec_id=$(frontmatter_scalar "$path" id)
  spec_type=$(frontmatter_scalar "$path" type)
  spec_status=$(frontmatter_scalar "$path" status)
  spec_mode=$(frontmatter_scalar "$path" mode)

  if ! printf '%s\n' "$spec_id" | grep -Eq '^SPEC-[0-9][0-9][0-9]$'; then
    spec_fail \
      spec-id-format \
      "$file" \
      "frontmatter id ${spec_id:-<missing>} is not a durable SPEC-### identifier" \
      "assign a unique durable SPEC-### ID independently from filename priority"
  else
    if awk -F '|' -v wanted="$spec_id" '$1 == wanted { found = 1 } END { exit(found ? 0 : 1) }' "$ids"; then
      first_file=$(awk -F '|' -v wanted="$spec_id" '$1 == wanted { print $2; exit }' "$ids")
      spec_fail \
        duplicate-spec-id \
        "$file" \
        "$spec_id is already used by $first_file" \
        "assign the next unused sequential durable ID"
    else
      printf '%s|%s\n' "$spec_id" "$file" >>"$ids"
    fi
    printf '%s\n' "$spec_id" | sed -n 's/^SPEC-\([0-9][0-9][0-9]\)$/\1/p' >>"$numbers"
  fi

  case "$spec_type" in
    chore|experiment|feature|fix|governance|migration|refactor) ;;
    *)
      spec_fail \
        spec-type \
        "$file" \
        "${spec_type:-<missing>} is not an allowed type" \
        "use one of: chore, experiment, feature, fix, governance, migration, refactor"
      ;;
  esac

  case "$spec_status" in
    draft|ready|in-progress|implemented|superseded|retired) ;;
    *)
      spec_fail \
        spec-status \
        "$file" \
        "${spec_status:-<missing>} is not an allowed status" \
        "use one of: draft, ready, in-progress, implemented, superseded, retired"
      ;;
  esac

  case "$spec_mode" in
    bootstrap|prospective|retrospective) ;;
    *)
      spec_fail \
        spec-mode \
        "$file" \
        "${spec_mode:-<missing>} is not an allowed mode" \
        "use one of: bootstrap, prospective, retrospective"
      ;;
  esac

  if [ "$spec_mode" = retrospective ]; then
    if [ "$spec_status" != implemented ]; then
      spec_fail \
        retrospective-status \
        "$file" \
        "retrospective specs must record implemented pre-workflow work" \
        "set status to implemented or use prospective mode"
    fi
    integrity=$(section_text "$path" "Retrospective Integrity")
    integrity_length=$(printf '%s' "$integrity" | wc -c | tr -d '[:space:]')
    if [ "${integrity_length:-0}" -lt 80 ]; then
      spec_fail \
        retrospective-integrity \
        "$file" \
        "retrospective spec lacks a substantive integrity disclosure" \
        "state that it was reconstructed after implementation and disclose evidence limits"
    fi
  fi

  if [ "$spec_status" = implemented ]; then
    acceptance=$(section_text "$path" "Acceptance Criteria")
    if ! printf '%s\n' "$acceptance" | grep -Eq '^- \[[xX]\][[:space:]]+'; then
      spec_fail \
        implemented-acceptance \
        "$file" \
        "implemented spec has no checked acceptance criteria" \
        "record evidenced completion with checked criteria"
    fi
    if printf '%s\n' "$acceptance" | grep -Eq '^- \[ \][[:space:]]+'; then
      spec_fail \
        implemented-acceptance \
        "$file" \
        "implemented spec still contains unchecked acceptance criteria" \
        "finish, supersede or remove unmet scope before closure"
    fi
    if frontmatter_list_contains "$path" evidence pending; then
      spec_fail \
        implemented-evidence \
        "$file" \
        "implemented spec still has pending evidence" \
        "replace pending with stable evidence references"
    fi
  fi

  for heading in \
    "Problem Statement" \
    "Solution" \
    "User Stories" \
    "Scope" \
    "Implementation Decisions" \
    "Testing Decisions" \
    "Acceptance Criteria" \
    "Failure Behavior" \
    "Out of Scope" \
    "Evidence and Promotion" \
    "Further Notes"
  do
    section=$(section_text "$path" "$heading")
    compact=$(printf '%s' "$section" | tr -d '[:space:]')
    if [ -z "$compact" ]; then
      spec_fail \
        required-section \
        "$file" \
        "missing or empty section: $heading" \
        "complete the canonical numbered-spec body"
    fi
  done

  title=$(document_title "$path")
  case "$title" in
    "# $spec_id: "*) ;;
    *)
      spec_fail \
        spec-title \
        "$file" \
        "document title must start with # $spec_id:" \
        "align the H1 with the durable spec ID"
      ;;
  esac

  if ! grep -F "($base)" "$SPEC_ROOT/readme.md" >/dev/null 2>&1; then
    spec_fail \
      missing-index-entry \
      "$file" \
      "numbered spec is not linked from the catalog" \
      "add the exact filename to .agents/specs/readme.md"
  fi
done <"$spec_files"

index_targets="$TMP_ROOT/index-targets"
sed -n 's/.*](\([^)]*\.md\)).*/\1/p' "$SPEC_ROOT/readme.md" >"$index_targets"
while IFS= read -r target; do
  [ -n "$target" ] || continue
  case "$target" in
    http://*|https://*) continue ;;
  esac
  if [ ! -f "$SPEC_ROOT/$target" ]; then
    spec_fail \
      spec-index-reference \
      .agents/specs/readme.md \
      "catalog link $target does not resolve" \
      "point the index at an existing flat numbered spec"
  fi
done <"$index_targets"

reference_scan="$TMP_ROOT/reference-files"
find "$PROJECT_ROOT" \
  \( -path "$PROJECT_ROOT/.git" -o \
     -path "$PROJECT_ROOT/node_modules" -o \
     -path '*/node_modules' -o \
     -path '*/dist' -o \
     -path '*/.turbo' \) -prune -o \
  -type f \( -name '*.md' -o -name '*.sh' -o -name '*.yml' -o -name '*.yaml' \) -print |
  sort >"$reference_scan"

while IFS= read -r reference_file; do
  [ -n "$reference_file" ] || continue
  if grep -Eq '\.agents/specs/(ai|console|harness|history|landing|mobile|onboarding|product)/' "$reference_file"; then
    spec_fail \
      stale-spec-reference \
      "${reference_file#"$PROJECT_ROOT"/}" \
      "reference points into a removed spec subdirectory" \
      "replace it with the canonical flat priority path"
  fi
  if grep -Eq '\.agents/specs/10[1-7]-' "$reference_file"; then
    spec_fail \
      legacy-spec-reference \
      "${reference_file#"$PROJECT_ROOT"/}" \
      "reference points to a retired legacy-priority spec" \
      "replace it with the migrated priority 001-007 path"
  fi
done <"$reference_scan"

if [ -s "$numbers" ]; then
  max_id=$(sort -n "$numbers" | tail -n 1)
  next_id=$(awk -v value="$max_id" 'BEGIN { printf "SPEC-%03d", value + 1 }')
  if ! grep -F "$next_id" "$SPEC_ROOT/readme.md" >/dev/null 2>&1; then
    spec_fail \
      next-spec-id \
      .agents/specs/readme.md \
      "the next available durable ID should be $next_id" \
      "update the catalog after adding or retiring an ID"
  fi
fi

if [ "$failures" -gt 0 ]; then
  printf 'Spec workflow FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Spec workflow PASS - %s numbered specs\n' "$spec_count"
