#!/bin/sh
set -u

AUDIT_DIR=$(
  CDPATH=
  cd -P "$(dirname "$0")"
  pwd
)
CORE_AUDIT="$AUDIT_DIR/elo-platform-core.audit.sh"

cleanup_legacy_audit_links() {
  for audit_name in architecture elo-platform import-boundaries memory-invariants specs; do
    legacy_path="$AUDIT_DIR/$audit_name.script.sh"
    [ -L "$legacy_path" ] && rm -f "$legacy_path"
  done
}

if [ "${ELO_AUDIT_COMPAT_ACTIVE:-0}" = 1 ]; then
  exec /bin/sh "$CORE_AUDIT"
fi

trap cleanup_legacy_audit_links 0 1 2 15

for audit_name in architecture elo-platform import-boundaries memory-invariants specs; do
  canonical_path="$AUDIT_DIR/$audit_name.audit.sh"
  legacy_path="$AUDIT_DIR/$audit_name.script.sh"
  if [ ! -f "$canonical_path" ]; then
    printf 'Elo platform audit FAIL: missing %s\n' "$canonical_path" >&2
    exit 1
  fi
  if [ -e "$legacy_path" ] || [ -L "$legacy_path" ]; then
    printf 'Elo platform audit FAIL: unexpected legacy audit path %s\n' "$legacy_path" >&2
    exit 1
  fi
  ln -s "$(basename "$canonical_path")" "$legacy_path" || exit 1
done

ELO_AUDIT_COMPAT_ACTIVE=1 /bin/sh "$CORE_AUDIT"
status=$?
cleanup_legacy_audit_links
trap - 0 1 2 15
exit "$status"
