#!/bin/sh
set -eu

AUDIT_DIR=$(
  CDPATH=
  cd -P "$(dirname "$0")"
  pwd
)
PROJECT_ROOT=${GITHUB_WORKSPACE:-$(
  CDPATH=
  cd -P "$AUDIT_DIR/.."
  pwd
)}
TMP_AUDIT="${TMPDIR:-/tmp}/amarelo-elo-platform-core.$$"

cleanup() {
  rm -f "$TMP_AUDIT"
}
trap cleanup 0 1 2 15

sed 's/\.script\.sh/\.audit.sh/g' \
  "$AUDIT_DIR/elo-platform-core.audit.sh" >"$TMP_AUDIT"
chmod 700 "$TMP_AUDIT"

GITHUB_WORKSPACE="$PROJECT_ROOT" /bin/sh "$TMP_AUDIT"
if [ "${ELO_PLATFORM_NESTED:-0}" != 1 ]; then
  GITHUB_WORKSPACE="$PROJECT_ROOT" /bin/sh "$AUDIT_DIR/elo-scaffold.audit.sh"
fi
