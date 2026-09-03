#!/bin/sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

elo_scaffold_usage() {
  cat <<'EOF'
Usage: elo <adr|rule|skill|spec> [lowercase-kebab-name]

Creates the next canonical empty engineering artifact without overwriting files.
EOF
}

elo_scaffold_decimal() {
  elo_scaffold_input=$1
  elo_scaffold_digits=$2
  elo_scaffold_label=$3
  case "$elo_scaffold_input" in
    ''|*[!0-9]*) elo_die "$elo_scaffold_label is not a decimal number: $elo_scaffold_input" ;;
  esac
  elo_scaffold_value=$(printf '%s' "$elo_scaffold_input" | sed 's/^0*//')
  elo_scaffold_value=${elo_scaffold_value:-0}
  [ "${#elo_scaffold_value}" -le "$elo_scaffold_digits" ] ||
    elo_die "$elo_scaffold_label exceeds the supported $elo_scaffold_digits-digit range."
  printf '%s\n' "$elo_scaffold_value"
}

elo_scaffold_next_prefix() {
  elo_scaffold_dir=$1
  elo_scaffold_width=$2
  elo_scaffold_suffix=$3
  elo_scaffold_max=0
  elo_scaffold_seen=' '

  for elo_scaffold_path in "$elo_scaffold_dir"/*"$elo_scaffold_suffix"; do
    [ -f "$elo_scaffold_path" ] || continue
    elo_scaffold_base=${elo_scaffold_path##*/}
    elo_scaffold_prefix=${elo_scaffold_base%%-*}
    [ "${#elo_scaffold_prefix}" -eq "$elo_scaffold_width" ] || continue
    case "$elo_scaffold_prefix" in
      *[!0-9]*) continue ;;
    esac
    elo_scaffold_number=$(elo_scaffold_decimal "$elo_scaffold_prefix" "$elo_scaffold_width" "Artifact prefix")
    case "$elo_scaffold_seen" in
      *" $elo_scaffold_number "*) elo_die "Duplicate artifact prefix: $elo_scaffold_prefix" ;;
    esac
    elo_scaffold_seen="$elo_scaffold_seen$elo_scaffold_number "
    if [ "$elo_scaffold_number" -gt "$elo_scaffold_max" ]; then
      elo_scaffold_max=$elo_scaffold_number
    fi
  done

  elo_scaffold_next=$((elo_scaffold_max + 1))
  case "$elo_scaffold_width" in
    3) [ "$elo_scaffold_next" -le 999 ] || elo_die "Three-digit artifact numbering is exhausted." ;;
    4) [ "$elo_scaffold_next" -le 9999 ] || elo_die "Four-digit artifact numbering is exhausted." ;;
    *) elo_die "Unsupported artifact number width: $elo_scaffold_width" ;;
  esac
  printf "%0${elo_scaffold_width}d\n" "$elo_scaffold_next"
}

elo_scaffold_next_rule_prefix() {
  elo_scaffold_rule_max=0
  elo_scaffold_rule_seen=' '

  for elo_scaffold_path in "$ELO_PROJECT_ROOT"/.agents/rules/*.rule.md; do
    [ -f "$elo_scaffold_path" ] || continue
    elo_scaffold_base=${elo_scaffold_path##*/}
    if ! printf '%s\n' "$elo_scaffold_base" |
      grep -Eq '^[0-9][0-9][0-9]-[a-z0-9]+(-[a-z0-9]+)*\.rule\.md$'
    then
      elo_die "Cannot allocate after malformed rule filename: $(elo_rel "$elo_scaffold_path")."
    fi
    elo_scaffold_prefix=${elo_scaffold_base%%-*}
    elo_scaffold_number=$(elo_scaffold_decimal "$elo_scaffold_prefix" 3 "Rule prefix")
    case "$elo_scaffold_rule_seen" in
      *" $elo_scaffold_number "*) elo_die "Duplicate rule prefix: $elo_scaffold_prefix" ;;
    esac
    elo_scaffold_rule_seen="$elo_scaffold_rule_seen$elo_scaffold_number "
    if [ "$elo_scaffold_number" -gt "$elo_scaffold_rule_max" ]; then
      elo_scaffold_rule_max=$elo_scaffold_number
    fi
  done

  elo_scaffold_next=$((elo_scaffold_rule_max + 1))
  [ "$elo_scaffold_next" -le 999 ] || elo_die "Three-digit rule numbering is exhausted."
  printf '%03d\n' "$elo_scaffold_next"
}

