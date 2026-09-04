#!/bin/sh
set -u
. "$ELO_CLI_DIR/core/common.sh"

elo_log "doctor module initialized"
ci=false
while [ "$#" -gt 0 ]; do
  case "$1" in
    --ci) ci=true ;;
    --help|-h)
      printf 'Usage: elo doctor [--ci]\n'
      exit 0
      ;;
    *) elo_die "Unknown doctor option: $1" 2 ;;
  esac
  shift
done

failures=0

pass() {
  elo_status_detail=${2:+ — $2}
  printf '%s%s PASS  %s%s%s\n' "$ELO_COLOR_GREEN" "$ELO_ICON_SUCCESS" "$1" "$elo_status_detail" "$ELO_COLOR_RESET"
}

warn() {
  elo_status_detail=${2:+ — $2}
  printf '%s%s WARN  %s%s%s\n' "$ELO_COLOR_YELLOW" "$ELO_ICON_WARNING" "$1" "$elo_status_detail" "$ELO_COLOR_RESET"
}

fail() {
  elo_status_detail=${2:+ — $2}
  printf '%s%s FAIL  %s%s%s\n' "$ELO_COLOR_RED" "$ELO_ICON_ERROR" "$1" "$elo_status_detail" "$ELO_COLOR_RESET"
  [ -z "${3:-}" ] || printf '      fix: %s\n' "$3"
  failures=$((failures + 1))
}

elo_print_logo
printf 'Elo doctor\n'
elo_log "ci=$ci"

if elo_has node; then
  node_version=$(node --version 2>/dev/null || true)
  node_major=$(printf '%s' "$node_version" | sed 's/^v\([0-9][0-9]*\).*/\1/')
  if [ "$node_major" = 24 ]; then
    pass node "$node_version"
  else
    fail node "$node_version" "Install Node.js 24."
  fi
else
  fail node "not available" "Install Node.js 24."
fi

