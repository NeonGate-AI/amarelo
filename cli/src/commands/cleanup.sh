#!/usr/bin/env sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

apply=false
include_dependencies=false
for arg in "$@"; do
  case "$arg" in
    --apply) apply=true ;;
    --dependencies) include_dependencies=true ;;
    --help|-h) echo 'Usage: ./elo cleanup [--apply] [--dependencies]'; exit 0 ;;
    *) echo "Unknown cleanup option: $arg" >&2; exit 2 ;;
  esac
done

tracked_under() {
  rel="$1"
  git -C "$ELO_PROJECT_ROOT" ls-files | grep -Eq "^${rel}(/|$)"
}

remove_target() {
  target="$1"
  [ -e "$target" ] || return 0
  rel="$(elo_rel "$target")"
  case "$rel" in .git|.git/*|.audit|.audit/*) return 0 ;; esac
  if elo_git_checkout && tracked_under "$rel"; then
    printf 'protected tracked path %s\n' "$rel"
    return 0
  fi
  if [ "$apply" = true ]; then rm -rf -- "$target"; printf 'removed %s\n' "$rel"; else printf 'would remove %s\n' "$rel"; fi
}

for name in .next .turbo dist coverage build out .cache storybook-static .mastra; do
  find "$ELO_PROJECT_ROOT" \( -name .git -o -name .audit -o -name node_modules \) -prune -o -type d -name "$name" -print | while IFS= read -r target; do remove_target "$target"; done
done
find "$ELO_PROJECT_ROOT" \( -name .git -o -name .audit -o -name node_modules \) -prune -o -type f -name '*.tsbuildinfo' -print | while IFS= read -r target; do remove_target "$target"; done

if [ "$include_dependencies" = true ]; then
  find "$ELO_PROJECT_ROOT" \( -name .git -o -name .audit \) -prune -o -type d -name node_modules -print | while IFS= read -r target; do remove_target "$target"; done
fi

if [ "$apply" = false ]; then printf 'Dry run only. Re-run with --apply to delete these untracked outputs.\n'; fi
