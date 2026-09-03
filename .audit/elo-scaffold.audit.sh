#!/bin/sh
set -u

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
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-elo-scaffold.$$"
FIXTURE_ROOT="$TMP_ROOT/checkout"
LAUNCHER="$FIXTURE_ROOT/cli/elo"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup 0 1 2 15

failures=0

scaffold_fail() {
  failures=$((failures + 1))
  printf '%s\n' "- $1: $2" >&2
}

require_file() {
  [ -f "$1" ] || scaffold_fail "$2" "expected generated file is missing"
}

require_line() {
  scaffold_file=$1
  scaffold_line=$2
  scaffold_owner=$3
  grep -Fx "$scaffold_line" "$scaffold_file" >/dev/null 2>&1 ||
    scaffold_fail "$scaffold_owner" "missing canonical line: $scaffold_line"
}

require_output_path() {
  scaffold_output=$1
  scaffold_path=$2
  grep -F "$scaffold_path" "$scaffold_output" >/dev/null 2>&1 ||
    scaffold_fail cli/src/commands/scaffold.sh "success output did not report $scaffold_path"
}

require_no_tokens() {
  scaffold_file=$1
  scaffold_owner=$2
  if grep -Eq '\{\{[A-Z0-9_]+\}\}' "$scaffold_file"; then
    scaffold_fail "$scaffold_owner" "generated artifact contains an unreplaced template token"
  fi
}

mkdir -p \
  "$FIXTURE_ROOT/.agents/adrs" \
  "$FIXTURE_ROOT/.agents/rules" \
  "$FIXTURE_ROOT/.agents/specs" \
  "$FIXTURE_ROOT/.agents/skills" || {
  printf 'Elo scaffold audit FAIL: cannot create fixture\n' >&2
  exit 1
}
cp -R "$PROJECT_ROOT/cli" "$FIXTURE_ROOT/cli" || {
  printf 'Elo scaffold audit FAIL: cannot copy Elo into fixture\n' >&2
  exit 1
}
cp -R "$PROJECT_ROOT/.agents/prompts" "$FIXTURE_ROOT/.agents/prompts" || {
  printf 'Elo scaffold audit FAIL: cannot copy scaffold templates into fixture\n' >&2
  exit 1
}

: >"$FIXTURE_ROOT/.agents/adrs/0025-existing.adr.md"
scaffold_rule_number=1
for scaffold_rule in architecture code-style context-engineering import-boundaries markdown memory-nucleus package-ownership product-safety-and-privacy react-and-next source-organization spec-driven-development; do
  scaffold_rule_prefix=$(printf '%03d' "$scaffold_rule_number")
  : >"$FIXTURE_ROOT/.agents/rules/$scaffold_rule_prefix-$scaffold_rule.rule.md"
  scaffold_rule_number=$((scaffold_rule_number + 1))
done
cat >"$FIXTURE_ROOT/.agents/specs/030-existing.spec.md" <<'SPEC'
---
id: SPEC-030
---
SPEC

if ! "$LAUNCHER" --help >"$TMP_ROOT/help.out" 2>"$TMP_ROOT/help.err"; then
  scaffold_fail cli/src/commands/help.sh "global help failed"
else
  for help_line in \
    '🧱 adr [name]' \
    '📏 rule [name]' \
    '🧰 skill [name]' \
    '📋 spec [name]'
  do
    grep -F "$help_line" "$TMP_ROOT/help.out" >/dev/null 2>&1 ||
      scaffold_fail cli/src/commands/help.sh "missing scaffold command: $help_line"
  done
fi

if ! "$LAUNCHER" spec >"$TMP_ROOT/default-spec.out" 2>&1; then
  scaffold_fail cli/src/commands/scaffold.sh "elo spec failed"
fi
if ! "$LAUNCHER" adr >"$TMP_ROOT/default-adr.out" 2>&1; then
  scaffold_fail cli/src/commands/scaffold.sh "elo adr failed"
fi
if ! "$LAUNCHER" rule >"$TMP_ROOT/default-rule.out" 2>&1; then
  scaffold_fail cli/src/commands/scaffold.sh "elo rule failed"
fi
if ! "$LAUNCHER" skill >"$TMP_ROOT/default-skill.out" 2>&1; then
  scaffold_fail cli/src/commands/scaffold.sh "elo skill failed"
fi

default_spec="$FIXTURE_ROOT/.agents/specs/031-new-spec.spec.md"
default_adr="$FIXTURE_ROOT/.agents/adrs/0026-new-adr.adr.md"
default_rule="$FIXTURE_ROOT/.agents/rules/012-new-rule.rule.md"
default_skill="$FIXTURE_ROOT/.agents/skills/new-skill/SKILL.md"

