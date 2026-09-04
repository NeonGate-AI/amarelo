#!/bin/sh
set -u

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
WORKSPACE_ROOT="$PROJECT_ROOT/workspaces"
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-imports.$$"
umask 077
mkdir "$TMP_ROOT" || {
  printf 'Import boundaries FAIL: cannot create temporary directory\n' >&2
  exit 1
}
audit_cleanup() {
  rm -rf "$TMP_ROOT"
}

audit_on_signal() {
  trap - 0 1 2 15
  audit_cleanup
  exit 1
}

trap audit_cleanup 0
trap audit_on_signal 1 2 15

failures=0

import_fail() {
  failures=$((failures + 1))
  printf '\n[%s] %s\n  %s\n' "$1" "$2" "$3" >&2
}

relative_path() {
  case "$1" in
    "$PROJECT_ROOT"/*) printf '%s\n' "${1#"$PROJECT_ROOT"/}" ;;
    *) printf '%s\n' "$1" ;;
  esac
}

is_source_file() {
  case "$1" in
    *.d.ts) return 1 ;;
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_source_file() {
  candidate=$1
  if [ -f "$candidate" ] && is_source_file "$candidate"; then
    printf '%s\n' "$candidate"
    return 0
  fi

  candidate_name=${candidate##*/}
  case "$candidate_name" in
    *.*) return 1 ;;
  esac

  for extension in .ts .tsx .js .jsx .mjs .cjs; do
    if [ -f "$candidate$extension" ]; then
      printf '%s\n' "$candidate$extension"
      return 0
    fi
  done
  return 1
}

