#!/usr/bin/env sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

product=""
target_path=""
editor=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --path) shift; [ "$#" -gt 0 ] || elo_die '--path requires a value'; target_path="$1" ;;
    --editor) shift; [ "$#" -gt 0 ] || elo_die '--editor requires a value'; editor="$1" ;;
    --help|-h) echo 'Usage: ./elo changelog <product> [--path <file>] [--editor <command>]'; exit 0 ;;
    --*) elo_die "Unknown changelog option: $1" ;;
    *) [ -z "$product" ] || elo_die 'Only one product slug is accepted'; product="$1" ;;
  esac
  shift
done

[ -n "$product" ] || elo_die 'Usage: ./elo changelog <product> [--path <file>] [--editor <command>]'
printf '%s' "$product" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || elo_die 'Product must be a lowercase slug.'

if [ -z "$target_path" ]; then
  target_path="content/$product/changelog.mdx"
  [ -d "$ELO_PROJECT_ROOT/content/$product" ] || elo_die "Docs product directory does not exist: content/$product"
fi
case "$target_path" in /*|../*|*/../*|*/..) elo_die 'Changelog target must stay inside the project.' ;; esac
target="$ELO_PROJECT_ROOT/$target_path"
mkdir -p "$(dirname "$target")"

if [ ! -f "$target" ]; then
  title="$(printf '%s' "$product" | awk -F- '{for(i=1;i<=NF;i++){printf "%s%s", toupper(substr($i,1,1)) substr($i,2), (i<NF?" ":"")}}')"
  [ "$product" = amarelo ] && title=Amarelo
  cat > "$target" <<EOF
# $title Changelog

## Unreleased

### Added

- 

### Changed

- 

### Fixed

- 

### Removed

- 
EOF
elif ! grep -Eq '^##[[:space:]]+Unreleased[[:space:]]*$' "$target"; then
  cat >> "$target" <<'EOF'

## Unreleased

### Added

- 

### Changed

- 

### Fixed

- 

### Removed

- 
EOF
fi
printf 'Prepared %s\n' "$target_path"

if [ -z "$editor" ]; then
  editor="${VISUAL:-${EDITOR:-}}"
  [ -n "$editor" ] || { command -v code >/dev/null 2>&1 && editor='code --wait'; }
  [ -n "$editor" ] || { command -v nano >/dev/null 2>&1 && editor=nano; }
  [ -n "$editor" ] || { command -v vim >/dev/null 2>&1 && editor=vim; }
fi
[ -n "$editor" ] || elo_die 'No editor found. Set $VISUAL/$EDITOR or pass --editor.'
sh -c "$editor \"\$1\"" sh "$target"