require_file "$default_spec" cli/src/commands/scaffold.sh
require_file "$default_adr" cli/src/commands/scaffold.sh
require_file "$default_rule" cli/src/commands/scaffold.sh
require_file "$default_skill" cli/src/commands/scaffold.sh
require_output_path "$TMP_ROOT/default-spec.out" '.agents/specs/031-new-spec.spec.md'
require_output_path "$TMP_ROOT/default-adr.out" '.agents/adrs/0026-new-adr.adr.md'
require_output_path "$TMP_ROOT/default-rule.out" '.agents/rules/012-new-rule.rule.md'
require_output_path "$TMP_ROOT/default-skill.out" '.agents/skills/new-skill/SKILL.md'

if [ -f "$default_spec" ]; then
  for required in \
    'id: SPEC-031' \
    'status: draft' \
    'mode: prospective' \
    '# SPEC-031:' \
    '## Problem Statement' \
    '## Solution' \
    '## User Stories' \
    '## Scope' \
    '## Implementation Decisions' \
    '## Testing Decisions' \
    '### Primary seam' \
    '### Secondary seams' \
    '### Fixtures and privacy' \
    '### Required validation' \
    '## Acceptance Criteria' \
    '## Failure Behavior' \
    '## Out of Scope' \
    '## Evidence and Promotion' \
    '## Further Notes'
  do
    require_line "$default_spec" "$required" .agents/prompts/spec.prompt.md
  done
  spec_created=$(sed -n 's/^created:[[:space:]]*//p' "$default_spec" | sed -n '1p')
  spec_updated=$(sed -n 's/^updated:[[:space:]]*//p' "$default_spec" | sed -n '1p')
  if [ "$spec_created" != "$spec_updated" ] ||
    ! printf '%s\n' "$spec_created" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  then
    scaffold_fail .agents/prompts/spec.prompt.md "generated spec dates are missing or inconsistent"
  fi
  require_no_tokens "$default_spec" .agents/prompts/spec.prompt.md
fi

if [ -f "$default_adr" ]; then
  for required in \
    '# ADR 0026:' \
    '## Status' \
    '## Context' \
    '## Decision' \
    '## Consequences'
  do
    require_line "$default_adr" "$required" .agents/prompts/adr.prompt.md
  done
  require_no_tokens "$default_adr" .agents/prompts/adr.prompt.md
fi

if [ -f "$default_rule" ]; then
  for required in \
    'version:' \
    'extends:' \
    'name:' \
    'description:' \
    'alwaysApply:' \
    'priority:' \
    'tags:' \
    '#' \
    '## Purpose' \
    '## Rule' \
    '## Mechanical Enforcement'
  do
    require_line "$default_rule" "$required" .agents/prompts/rule.prompt.md
  done
  require_no_tokens "$default_rule" .agents/prompts/rule.prompt.md
fi

if [ -f "$default_skill" ]; then
  for required in \
    'name: new-skill' \
    'description:' \
    'disable-model-invocation:' \
    '#' \
    '## Purpose' \
    '## Procedure' \
    '## Completion criterion'
  do
    require_line "$default_skill" "$required" .agents/prompts/skill.prompt.md
  done
  require_no_tokens "$default_skill" .agents/prompts/skill.prompt.md
fi

if ! "$LAUNCHER" spec custom-spec >"$TMP_ROOT/custom-spec.out" 2>&1 ||
  [ ! -f "$FIXTURE_ROOT/.agents/specs/032-custom-spec.spec.md" ]
then
  scaffold_fail cli/src/commands/scaffold.sh "elo spec did not accept a custom slug"
elif ! grep -Fx 'id: SPEC-032' "$FIXTURE_ROOT/.agents/specs/032-custom-spec.spec.md" >/dev/null 2>&1; then
  scaffold_fail cli/src/commands/scaffold.sh "custom spec did not receive the next durable ID"
fi

if ! "$LAUNCHER" adr custom-adr >"$TMP_ROOT/custom-adr.out" 2>&1 ||
  [ ! -f "$FIXTURE_ROOT/.agents/adrs/0027-custom-adr.adr.md" ]
then
  scaffold_fail cli/src/commands/scaffold.sh "elo adr did not accept a custom slug"
fi

if ! "$LAUNCHER" rule custom-rule >"$TMP_ROOT/custom-rule.out" 2>&1 ||
  [ ! -f "$FIXTURE_ROOT/.agents/rules/013-custom-rule.rule.md" ]
then
  scaffold_fail cli/src/commands/scaffold.sh "elo rule did not accept a custom slug"
fi

: >"$FIXTURE_ROOT/.agents/rules/legacy.rule.md"
"$LAUNCHER" rule blocked-rule >"$TMP_ROOT/malformed-rule.out" 2>&1
malformed_rule_status=$?
[ "$malformed_rule_status" -ne 0 ] ||
  scaffold_fail cli/src/commands/scaffold.sh "an unnumbered rule catalog entry must fail allocation"
