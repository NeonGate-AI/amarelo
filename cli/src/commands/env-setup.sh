#!/usr/bin/env sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

created=0
templates="$(elo_find_env_templates)"
if [ -n "$templates" ]; then
  while IFS= read -r template; do
    [ -n "$template" ] || continue
    target="$(dirname "$template")/.env"
    if [ ! -f "$target" ]; then
      cp "$template" "$target"
      printf 'created %s\n' "$(elo_rel "$target")"
      created=$((created + 1))
    fi
  done <<EOF
$templates
EOF
fi
printf 'Elo env setup complete (%s created).\n' "$created"
