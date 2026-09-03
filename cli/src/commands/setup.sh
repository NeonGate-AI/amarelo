#!/bin/sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

elo_setup_mode=manual
elo_bin_dir=${ELO_BIN_DIR:-}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --bin-dir)
      shift
      [ "$#" -gt 0 ] || elo_die "--bin-dir requires a directory" 2
      elo_bin_dir=$1
      ;;
    --postinstall)
      elo_setup_mode=lifecycle
      ;;
    --postclone)
      elo_setup_mode=lifecycle
      ;;
    --help|-h)
      cat <<'EOF'
Usage:
  elo setup [--bin-dir <directory>]

Environment:
  ELO_BIN_DIR          explicit destination override
  PNPM_HOME            preferred package-manager binary directory
  XDG_BIN_HOME         optional user binary directory
  HOME                 falls back to ~/.local/bin
  ELO_SETUP_DISABLED   set to 1 or true to skip lifecycle installation
EOF
      exit 0
      ;;
    *)
      elo_die "Unknown setup option: $1" 2
      ;;
  esac
  shift
done

case "${ELO_SETUP_DISABLED:-0}" in
  1|true|TRUE|yes|YES)
    printf 'Elo direct command setup skipped: ELO_SETUP_DISABLED is set.\n'
    exit 0
    ;;
esac

if [ "$elo_setup_mode" = lifecycle ] && [ -n "${CI:-}" ]; then
  printf 'Elo direct command setup skipped in CI.\n'
  exit 0
fi

if [ -z "$elo_bin_dir" ]; then
  elo_bin_dir=$(elo_default_bin_dir 2>/dev/null || true)
fi

if [ -z "$elo_bin_dir" ]; then
  if [ "$elo_setup_mode" = lifecycle ]; then
    elo_warn "direct command setup skipped because no user binary directory is available"
    exit 0
  fi
  elo_die "No user binary directory is available. Set ELO_BIN_DIR or HOME."
fi

mkdir -p "$elo_bin_dir" || {
  if [ "$elo_setup_mode" = lifecycle ]; then
    elo_warn "direct command setup skipped; cannot create $elo_bin_dir"
    exit 0
  fi
  elo_die "Cannot create binary directory: $elo_bin_dir"
}

elo_bin_dir=$(
  CDPATH=
  cd -P "$elo_bin_dir"
  pwd
)
if [ ! -w "$elo_bin_dir" ]; then
  if [ "$elo_setup_mode" = lifecycle ]; then
    elo_warn "direct command setup skipped; destination is not writable: $elo_bin_dir"
    exit 0
  fi
  elo_die "Binary directory is not writable: $elo_bin_dir"
fi

elo_target="$elo_bin_dir/elo"
umask 077

elo_setup_refuse_target() {
  elo_setup_reason=$1
  if [ "$elo_setup_mode" = lifecycle ]; then
    elo_warn "$elo_setup_reason"
    exit 0
  fi
  elo_die "$elo_setup_reason"
}

if [ -L "$elo_target" ]; then
  elo_setup_refuse_target "direct command setup skipped; refusing to replace symlink at $elo_target"
elif [ -e "$elo_target" ]; then
  if [ ! -f "$elo_target" ]; then
    elo_setup_refuse_target "direct command setup skipped; refusing to replace non-regular path at $elo_target"
  fi
  elo_managed_marker=$(sed -n '2p' "$elo_target" 2>/dev/null || true)
  if [ "$elo_managed_marker" != '# managed-by: amarelo-elo' ]; then
    elo_setup_refuse_target "direct command setup skipped; unmanaged command already exists at $elo_target"
  fi
fi

elo_tmp_dir=
elo_tmp=
elo_setup_cleanup() {
  if [ -n "$elo_tmp" ]; then
    rm -f "$elo_tmp"
  fi
  if [ -n "$elo_tmp_dir" ]; then
    rmdir "$elo_tmp_dir" 2>/dev/null || :
  fi
}
trap elo_setup_cleanup 0 1 2 15

elo_tmp_attempt=0
while [ "$elo_tmp_attempt" -lt 100 ]; do
  elo_tmp_attempt=$((elo_tmp_attempt + 1))
  elo_tmp_candidate="$elo_bin_dir/.elo.tmp.$$.$elo_tmp_attempt"
  if mkdir "$elo_tmp_candidate" 2>/dev/null; then
    elo_tmp_dir=$elo_tmp_candidate
    break
  fi
done

if [ -z "$elo_tmp_dir" ]; then
  if [ "$elo_setup_mode" = lifecycle ]; then
    elo_warn "direct command setup skipped; cannot create an exclusive temporary directory in $elo_bin_dir"
    exit 0
  fi
  elo_die "Cannot create an exclusive temporary directory in: $elo_bin_dir"
fi
elo_tmp="$elo_tmp_dir/elo"

elo_fallback_root=$(elo_shell_quote "$ELO_PROJECT_ROOT")
{
  cat <<'EOF'
#!/bin/sh
# managed-by: amarelo-elo
set -eu

EOF
  printf 'fallback_root=%s\n' "$elo_fallback_root"
  cat <<'EOF'

if [ ! -x "$fallback_root/cli/elo" ]; then
  printf 'elo: configured Amarelo checkout is unavailable: %s\n' "$fallback_root" >&2
  printf 'elo: run ./cli/elo setup from a valid checkout\n' >&2
  exit 2
fi

exec "$fallback_root/cli/elo" "$@"
EOF
} >"$elo_tmp"
chmod 755 "$elo_tmp"

if [ -f "$elo_target" ] && cmp -s "$elo_tmp" "$elo_target"; then
  printf 'Elo direct command already configured at %s\n' "$elo_target"
  exit 0
fi

mv "$elo_tmp" "$elo_target"
elo_tmp=
rmdir "$elo_tmp_dir"
elo_tmp_dir=
trap - 0 1 2 15

printf 'Elo direct command installed at %s\n' "$elo_target"
if ! elo_path_contains "$elo_bin_dir"; then
  elo_warn "$elo_bin_dir is not on PATH; add it to your shell environment before using elo directly"
fi