elo_scaffold_next_spec_id() {
  elo_scaffold_max=0
  elo_scaffold_seen=' '
  for elo_scaffold_path in "$ELO_PROJECT_ROOT"/.agents/specs/*.spec.md; do
    [ -f "$elo_scaffold_path" ] || continue
    elo_scaffold_id=$(sed -n 's/^id:[[:space:]]*//p' "$elo_scaffold_path" | sed -n '1p')
    printf '%s\n' "$elo_scaffold_id" | grep -Eq '^SPEC-[0-9][0-9][0-9]$' ||
      elo_die "Cannot allocate after malformed spec ID in $(elo_rel "$elo_scaffold_path")."
    elo_scaffold_number=$(elo_scaffold_decimal "${elo_scaffold_id#SPEC-}" 3 "SPEC durable ID")
    case "$elo_scaffold_seen" in
      *" $elo_scaffold_number "*) elo_die "Duplicate SPEC durable ID: $elo_scaffold_id" ;;
    esac
    elo_scaffold_seen="$elo_scaffold_seen$elo_scaffold_number "
    if [ "$elo_scaffold_number" -gt "$elo_scaffold_max" ]; then
      elo_scaffold_max=$elo_scaffold_number
    fi
  done
  elo_scaffold_next=$((elo_scaffold_max + 1))
  [ "$elo_scaffold_next" -le 999 ] || elo_die "SPEC durable-ID numbering is exhausted."
  printf 'SPEC-%03d\n' "$elo_scaffold_next"
}

