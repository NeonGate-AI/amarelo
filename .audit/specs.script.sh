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
audit_cleanup() {
  rm -rf "$TMP_ROOT"
}

audit_on_signal() {
  trap - 0 1 2 15
  audit_cleanup
  exit 1
}

trap audit_cleanup 0
trap audit_on_signal 1 2 15

failures=0
delivery_count=0

spec_fail() {
  spec_rule=$1
  spec_file=$2
  spec_detail=$3
  spec_fix=$4
  failures=$((failures + 1))
  printf '\n[%s] %s\n  %s\n  fix: %s\n' \
    "$spec_rule" "$spec_file" "$spec_detail" "$spec_fix" >&2
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
  .agents/specs/workflow.md
do
  [ -f "$PROJECT_ROOT/$required_file" ] ||
    spec_fail \
      required-workflow-file \
      "$required_file" \
      "required spec-driven workflow file is missing" \
      "restore the canonical workflow artifact"
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

catalog_priorities="$TMP_ROOT/catalog-priorities"
: >"$catalog_priorities"
for catalog_path in "$SPEC_ROOT"/*.md; do
  [ -f "$catalog_path" ] || continue
  catalog_file=${catalog_path#"$PROJECT_ROOT"/}
  catalog_base=$(basename "$catalog_path")
  case "$catalog_base" in
    readme.md|template.md|workflow.md) continue ;;
  esac
  if ! printf '%s\n' "$catalog_base" |
    grep -Eq '^[0-9][0-9][0-9]-[a-z0-9]+(-[a-z0-9]+)*\.md$'
  then
    spec_fail \
      catalog-filename \
      "$catalog_file" \
      "spec filename must use a three-digit priority and lowercase kebab-case slug" \
      "rename the file to NNN-lowercase-slug.md"
    continue
  fi
  priority=$(printf '%s\n' "$catalog_base" | cut -c 1-3)
  if grep -Fx "$priority" "$catalog_priorities" >/dev/null 2>&1; then
    spec_fail \
      duplicate-priority \
      "$catalog_file" \
      "priority $priority is already assigned" \
      "assign one unique catalog priority"
  else
    printf '%s\n' "$priority" >>"$catalog_priorities"
  fi
  case "$priority" in
    0[0-9][0-9]|1[0-9][0-9]) ;;
    *)
      spec_fail \
        priority-band \
        "$catalog_file" \
        "priority must be in delivery band 001-099 or behavior band 101-199" \
        "choose a priority from the documented catalog bands"
      ;;
  esac
done

delivery_list="$TMP_ROOT/delivery-files"
find "$SPEC_ROOT" -maxdepth 1 -type f \
  -name '0[0-9][0-9]-*.md' -print |
  sort >"$delivery_list"

delivery_count=$(awk 'END { print NR + 0 }' "$delivery_list")
if [ "$delivery_count" -eq 0 ]; then
  spec_fail \
    delivery-spec-presence \
    .agents/specs \
    "no numbered delivery specs were found" \
    "create a SPEC-### document from the canonical template"
fi

ids_file="$TMP_ROOT/ids"
numbers_file="$TMP_ROOT/numbers"
: >"$ids_file"
: >"$numbers_file"

while IFS= read -r path; do
  [ -n "$path" ] || continue
  file=${path#"$PROJECT_ROOT"/}
  base_name=$(basename "$path")
  if ! printf '%s\n' "$base_name" |
    grep -Eq '^0[0-9][0-9]-[a-z0-9]+(-[a-z0-9]+)*\.md$'
  then
    spec_fail \
      spec-filename \
      "$file" \
      "delivery spec filename must use a three-digit priority and lowercase kebab-case slug" \
      "rename the file to NNN-lowercase-slug.md"
  fi
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
        "complete the canonical delivery-spec frontmatter"
    fi
  done

  for key in owners targets context rules adrs skills evidence; do
    count=$(frontmatter_list_count "$path" "$key")
    if [ "$count" -eq 0 ]; then
      spec_fail \
        required-list-metadata \
        "$file" \
        "$key must contain at least one item" \
        "complete the canonical delivery-spec frontmatter"
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
  fi

  if grep -F "${spec_id}	" "$ids_file" >/dev/null 2>&1; then
    first_file=$(awk -F '	' -v id="$spec_id" '$1 == id { print $2; exit }' "$ids_file")
    spec_fail \
      duplicate-spec-id \
      "$file" \
      "$spec_id is already used by $first_file" \
      "assign the next unused sequential delivery ID"
  elif [ -n "$spec_id" ]; then
    printf '%s\t%s\n' "$spec_id" "$file" >>"$ids_file"
  fi

  spec_number=$(printf '%s\n' "$spec_id" | sed -n 's/^SPEC-\([0-9][0-9][0-9]\)$/\1/p')
  [ -n "$spec_number" ] && printf '%s\n' "$spec_number" >>"$numbers_file"

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
    if ! printf '%s\n' "$acceptance" |
      grep -Eq '^- \[[xX]\][[:space:]]+'
    then
      spec_fail \
        implemented-acceptance \
        "$file" \
        "implemented spec has no checked acceptance criteria" \
        "record evidenced completion with checked criteria"
    fi
    if printf '%s\n' "$acceptance" |
      grep -Eq '^- \[ \][[:space:]]+'
    then
      spec_fail \
        implemented-acceptance \
        "$file" \
        "implemented spec still contains unchecked acceptance criteria" \
        "finish, supersede or explicitly remove unmet scope before closure"
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
        "complete the canonical delivery-spec body"
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
done <"$delivery_list"

if [ -s "$numbers_file" ]; then
  max_id=$(sort -n "$numbers_file" | tail -n 1)
  next_id=$(awk -v value="$max_id" 'BEGIN { printf "SPEC-%03d", value + 1 }')
  if ! grep -F "$next_id" "$SPEC_ROOT/readme.md" >/dev/null 2>&1; then
    spec_fail \
      next-spec-id \
      .agents/specs/readme.md \
      "the next available delivery ID should be $next_id" \
      "update the spec index after adding or retiring an ID"
  fi
fi

if [ "$failures" -gt 0 ]; then
  printf 'Spec workflow FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Spec workflow PASS - %s delivery specs\n' "$delivery_count"