import_specifiers() {
  awk '
    {
      line = $0
      while (match(line, /(from[[:space:]]*|import[[:space:]]*\([[:space:]]*|require[[:space:]]*\([[:space:]]*)["\047][^"\047]+["\047]/)) {
        token = substr(line, RSTART, RLENGTH)
        sub(/^[^"\047]*["\047]/, "", token)
        sub(/["\047]$/, "", token)
        print token
        line = substr(line, RSTART + RLENGTH)
      }
    }
  ' "$1"
}

nearest_tsconfig() {
  search_dir=${1%/*}
  while [ "$search_dir" != "$WORKSPACE_ROOT" ] &&
    [ "$search_dir" != "$PROJECT_ROOT" ] &&
    [ "$search_dir" != / ]
  do
    if [ -f "$search_dir/tsconfig.json" ]; then
      printf '%s\n' "$search_dir/tsconfig.json"
      return 0
    fi
    search_dir=${search_dir%/*}
  done
  return 1
}

emit_config_aliases() {
  config_file=$1
  [ -f "$config_file" ] || return 0
  config_dir=${config_file%/*}
  base_url=$(
    sed -n 's/^[[:space:]]*"baseUrl":[[:space:]]*"\([^"]*\)".*/\1/p' \
      "$config_file" |
      sed -n '1p'
  )
  [ -n "$base_url" ] || base_url=.
  alias_base="$config_dir/$base_url"

  sed -n \
    's/^[[:space:]]*"\([@#][^"]*\)":[[:space:]]*\[[[:space:]]*"\([^"]*\)".*/\1	\2/p' \
    "$config_file" |
    while IFS='	' read -r alias_pattern alias_target; do
      [ -n "$alias_pattern" ] || continue
      printf '%s\t%s\t%s\n' "$alias_pattern" "$alias_target" "$alias_base"
    done
}

load_aliases() {
  config_file=$1
  aliases_file=$2
  : >"$aliases_file"

  extends=$(
    sed -n 's/^[[:space:]]*"extends":[[:space:]]*"\([^"]*\)".*/\1/p' \
      "$config_file" |
      sed -n '1p'
  )
  case "$extends" in
    ./*|../*)
      extended="$config_file"
      extended=${extended%/*}/$extends
      case "$extended" in
        *.json) ;;
        *) extended="$extended.json" ;;
      esac
      emit_config_aliases "$extended" >>"$aliases_file"
      ;;
  esac

  emit_config_aliases "$config_file" >>"$aliases_file"
}

resolve_alias_file() {
  specifier=$1
  aliases_file=$2

  while IFS='	' read -r alias_pattern alias_target alias_base; do
    [ -n "$alias_pattern" ] || continue
    matched=
    case "$alias_pattern" in
      *'*'*)
        alias_prefix=${alias_pattern%%\**}
        alias_suffix=${alias_pattern#*\*}
        case "$specifier" in
          "$alias_prefix"*"$alias_suffix")
            matched=${specifier#"$alias_prefix"}
            if [ -n "$alias_suffix" ]; then
              matched=${matched%"$alias_suffix"}
            fi
            ;;
          *) continue ;;
        esac
        target_prefix=${alias_target%%\**}
        target_suffix=${alias_target#*\*}
        candidate="$alias_base/$target_prefix$matched$target_suffix"
        ;;
      *)
        [ "$alias_pattern" = "$specifier" ] || continue
        candidate="$alias_base/$alias_target"
        ;;
    esac

    if [ -d "$candidate" ]; then
      printf 'directory\t%s\n' "$candidate"
      return 0
    fi
    resolved=$(resolve_source_file "$candidate" 2>/dev/null || true)
    if [ -n "$resolved" ]; then
      printf 'file\t%s\n' "$resolved"
      return 0
    fi
  done <"$aliases_file"

  return 1
}

crosses_barrel() {
  importer=$1
  target=$2
  target_name=${target##*/}
  [ "$target_name" != index.ts ] || return 1

  importer_dir=$(
    CDPATH=
    cd -P "${importer%/*}"
    pwd
  )
  target_dir=$(
    CDPATH=
    cd -P "${target%/*}"
    pwd
  )
  [ "$target_dir" != "$importer_dir" ] || return 1
  [ -f "$target_dir/index.ts" ]
}

find "$WORKSPACE_ROOT" \
  \( -type d \( \
    -name .git -o \
    -name .next -o \
    -name .turbo -o \
    -name coverage -o \
    -name dist -o \
    -name node_modules \
  \) -prune \) -o \
  -type f -print |
  sort >"$TMP_ROOT/all-files"

: >"$TMP_ROOT/source-files"
: >"$TMP_ROOT/package-files"
: >"$TMP_ROOT/tsconfig-files"
while IFS= read -r path; do
  [ -n "$path" ] || continue
  case "$path" in
    */package.json) printf '%s\n' "$path" >>"$TMP_ROOT/package-files" ;;
    */tsconfig.json) printf '%s\n' "$path" >>"$TMP_ROOT/tsconfig-files" ;;
  esac
  if is_source_file "$path"; then
    printf '%s\n' "$path" >>"$TMP_ROOT/source-files"
  fi
done <"$TMP_ROOT/all-files"

while IFS= read -r package_file; do
  [ -n "$package_file" ] || continue
  if grep -Eq '^[[:space:]]*"#[^"]*":[[:space:]]*' "$package_file"; then
    import_fail \
      absolute-alias-prefix \
      "$(relative_path "$package_file")" \
      "package imports use the forbidden # prefix; first-party absolute aliases use @"
  fi
done <"$TMP_ROOT/package-files"

while IFS= read -r config_file; do
  [ -n "$config_file" ] || continue
  case "$config_file" in
    "$WORKSPACE_ROOT/ai/conversation/tsconfig.json") continue ;;
  esac
  if grep -F 'conversation/src/' "$config_file" >/dev/null 2>&1; then
    import_fail \
      cross-package-source-alias \
      "$(relative_path "$config_file")" \
      "TypeScript paths must not remap @ai/conversation private source; consume its declared package exports"
  fi
done <"$TMP_ROOT/tsconfig-files"

while IFS= read -r path; do
  [ -n "$path" ] || continue
  relative=$(relative_path "$path")
  importer_name=${path##*/}
  importer_is_barrel=false
  [ "$importer_name" = index.ts ] && importer_is_barrel=true

  import_specifiers "$path" >"$TMP_ROOT/specifiers"
  config=$(nearest_tsconfig "$path" 2>/dev/null || true)
  if [ -n "$config" ]; then
    load_aliases "$config" "$TMP_ROOT/aliases"
  else
    : >"$TMP_ROOT/aliases"
  fi

  while IFS= read -r specifier; do
    [ -n "$specifier" ] || continue
    case "$specifier" in
      \#*)
        import_fail \
          absolute-alias-prefix \
          "$relative" \
          "$specifier uses #; first-party absolute aliases must start with @"
        continue
        ;;
    esac

    [ "$importer_is_barrel" = false ] || continue

    case "$specifier" in
      .*)
        candidate="${path%/*}/$specifier"
        [ ! -d "$candidate" ] || continue
        target=$(resolve_source_file "$candidate" 2>/dev/null || true)
        if [ -n "$target" ] && crosses_barrel "$path" "$target"; then
          import_fail \
            barrel-import \
            "$relative" \
            "$specifier crosses into $(relative_path "${target%/*}"); import that directory barrel instead"
        fi
        ;;
      @*)
        resolution=$(resolve_alias_file "$specifier" "$TMP_ROOT/aliases" 2>/dev/null || true)
        kind=${resolution%%	*}
        target=${resolution#*	}
        if [ "$kind" = file ] && [ -n "$target" ] &&
          crosses_barrel "$path" "$target"
        then
          import_fail \
            barrel-import \
            "$relative" \
            "$specifier crosses into $(relative_path "${target%/*}"); import that directory barrel instead"
        fi
        ;;
    esac
  done <"$TMP_ROOT/specifiers"
done <"$TMP_ROOT/source-files"

: >"$TMP_ROOT/directories"
while IFS= read -r path; do
  [ -n "$path" ] || continue
  printf '%s\n' "${path%/*}" >>"$TMP_ROOT/directories"
done <"$TMP_ROOT/source-files"
sort -u "$TMP_ROOT/directories" >"$TMP_ROOT/directories.sorted"

while IFS= read -r directory; do
  [ -n "$directory" ] || continue
  case "$directory" in
    */cypress/e2e) continue ;;
    */src/assurance/tests|*/src/assurance/tests/*) continue ;;
  esac
  : >"$TMP_ROOT/direct-files"
  has_nested=false

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    case "$path" in
      "$directory"/*)
        parent=${path%/*}
        if [ "$parent" = "$directory" ]; then
          base_name=${path##*/}
          case "$base_name" in
            index.ts|*.d.ts) ;;
            *) printf '%s\n' "$path" >>"$TMP_ROOT/direct-files" ;;
          esac
        else
          has_nested=true
        fi
        ;;
    esac
  done <"$TMP_ROOT/source-files"

  [ -s "$TMP_ROOT/direct-files" ] || continue
  [ "$has_nested" = false ] || continue

  framework_only=true
  while IFS= read -r path; do
    base_name=${path##*/}
    case "$base_name" in
      default.tsx|error.tsx|layout.tsx|loading.tsx|not-found.tsx|\
      page.tsx|route.ts|template.tsx)
        ;;
      *)
        framework_only=false
        ;;
    esac
  done <"$TMP_ROOT/direct-files"
  [ "$framework_only" = false ] || continue

  barrel="$directory/index.ts"
  if [ ! -f "$barrel" ]; then
    import_fail \
      leaf-barrel \
      "$(relative_path "$directory")" \
      "code-bearing leaf directory has no index.ts"
    continue
  fi

  while IFS= read -r module_path; do
    [ -n "$module_path" ] || continue
    module_name=${module_path##*/}
    stem=${module_name%.*}
    if ! grep -F "./$stem" "$barrel" >/dev/null 2>&1; then
      import_fail \
        leaf-barrel-export \
        "$(relative_path "$barrel")" \
        "$module_name is not exported by the leaf barrel"
    fi
  done <"$TMP_ROOT/direct-files"
done <"$TMP_ROOT/directories.sorted"

if [ "$failures" -gt 0 ]; then
  printf 'Import boundaries FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Import boundaries PASS\n'
printf '@ absolute aliases: PASS\n'
printf 'cross-package source aliases: PASS\n'
printf 'cross-directory barrel imports: PASS\n'
printf 'leaf index.ts coverage: PASS\n'
