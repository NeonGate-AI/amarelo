#!/usr/bin/env sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

created=0
templates="$(elo_find_env_templates)"
old_ifs="$IFS"; IFS='\n'
for template in $templates; do
  [ -n "$template" ] || continue
  target="$(dirname "$template")/.env"
  if [ ! -f "$target" ]; then
    cp "$template" "$target"
    printf 'created %s\n' "$(elo_rel "$target")"
    created=$((created + 1))
  fi
done
IFS="$old_ifs"
printf 'Elo env setup complete (%s created).\n' "$created"