expected_pnpm=
if elo_has node; then
  package_manager=$(elo_package_value packageManager 2>/dev/null || true)
  case "$package_manager" in
    pnpm@*) expected_pnpm=${package_manager#pnpm@} ;;
  esac
fi

if elo_has pnpm; then
  pnpm_version=$(pnpm --version 2>/dev/null || true)
  if [ -z "$expected_pnpm" ] || [ "$pnpm_version" = "$expected_pnpm" ]; then
    pass pnpm "$pnpm_version"
  else
    fail pnpm "$pnpm_version (expected $expected_pnpm)" "Activate the repository pnpm version."
  fi
else
  fail pnpm "not available" "Enable Corepack and activate the repository pnpm version."
fi

if elo_has git; then
  pass git "$(git --version 2>/dev/null || true)"
else
  fail git "not available" "Install Git."
fi

if elo_has node; then
  for package_name in typescript @biomejs/biome turbo @commitlint/cli husky lint-staged; do
    actual=$(elo_local_package_version "$package_name" 2>/dev/null || true)
    if [ -n "$actual" ]; then
      pass "$package_name" "$actual"
    else
      fail "$package_name" "not installed" "Run pnpm install --frozen-lockfile."
    fi
  done
fi

if elo_has docker; then
  pass docker "$(docker --version 2>/dev/null || true)"
  if docker info >/dev/null 2>&1; then
    pass docker-daemon reachable
  else
    fail docker-daemon unreachable "Start the Docker daemon."
  fi
else
  fail docker "not available" "Install Docker."
  fail docker-daemon unreachable "Start the Docker daemon after installing Docker."
fi

if elo_has kubectl; then
  kubectl_version=$(
    kubectl version --client 2>/dev/null |
      sed -n '1p'
  )
  pass kubectl "$kubectl_version"
  if [ "$ci" = false ]; then
    kubernetes_context=$(kubectl config current-context 2>/dev/null || true)
    if [ -n "$kubernetes_context" ]; then
      pass kubernetes-context "$kubernetes_context"
    else
      fail kubernetes-context "not configured" "Select an active Kubernetes context."
    fi
  fi
else
  fail kubectl "not available" "Install kubectl."
fi

if [ ! -f "$ELO_PROJECT_ROOT/pnpm-lock.yaml" ]; then
  fail lockfile-policy "pnpm-lock.yaml missing" "Restore pnpm-lock.yaml or regenerate it intentionally."
elif ! elo_git_checkout; then
  fail lockfile-policy "Git checkout unavailable" "Run Elo from the Amarelo checkout."
elif git -C "$ELO_PROJECT_ROOT" ls-files --error-unmatch -- pnpm-lock.yaml >/dev/null 2>&1; then
  pass lockfile-policy "pnpm-lock.yaml tracked"
else
  fail lockfile-policy "pnpm-lock.yaml is untracked" "Add pnpm-lock.yaml to the repository before using frozen installs."
fi
[ -d "$ELO_PROJECT_ROOT/node_modules" ] &&
  pass install-state node_modules ||
  fail install-state missing "Run pnpm install --frozen-lockfile."
[ -f "$ELO_PROJECT_ROOT/commitlint.config.js" ] &&
  pass commitlint-config commitlint.config.js ||
  fail commitlint-config missing "Restore Commitlint configuration."
[ -f "$ELO_PROJECT_ROOT/.husky/pre-commit" ] &&
  pass husky-pre-commit .husky/pre-commit ||
  fail husky-pre-commit missing "Run elo git setup."
[ -f "$ELO_PROJECT_ROOT/.husky/commit-msg" ] &&
  pass husky-commit-msg .husky/commit-msg ||
  fail husky-commit-msg missing "Run elo git setup."
[ -f "$ELO_PROJECT_ROOT/workspaces/memory-nucleus/src/infrastructure/database/schema.sql" ] &&
  pass memory-schema schema.sql ||
  fail memory-schema missing "Restore the Memory Nucleus schema."

for audit_name in architecture elo-platform import-boundaries memory-invariants runtime specs; do
  audit_path="$ELO_PROJECT_ROOT/.audit/$audit_name.audit.sh"
  if [ -f "$audit_path" ]; then
    pass "$audit_name-audit" ".audit/$audit_name.audit.sh"
  else
    fail "$audit_name-audit" missing "Restore .audit/$audit_name.audit.sh."
  fi
done

if [ "$ci" = false ]; then
  direct_bin=$(elo_default_bin_dir 2>/dev/null || true)
  if [ -n "$direct_bin" ]; then
    direct_target="$direct_bin/elo"
    direct_elo_valid=false
    if [ -f "$direct_target" ] && [ ! -L "$direct_target" ] && [ -x "$direct_target" ]; then
      direct_marker=$(sed -n '2p' "$direct_target" 2>/dev/null || true)
      [ "$direct_marker" = '# managed-by: amarelo-elo' ] && direct_elo_valid=true
    fi

    if [ "$direct_elo_valid" = true ]; then
      pass direct-elo "$direct_target"
    else
      warn direct-elo "not configured; run ./cli/elo setup"
    fi

    if [ -d "$direct_bin" ]; then
      direct_bin=$(CDPATH= cd -P "$direct_bin" && pwd)
      if ! elo_path_contains "$direct_bin"; then
        warn direct-elo-path "$direct_bin is not on PATH"
      fi
    fi
  else
    warn direct-elo "no user binary directory available"
  fi

  templates=$(elo_find_env_templates)
  if [ -n "$templates" ]; then
    while IFS= read -r template; do
      [ -n "$template" ] || continue
      target="$(dirname "$template")/.env"
      [ -f "$target" ] || warn "env target missing" "$(elo_rel "$template") (run elo env setup)"
    done <<EOF
$templates
EOF
  fi
fi

if [ "$failures" -gt 0 ]; then
  elo_print_error "Elo doctor FAIL — $failures required check(s) failed"
  exit 1
fi

elo_print_success "Elo doctor PASS"