[ ! -e "$FIXTURE_ROOT/.agents/rules/014-blocked-rule.rule.md" ] ||
  scaffold_fail cli/src/commands/scaffold.sh "malformed rule allocation created a target"
grep -F 'malformed rule filename' "$TMP_ROOT/malformed-rule.out" >/dev/null 2>&1 ||
  scaffold_fail cli/src/commands/scaffold.sh "malformed rule failure did not explain the catalog error"
rm -f "$FIXTURE_ROOT/.agents/rules/legacy.rule.md"

: >"$FIXTURE_ROOT/.agents/rules/013-duplicate.rule.md"
"$LAUNCHER" rule blocked-rule >"$TMP_ROOT/duplicate-rule.out" 2>&1
duplicate_rule_status=$?
[ "$duplicate_rule_status" -ne 0 ] ||
  scaffold_fail cli/src/commands/scaffold.sh "a duplicate rule identity must fail allocation"
[ ! -e "$FIXTURE_ROOT/.agents/rules/014-blocked-rule.rule.md" ] ||
  scaffold_fail cli/src/commands/scaffold.sh "duplicate rule allocation created a target"
grep -F 'Duplicate rule prefix: 013' "$TMP_ROOT/duplicate-rule.out" >/dev/null 2>&1 ||
  scaffold_fail cli/src/commands/scaffold.sh "duplicate rule failure did not identify the prefix"
rm -f "$FIXTURE_ROOT/.agents/rules/013-duplicate.rule.md"

if ! "$LAUNCHER" skill custom-skill >"$TMP_ROOT/custom-skill.out" 2>&1 ||
  [ ! -f "$FIXTURE_ROOT/.agents/skills/custom-skill/SKILL.md" ]
then
  scaffold_fail cli/src/commands/scaffold.sh "elo skill did not accept a custom slug"
elif ! grep -Fx 'name: custom-skill' "$FIXTURE_ROOT/.agents/skills/custom-skill/SKILL.md" >/dev/null 2>&1; then
  scaffold_fail cli/src/commands/scaffold.sh "custom skill name was not rendered"
fi

if [ -f "$default_skill" ]; then
  cp "$default_skill" "$TMP_ROOT/new-skill.before"
  "$LAUNCHER" skill new-skill >"$TMP_ROOT/overwrite.out" 2>&1
  overwrite_status=$?
  [ "$overwrite_status" -eq 2 ] ||
    scaffold_fail cli/src/commands/scaffold.sh "existing targets must be rejected with status 2"
  cmp -s "$TMP_ROOT/new-skill.before" "$default_skill" ||
    scaffold_fail cli/src/commands/scaffold.sh "overwrite rejection changed the existing artifact"
fi

for scaffold_kind in adr rule skill spec; do
  "$LAUNCHER" "$scaffold_kind" 'Bad Name' >"$TMP_ROOT/$scaffold_kind-invalid.out" 2>&1
  invalid_status=$?
  [ "$invalid_status" -eq 2 ] ||
    scaffold_fail cli/src/commands/scaffold.sh "$scaffold_kind invalid slug must exit 2"

  "$LAUNCHER" "$scaffold_kind" one two >"$TMP_ROOT/$scaffold_kind-extra.out" 2>&1
  extra_status=$?
  [ "$extra_status" -eq 2 ] ||
    scaffold_fail cli/src/commands/scaffold.sh "$scaffold_kind extra arguments must exit 2"
done

mv "$FIXTURE_ROOT/.agents/prompts/adr.prompt.md" "$TMP_ROOT/adr.prompt.md"
"$LAUNCHER" adr missing-template >"$TMP_ROOT/missing-template.out" 2>&1
missing_template_status=$?
[ "$missing_template_status" -ne 0 ] ||
  scaffold_fail cli/src/commands/scaffold.sh "a missing template must fail"
[ ! -e "$FIXTURE_ROOT/.agents/adrs/0028-missing-template.adr.md" ] ||
  scaffold_fail cli/src/commands/scaffold.sh "missing-template failure created a target"
mv "$TMP_ROOT/adr.prompt.md" "$FIXTURE_ROOT/.agents/prompts/adr.prompt.md"

if find "$FIXTURE_ROOT/.agents" \
  \( -type f -name '*.tmp.*' -o -type d -name '.elo-scaffold.*' \) -print |
  grep . >/dev/null 2>&1
then
  scaffold_fail cli/src/commands/scaffold.sh "a failure left scaffold staging state"
fi

if [ "$failures" -gt 0 ]; then
  printf 'Elo scaffold audit FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Elo scaffold audit PASS\n'
printf 'default allocation and templates: PASS\n'
printf 'custom slugs and argument validation: PASS\n'
printf 'non-overwrite and failure cleanup: PASS\n'
