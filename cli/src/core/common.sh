#!/usr/bin/env sh

: "${ELO_PROJECT_ROOT:?ELO_PROJECT_ROOT must be set by cli/src/elo.sh}"
: "${ELO_CLI_DIR:?ELO_CLI_DIR must be set by cli/src/elo.sh}"

elo_die() {
  echo "Elo: $*" >&2
  exit 1
}

elo_has() {
  command -v "$1" >/dev/null 2>&1
}

elo_rel() {
  case "$1" in
    "$ELO_PROJECT_ROOT"/*) printf '%s\n' "${1#"$ELO_PROJECT_ROOT"/}" ;;
    *) printf '%s\n' "$1" ;;
  esac
}

elo_package_value() {
  key="$1"
  node - "$ELO_PROJECT_ROOT/package.json" "$key" <<'NODE'
const fs = require('node:fs')
const [file, key] = process.argv.slice(2)
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
let value = data
for (const part of key.split('.')) value = value == null ? undefined : value[part]
if (value == null) process.exit(1)
process.stdout.write(typeof value === 'string' ? value : JSON.stringify(value))
NODE
}

elo_local_package_version() {
  package_name="$1"
  node - "$ELO_PROJECT_ROOT" "$package_name" <<'NODE'
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
