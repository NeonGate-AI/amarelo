#!/usr/bin/env sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

prepare=false
for arg in "$@"; do [ "$arg" = "--prepare" ] && prepare=true; done

if ! elo_git_checkout; then
  if [ "$prepare" = true ]; then
    printf 'Elo Git setup skipped: no Git checkout.\n'
    exit 0
  fi
  elo_die "git setup must run inside the Amarelo Git checkout."
fi

mkdir -p "$ELO_PROJECT_ROOT/.husky"
cat > "$ELO_PROJECT_ROOT/.husky/pre-commit" <<'EOF'
#!/usr/bin/env sh
exec ./elo git pre-commit "$@"
EOF
cat > "$ELO_PROJECT_ROOT/.husky/commit-msg" <<'EOF'
#!/usr/bin/env sh
exec ./elo git commit-msg "$@"
EOF
chmod +x "$ELO_PROJECT_ROOT/.husky/pre-commit" "$ELO_PROJECT_ROOT/.husky/commit-msg"

cd "$ELO_PROJECT_ROOT"
pnpm exec husky >/dev/null
printf 'Elo Git platform ready.\n'
