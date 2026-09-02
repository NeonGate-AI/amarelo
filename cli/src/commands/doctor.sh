#!/usr/bin/env sh
set -u
. "$ELO_CLI_DIR/core/common.sh"

ci=false
for arg in "$@"; do
  [ "$arg" = "--ci" ] && ci=true
done

failures=0
pass() { printf 'PASS  %s%s\n' "$1" "${2:+ — $2}"; }
fail() { printf 'FAIL  %s%s\n' "$1" "${2:+ — $2}"; [ -z "${3:-}" ] || printf '      fix: %s\n' "$3"; failures=$((failures + 1)); }

printf 'Elo doctor\n'

if elo_has node; then
  node_version="$(node --version 2>/dev/null || true)"
  node_major="$(printf '%s' "$node_version" | sed -E 's/^v([0-9]+).*/\1/')"
  [ "$node_major" = "24" ] && pass node "$node_version" || fail node "$node_version" "Install Node.js 24."
else
  fail node "not available" "Install Node.js 24."
fi

expected_pnpm=""
if elo_has node; then
  package_manager="$(elo_package_value packageManager 2>/dev/null || true)"
  case "$package_manager" in pnpm@*) expected_pnpm="${package_manager#pnpm@}" ;; esac
fi
if elo_has pnpm; then
  pnpm_version="$(pnpm --version 2>/dev/null || true)"
  if [ -z "$expected_pnpm" ] || [ "$pnpm_version" = "$expected_pnpm" ]; then pass pnpm "$pnpm_version"; else fail pnpm "$pnpm_version (expected $expected_pnpm)" "Activate the repository pnpm version."; fi
else
  fail pnpm "not available" "Enable Corepack and activate the repository pnpm version."
fi

if elo_has git; then pass git "$(git --version 2>/dev/null || true)"; else fail git "not available" "Install Git."; fi

if elo_has node; then
  for package_name in typescript @biomejs/biome turbo @commitlint/cli husky lint-staged; do
    actual="$(elo_local_package_version "$package_name" 2>/dev/null || true)"
    if [ -n "$actual" ]; then pass "$package_name" "$actual"; else fail "$package_name" "not installed" "Run pnpm install --frozen-lockfile."; fi
  done
fi

if elo_has docker; then
  pass docker "$(docker --version 2>/dev/null || true)"
  if docker compose version >/dev/null 2>&1; then pass docker-compose "$(docker compose version 2>/dev/null | head -n 1)"; else fail docker-compose "not available" "Install/enable Docker Compose v2."; fi
  if docker info >/dev/null 2>&1; then pass docker-daemon reachable; else fail docker-daemon unreachable "Start the Docker daemon."; fi
else
  fail docker "not available" "Install Docker."
  fail docker-compose "not available" "Install/enable Docker Compose v2."
  fail docker-daemon unreachable "Start the Docker daemon after installing Docker."
fi

[ -f "$ELO_PROJECT_ROOT/pnpm-lock.yaml" ] && pass lockfile pnpm-lock.yaml || fail lockfile missing "Restore pnpm-lock.yaml."
[ -d "$ELO_PROJECT_ROOT/node_modules" ] && pass install-state node_modules || fail install-state missing "Run pnpm install --frozen-lockfile."
[ -f "$ELO_PROJECT_ROOT/commitlint.config.js" ] && pass commitlint-config commitlint.config.js || fail commitlint-config missing "Restore Commitlint configuration."
[ -f "$ELO_PROJECT_ROOT/.husky/pre-commit" ] && pass husky-pre-commit .husky/pre-commit || fail husky-pre-commit missing "Run ./elo git setup."
[ -f "$ELO_PROJECT_ROOT/.husky/commit-msg" ] && pass husky-commit-msg .husky/commit-msg || fail husky-commit-msg missing "Run ./elo git setup."
[ -f "$ELO_PROJECT_ROOT/workspaces/memory-nucleus/src/infrastructure/database/schema.sql" ] && pass memory-schema schema.sql || fail memory-schema missing "Restore the Memory Nucleus schema."
[ -f "$ELO_PROJECT_ROOT/.audit/architecture.script.mjs" ] && pass architecture-audit .audit/architecture.script.mjs || fail architecture-audit missing "Restore the temporary architecture checker."
[ -f "$ELO_PROJECT_ROOT/.audit/memory-invariants.script.mjs" ] && pass memory-audit .audit/memory-invariants.script.mjs || fail memory-audit missing "Restore the temporary memory checker."

if [ "$ci" = false ]; then
  templates="$(elo_find_env_templates)"
  if [ -n "$templates" ]; then
    while IFS= read -r template; do
      [ -n "$template" ] || continue
      target="$(dirname "$template")/.env"
      [ -f "$target" ] || printf 'WARN  env target missing — %s (run ./elo env setup)\n' "$(elo_rel "$template")"
    done <<EOF
$templates
EOF
  fi
fi

if [ "$failures" -gt 0 ]; then
  printf 'Elo doctor FAIL — %s required check(s) failed\n' "$failures" >&2
  exit 1
fi
printf 'Elo doctor PASS\n'
