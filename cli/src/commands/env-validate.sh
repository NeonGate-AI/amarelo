#!/usr/bin/env sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

failures=0
templates="$(elo_find_env_templates)"
old_ifs="$IFS"; IFS='\n'
for template in $templates; do
  [ -n "$template" ] || continue
  target="$(dirname "$template")/.env"
  if [ ! -f "$target" ]; then
    printf 'missing %s\n' "$(elo_rel "$target")" >&2
    failures=$((failures + 1))
    continue
  fi
  keys="$(sed -n -E 's/^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=.*/\1/p' "$template" | sort -u)"
  key_ifs="$IFS"; IFS='\n'
  for key in $keys; do
    [ -n "$key" ] || continue
    if ! grep -Eq "^[[:space:]]*${key}=" "$target"; then
      printf '%s missing key %s\n' "$(elo_rel "$target")" "$key" >&2
      failures=$((failures + 1))
    fi
  done
  IFS="$key_ifs"
done
IFS="$old_ifs"

[ "$failures" -eq 0 ] || exit 1
printf 'Elo env validation PASS\n'
