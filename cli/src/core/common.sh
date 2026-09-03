#!/bin/sh

: "${ELO_PROJECT_ROOT:?ELO_PROJECT_ROOT must be set by cli/src/elo.sh}"
: "${ELO_CLI_DIR:?ELO_CLI_DIR must be set by cli/src/elo.sh}"

. "$ELO_CLI_DIR/core/output.sh"

elo_die() {
  elo_message=$1
  elo_status=${2:-1}
  elo_print_error "Elo: $elo_message"
  exit "$elo_status"
}

elo_warn() {
  elo_print_warning "Elo: $*"
}

elo_has() {
  command -v "$1" >/dev/null 2>&1
}

elo_need() {
  elo_has "$1" || elo_die "Required command not found: $1" 127
}

elo_rel() {
  case "$1" in
    "$ELO_PROJECT_ROOT"/*)
      printf '%s\n' "${1#"$ELO_PROJECT_ROOT"/}"
      ;;
    *)
      printf '%s\n' "$1"
      ;;
  esac
}

elo_package_value() {
  elo_key=$1
  node - "$ELO_PROJECT_ROOT/package.json" "$elo_key" <<'NODE'
const fs = require('node:fs')
const [file, key] = process.argv.slice(2)
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
let value = data
for (const part of key.split('.')) value = value == null ? undefined : value[part]
if (value == null) process.exit(1)
process.stdout.write(typeof value === 'string' ? value : JSON.stringify(value))
NODE
}

elo_project_version() {
  elo_package_value version
}

elo_local_package_version() {
  elo_package_name=$1
  node - "$ELO_PROJECT_ROOT" "$elo_package_name" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const [root, name] = process.argv.slice(2)
const file = path.join(root, 'node_modules', ...name.split('/'), 'package.json')
try {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (typeof manifest.version !== 'string') process.exit(1)
  process.stdout.write(manifest.version)
} catch {
  process.exit(1)
}
NODE
}

elo_find_env_templates() {
  find "$ELO_PROJECT_ROOT" \
    \( -name .git -o -name node_modules -o -name .next -o -name .turbo -o -name dist -o -name coverage -o -name .audit \) -prune \
    -o -type f \( -name .env.example -o -name .env.template \) -print
}

elo_git_checkout() {
  git -C "$ELO_PROJECT_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

elo_default_bin_dir() {
  if [ -n "${ELO_BIN_DIR:-}" ]; then
    printf '%s\n' "$ELO_BIN_DIR"
  elif [ -n "${PNPM_HOME:-}" ]; then
    printf '%s\n' "$PNPM_HOME"
  elif [ -n "${XDG_BIN_HOME:-}" ]; then
    printf '%s\n' "$XDG_BIN_HOME"
  elif [ -n "${HOME:-}" ]; then
    printf '%s\n' "$HOME/.local/bin"
  else
    return 1
  fi
}

elo_path_contains() (
  elo_path_wanted=$1
  elo_path_rest=${PATH:-}

  while :; do
    case "$elo_path_rest" in
      *:*)
        elo_path_entry=${elo_path_rest%%:*}
        elo_path_rest=${elo_path_rest#*:}
        ;;
      *)
        elo_path_entry=$elo_path_rest
        elo_path_rest=
        ;;
    esac

    [ "$elo_path_entry" = "$elo_path_wanted" ] && return 0
    [ -n "$elo_path_rest" ] || return 1
  done
)

elo_shell_quote() {
  printf "'"
  printf '%s' "$1" | sed "s/'/'\\\\''/g"
  printf "'"
}