elo_scaffold_render() {
  elo_scaffold_template=$1
  elo_scaffold_target=$2
  elo_scaffold_adr_number=$3
  elo_scaffold_spec_id=$4
  elo_scaffold_skill_name=$5
  elo_scaffold_date=$6
  elo_scaffold_parent=${elo_scaffold_target%/*}

  [ -f "$elo_scaffold_template" ] || elo_die "Artifact template is missing: $(elo_rel "$elo_scaffold_template")"
  [ ! -e "$elo_scaffold_target" ] || elo_die "Artifact already exists: $(elo_rel "$elo_scaffold_target")" 2
  mkdir -p "$elo_scaffold_parent" || elo_die "Cannot create artifact directory: $(elo_rel "$elo_scaffold_parent")"

  elo_scaffold_attempt=0
  elo_scaffold_temp_dir="$elo_scaffold_parent/.elo-scaffold.$$"
  while ! (umask 077 && mkdir "$elo_scaffold_temp_dir") 2>/dev/null; do
    elo_scaffold_attempt=$((elo_scaffold_attempt + 1))
    [ "$elo_scaffold_attempt" -lt 10 ] || elo_die "Cannot reserve a private artifact staging directory."
    elo_scaffold_temp_dir="$elo_scaffold_parent/.elo-scaffold.$$.$elo_scaffold_attempt"
  done
  elo_scaffold_temp="$elo_scaffold_temp_dir/artifact"
  elo_scaffold_cleanup() {
    rm -f "$elo_scaffold_temp"
    rmdir "$elo_scaffold_temp_dir" 2>/dev/null || :
  }
  trap elo_scaffold_cleanup 0 1 2 15
  if ! sed \
    -e "s/{{ADR_NUMBER}}/$elo_scaffold_adr_number/g" \
    -e "s/{{SPEC_ID}}/$elo_scaffold_spec_id/g" \
    -e "s/{{SKILL_NAME}}/$elo_scaffold_skill_name/g" \
    -e "s/{{DATE}}/$elo_scaffold_date/g" \
    "$elo_scaffold_template" >"$elo_scaffold_temp"
  then
    elo_die "Cannot render artifact template."
  fi
  chmod 644 "$elo_scaffold_temp" || elo_die "Cannot set artifact permissions."
  if ! ln "$elo_scaffold_temp" "$elo_scaffold_target" 2>/dev/null; then
    [ ! -e "$elo_scaffold_target" ] ||
      elo_die "Artifact already exists: $(elo_rel "$elo_scaffold_target")" 2
    elo_die "Cannot publish the generated artifact."
  fi
  rm -f "$elo_scaffold_temp"
  rmdir "$elo_scaffold_temp_dir" 2>/dev/null || :
  trap - 0 1 2 15
  elo_print_success "Created $(elo_rel "$elo_scaffold_target")"
}

elo_scaffold_kind=${1:-}
[ "$#" -eq 0 ] || shift

case "${1:-}" in
  --help|-h)
    [ "$#" -eq 1 ] || elo_die "Scaffold help does not accept additional arguments." 2
    elo_scaffold_usage
    exit 0
    ;;
esac

[ "$#" -le 1 ] || elo_die "Artifact commands accept at most one name." 2
elo_scaffold_slug=${1:-new-$elo_scaffold_kind}
printf '%s\n' "$elo_scaffold_slug" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$' ||
  elo_die "Artifact name must be lowercase kebab-case: $elo_scaffold_slug" 2

elo_scaffold_prompt_root="$ELO_PROJECT_ROOT/.agents/prompts"
elo_scaffold_date=$(date -u +%Y-%m-%d)
elo_scaffold_adr_number=
elo_scaffold_spec_id=
elo_scaffold_skill_name=

case "$elo_scaffold_kind" in
  adr)
    elo_scaffold_adr_number=$(elo_scaffold_next_prefix "$ELO_PROJECT_ROOT/.agents/adrs" 4 .adr.md)
    elo_scaffold_template="$elo_scaffold_prompt_root/adr.prompt.md"
    elo_scaffold_target="$ELO_PROJECT_ROOT/.agents/adrs/$elo_scaffold_adr_number-$elo_scaffold_slug.adr.md"
    ;;
  rule)
    elo_scaffold_rule_number=$(elo_scaffold_next_rule_prefix)
    elo_scaffold_template="$elo_scaffold_prompt_root/rule.prompt.md"
    elo_scaffold_target="$ELO_PROJECT_ROOT/.agents/rules/$elo_scaffold_rule_number-$elo_scaffold_slug.rule.md"
    ;;
  skill)
    elo_scaffold_skill_name=$elo_scaffold_slug
    elo_scaffold_template="$elo_scaffold_prompt_root/skill.prompt.md"
    elo_scaffold_target="$ELO_PROJECT_ROOT/.agents/skills/$elo_scaffold_slug/SKILL.md"
    ;;
  spec)
    elo_scaffold_spec_number=$(elo_scaffold_next_prefix "$ELO_PROJECT_ROOT/.agents/specs" 3 .spec.md)
    elo_scaffold_spec_id=$(elo_scaffold_next_spec_id)
    elo_scaffold_template="$elo_scaffold_prompt_root/spec.prompt.md"
    elo_scaffold_target="$ELO_PROJECT_ROOT/.agents/specs/$elo_scaffold_spec_number-$elo_scaffold_slug.spec.md"
    ;;
  *)
    elo_scaffold_usage >&2
    exit 2
    ;;
esac

elo_log "scaffolding $elo_scaffold_kind at $(elo_rel "$elo_scaffold_target")"
elo_scaffold_render \
  "$elo_scaffold_template" \
  "$elo_scaffold_target" \
  "$elo_scaffold_adr_number" \
  "$elo_scaffold_spec_id" \
  "$elo_scaffold_skill_name" \
  "$elo_scaffold_date"
