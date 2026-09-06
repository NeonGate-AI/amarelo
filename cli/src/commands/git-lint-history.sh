#!/bin/sh
set -eu

[ "$#" -eq 2 ] || { printf 'Usage: elo git lint-history <from> <to>\n' >&2; exit 2; }
cd "$ELO_PROJECT_ROOT"

history_resolve() {
  git rev-parse --verify --end-of-options "$1^{commit}" 2>/dev/null || {
    printf 'Invalid commit ref: %s\n' "$1" >&2
    return 2
  }
}

history_from=$(history_resolve "$1")
history_to=$(history_resolve "$2")
history_directory=$(mktemp -d "${TMPDIR:-/tmp}/amarelo-commitlint.XXXXXX")
trap 'rm -rf "$history_directory"' 0
trap 'exit 1' 1 2 15

# Preserve Git's complete range, including merged side-branch commits.
git rev-list --reverse "$history_from..$history_to" >"$history_directory/commits"
history_status=0
while IFS= read -r history_commit; do
  history_config="$ELO_PROJECT_ROOT/commitlint.config.js"
  case "$history_commit" in
    1702ed337d74c4baf6439a10c11d89abdbcc78e1|\
    69e14180645e8a00b9fd3dc7b7c208b51d8160b8|\
    19a971d13c62cb5b196b29b2cdac02b77a9eeadd|\
    48784a556d2c9d14e414da595eaf045d4b349967|\
    4694a176df803657b7b515f5772875b2e1321968)
      # SPEC-055: owner-approved body-length waiver for these objects only.
      history_config="$ELO_PROJECT_ROOT/.github/commitlint-history.config.json"
      printf 'Historical body-length exception: %s\n' "$history_commit"
      ;;
  esac
  git show -s --format=%B "$history_commit" >"$history_directory/message"
  if ! pnpm exec commitlint --config "$history_config" --edit "$history_directory/message" --verbose; then
    printf 'Commitlint failed for %s\n' "$history_commit" >&2
    history_status=1
  fi
done <"$history_directory/commits"

exit "$history_status"
