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
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-architecture.$$"
umask 077
mkdir "$TMP_ROOT" || {
  printf 'Architecture FAIL: cannot create temporary directory\n' >&2
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
workspace_count=0
conversation_workspace_count=0

architecture_fail() {
  failures=$((failures + 1))
  printf '\n[%s] %s\n  %s\n  fix: %s\n' \
    "$1" "$2" "$3" "$4" >&2
}

relative_path() {
  case "$1" in
    "$PROJECT_ROOT"/*) printf '%s\n' "${1#"$PROJECT_ROOT"/}" ;;
    *) printf '%s\n' "$1" ;;
  esac
}

package_name() {
  sed -n 's/^[[:space:]]*"name":[[:space:]]*"\([^"]*\)".*/\1/p' "$1" |
    sed -n '1p'
}

export_targets() {
  node - "$1" <<'NODE'
const fs = require('node:fs')
const manifestPath = process.argv[2]
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

function visit(value) {
  if (typeof value === 'string') {
    process.stdout.write(value + '\n')
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value)) visit(nested)
  }
}

visit(manifest.exports)
NODE
}

export_target_resolves() {
  export_target=$1
  export_workspace_root=$2
  export_package_file=$3

  case "$export_target" in
    ./*) ;;
    *) return 0 ;;
  esac

  export_normalized=${export_target#./}
  case "$export_normalized" in
    *'*'*) export_prefix=${export_normalized%%\**} ;;
    *) export_prefix=$export_normalized ;;
  esac

  [ -e "$export_workspace_root/$export_prefix" ] && return 0
  case "$export_normalized" in
    dist/*)
      grep -Eq '^[[:space:]]*"build":[[:space:]]*"' "$export_package_file" &&
        return 0
      ;;
  esac
  return 1
}

is_source_file() {
  case "$1" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) return 0 ;;
    *) return 1 ;;
  esac
}

is_allowed_workspace_config() {
  case "$1" in
    next.config.ts|next-env.d.ts|vite.config.ts|postcss.config.mjs|\
    tailwind.config.ts|eslint.config.js|\
    *.config.ts|*.config.js|*.config.mjs|*.config.cjs|\
    config.ts|config.js|config.mjs|config.cjs)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

export_fixture_root="$TMP_ROOT/conditional-export-fixture"
mkdir "$export_fixture_root"
cat >"$export_fixture_root/package.json" <<'JSON'
{
  "exports": {
    ".": {
      "import": {
        "types": "./src/index.ts",
        "default": "./missing/conditional.js"
      }
    }
  }
}
JSON
export_targets "$export_fixture_root/package.json" >"$TMP_ROOT/conditional-exports"
if ! grep -Fx './missing/conditional.js' "$TMP_ROOT/conditional-exports" >/dev/null 2>&1 ||
  export_target_resolves \
    ./missing/conditional.js \
    "$export_fixture_root" \
    "$export_fixture_root/package.json"
then
  architecture_fail \
    audit-contract \
    .audit/architecture.audit.sh \
    "conditional export fixture was not rejected" \
    "preserve recursive package export validation"
fi

find "$PROJECT_ROOT" \
  \( -type d \( \
    -name .git -o \
    -name .next -o \
    -name .turbo -o \
    -name coverage -o \
    -name dist -o \
    -name node_modules \
  \) -prune \) -o \
  -type f -print |
  sort >"$TMP_ROOT/files"

find "$PROJECT_ROOT/workspaces" \
  \( -type d \( \
    -name .next -o \
    -name .turbo -o \
    -name coverage -o \
    -name dist -o \
    -name node_modules \
  \) -prune \) -o \
  -type f -name package.json -print |
  sort >"$TMP_ROOT/workspaces"

workspace_count=$(awk 'END { print NR + 0 }' "$TMP_ROOT/workspaces")

while IFS= read -r package_file; do
  [ -n "$package_file" ] || continue
  workspace_root=${package_file%/package.json}
  workspace_relative=$(relative_path "$workspace_root")
  name=$(package_name "$package_file")

  if [ "$name" = @ai/conversation ]; then
    conversation_workspace_count=$((conversation_workspace_count + 1))
    if [ "$workspace_relative" != workspaces/ai/conversation ]; then
      architecture_fail \
        conversation-topology \
        "$workspace_relative" \
        "@ai/conversation must live at workspaces/ai/conversation" \
        "move the Conversation workspace to its canonical direct AI path"
    fi
  fi

  case "$workspace_relative" in
    workspaces/ai/*)
      case "$name" in
        @ai/*) ;;
        *)
          architecture_fail \
            package-namespace \
            "$workspace_relative" \
            "${name:-<missing>} must use @ai/*" \
            "rename the package"
          ;;
      esac
      ;;
  esac

  if [ "$workspace_relative" = workspaces/memory-nucleus ] &&
    [ "$name" != @nucleus/memory ]
  then
    architecture_fail \
      package-namespace \
      "$workspace_relative" \
      "${name:-<missing>} must be @nucleus/memory" \
      "use the canonical name"
  fi

  case "$workspace_relative" in
    workspaces/packages/*)
      case "$name" in
        @repo/*) ;;
        *)
          architecture_fail \
            package-namespace \
            "$workspace_relative" \
            "${name:-<missing>} must use @repo/*" \
            "rename the package"
          ;;
      esac
      ;;
    workspaces/apps/*)
      case "$name" in
        @*)
          architecture_fail \
            app-package-name \
            "$workspace_relative" \
            "$name must use an app name" \
            "remove the shared-package namespace"
          ;;
      esac
      ;;
  esac

  [ -d "$workspace_root/src" ] ||
    architecture_fail \
      source-root \
      "$workspace_relative" \
      "code-bearing workspace has no src/" \
      "move first-party implementation under src/"

  if ! export_targets "$package_file" >"$TMP_ROOT/exports"; then
    architecture_fail \
      package-json \
      "$workspace_relative/package.json" \
      "package manifest could not be parsed" \
      "repair the package manifest"
    : >"$TMP_ROOT/exports"
  fi
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    if export_target_resolves "$target" "$workspace_root" "$package_file"; then
      continue
    fi

    architecture_fail \
      package-export \
      "$workspace_relative/package.json" \
      "$target does not resolve to source or a declared build artifact" \
      "repair the export target or package build contract"
  done <"$TMP_ROOT/exports"
done <"$TMP_ROOT/workspaces"

if [ "$conversation_workspace_count" -ne 1 ]; then
  architecture_fail \
    conversation-topology \
    workspaces/ai/conversation \
    "@ai/conversation must exist exactly once at its canonical direct AI path" \
    "move or deduplicate the Conversation workspace"
fi

for required_path in \
  AGENTS.md \
  .agents/skills/readme.md \
  .agents/context/product/strategy.md \
  cli/elo \
  cli/src \
  workspaces/ai/conversation
do
  [ -e "$PROJECT_ROOT/$required_path" ] ||
    architecture_fail \
      harness \
      "$required_path" \
      "required harness/platform path missing" \
      "restore the canonical path"
done

for forbidden_path in \
  elo \
  elos \
  tooling \
  workspaces/memory-nucleus/apps \
  workspaces/memory-nucleus/packages \
  workspaces/ai/orchestrator \
  workspaces/ai/conversation/src/agents
do
  [ ! -e "$PROJECT_ROOT/$forbidden_path" ] ||
    architecture_fail \
      forbidden-topology \
      "$forbidden_path" \
      "obsolete/forbidden path exists" \
      "remove or migrate the path"
done

for ai_parent in workspaces/ai/agents; do
  for forbidden_child in package.json src tsconfig.json; do
    ai_parent_child="$ai_parent/$forbidden_child"
    [ ! -e "$PROJECT_ROOT/$ai_parent_child" ] ||
      architecture_fail \
        ai-capability-parent \
        "$ai_parent_child" \
        "$ai_parent is a structural parent and cannot own $forbidden_child" \
        "move ownership into a named child workspace"
  done
done

if grep -F 'workspaces/ai/orchestrator/*' "$PROJECT_ROOT/pnpm-workspace.yaml" >/dev/null 2>&1; then
  architecture_fail \
    conversation-topology \
    pnpm-workspace.yaml \
    "retired orchestrator workspace glob remains" \
    "remove the nested glob and discover Conversation through workspaces/ai/*"
fi

for expected_dir in adrs context rules skills specs; do
  [ -d "$PROJECT_ROOT/.agents/$expected_dir" ] ||
    architecture_fail \
      agents-taxonomy \
      .agents \
      "missing $expected_dir/" \
      "restore the canonical category"
done

for agents_path in "$PROJECT_ROOT"/.agents/*; do
  [ -d "$agents_path" ] || continue
  agents_name=${agents_path##*/}
  case "$agents_name" in
    adrs|context|rules|skills|specs) ;;
    *)
      architecture_fail \
        agents-taxonomy \
        ".agents/$agents_name" \
        "unexpected first-class category" \
        "move durable knowledge into the canonical taxonomy"
      ;;
  esac
done

agents_entry=$PROJECT_ROOT/AGENTS.md
for rule_path in "$PROJECT_ROOT"/.agents/rules/*.md; do
  [ -f "$rule_path" ] || continue
  rule_relative=$(relative_path "$rule_path")
  first_line=$(sed -n '1p' "$rule_path")
  closing_line=$(sed -n '2,$p' "$rule_path" |
    grep -n '^---$' |
    sed -n '1p' |
    cut -d: -f1)

  if [ "$first_line" != --- ] || [ -z "$closing_line" ]; then
    architecture_fail \
      rule-frontmatter \
      "$rule_relative" \
      "rule has invalid/missing frontmatter" \
      "add valid YAML frontmatter"
    continue
  fi

  frontmatter=$(
    awk '
      NR == 1 && $0 == "---" { inside = 1; next }
      inside && $0 == "---" { exit }
      inside { print }
    ' "$rule_path"
  )
  if ! printf '%s\n' "$frontmatter" |
    grep -Eq '^(name|title):[[:space:]]*[^[:space:]]'
  then
    architecture_fail \
      rule-frontmatter \
      "$rule_relative" \
      "rule frontmatter has no name/title" \
      "add a stable human-readable rule identity"
  fi

  if printf '%s\n' "$frontmatter" |
    grep -Eq '^alwaysApply:[[:space:]]*true[[:space:]]*$'
  then
    if ! grep -F 'alwaysApply: true' "$agents_entry" >/dev/null 2>&1; then
      architecture_fail \
        always-rules \
        AGENTS.md \
        "alwaysApply rules are not operationally discoverable" \
        "tell agents to load alwaysApply rules"
    fi
  fi
done

while IFS= read -r path; do
  [ -n "$path" ] || continue
  path_relative=$(relative_path "$path")
  base_name=${path##*/}

  if [ "$base_name" = .gitkeep ]; then
    directory=${path%/.gitkeep}
    sibling=$(
      find "$directory" -type f ! -name .gitkeep -print 2>/dev/null |
        sed -n '1p'
    )
    if [ -n "$sibling" ]; then
      architecture_fail \
        gitkeep-hygiene \
        "$path_relative" \
        ".gitkeep is redundant because the directory contains tracked content" \
        "remove the redundant .gitkeep file"
    fi
  fi

  case "$path" in
    *.css)
      sed -n \
        "s/.*@source[[:space:]]*[\"']\([^\"']*\)[\"'].*/\1/p" \
        "$path" >"$TMP_ROOT/css-sources"
      while IFS= read -r source_path; do
        [ -n "$source_path" ] || continue
        case "$source_path" in
          .*)
            css_directory=${path%/*}
            if [ ! -e "$css_directory/$source_path" ]; then
              architecture_fail \
                tailwind-source \
                "$path_relative" \
                "$source_path does not resolve from this stylesheet" \
                "repair the relative @source path after source-root moves"
            fi
            ;;
        esac
      done <"$TMP_ROOT/css-sources"
      ;;
  esac

  case "$path_relative" in
    *.value-object.ts)
      architecture_fail \
        vo-suffix \
        "$path_relative" \
        "legacy .value-object.ts suffix remains" \
        "rename to .vo.ts"
      ;;
    *.vo.ts)
      if ! grep -Eq \
        'export[[:space:]]+(abstract[[:space:]]+)?class[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' \
        "$path"
      then
        architecture_fail \
          vo-semantics \
          "$path_relative" \
          ".vo.ts must define an encapsulated Value Object class" \
          "use another semantic suffix or implement a real Value Object"
      fi
      ;;
  esac

  is_source_file "$path" || continue

  case "$path_relative" in
    workspaces/memory-nucleus/src/domain/*)
      if grep -Eq "from[[:space:]]+['\"]node:crypto['\"]" "$path"; then
        architecture_fail \
          domain-technology-dependency \
          "$path_relative" \
          "Domain imports node:crypto" \
          "move generic hashing to Infrastructure"
      fi
      if grep -Eq "['\"]@application(/|['\"])|['\"]@infrastructure(/|['\"])" "$path"; then
        architecture_fail \
          clean-domain-direction \
          "$path_relative" \
          "Domain imports Application/Infrastructure" \
          "Domain cannot depend on Application/Infrastructure"
      fi
      ;;
    workspaces/memory-nucleus/src/application/*)
      if grep -Eq "['\"]@infrastructure(/|['\"])" "$path"; then
        architecture_fail \
          clean-application-direction \
          "$path_relative" \
          "Application imports Infrastructure" \
          "define an Application port"
      fi
      ;;
  esac

  if grep -Eq \
    "(from[[:space:]]*|import[[:space:]]*\([[:space:]]*|require[[:space:]]*\([[:space:]]*)['\"](\.\./){2}" \
    "$path"
  then
    architecture_fail \
      deep-relative-import \
      "$path_relative" \
      "deep relative import crosses more than one parent directory" \
      "use a barrel/import alias/package API"
  fi

  case "$path_relative" in
    workspaces/memory-nucleus/src/*)
      case "$path_relative" in
        */assurance/*) ;;
        *)
          if grep -Eq "['\"][^'\"]*/assurance/" "$path"; then
            architecture_fail \
              assurance-production-dependency \
              "$path_relative" \
              "production layers depend on assurance" \
              "production layers must not depend on assurance"
          fi
          ;;
      esac
      ;;
  esac

  case "$path_relative" in
    workspaces/ai/*)
      if grep -Eq "['\"]@nucleus/memory['\"]" "$path"; then
        architecture_fail \
          memory-sdk-boundary \
          "$path_relative" \
          "@nucleus/memory" \
          "AI consumes personal memory through @repo/memory-sdk"
      fi
      ;;
  esac

  case "$path_relative" in
    workspaces/ai/knowledge/*)
      if grep -Eq "['\"]@repo/memory-sdk['\"]" "$path"; then
        architecture_fail \
          memory-knowledge-isolation \
          "$path_relative" \
          "@repo/memory-sdk" \
          "Knowledge remains independent from personal memory"
      fi
      ;;
  esac
done <"$TMP_ROOT/files"

while IFS= read -r package_file; do
  [ -n "$package_file" ] || continue
  workspace_root=${package_file%/package.json}
  find "$workspace_root" \
    \( -type d \( \
      -name .next -o \
      -name .turbo -o \
      -name coverage -o \
      -name dist -o \
      -name node_modules \
    \) -prune \) -o \
    -type f -print >"$TMP_ROOT/workspace-files"

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    is_source_file "$path" || continue
    local_path=${path#"$workspace_root"/}
    case "$local_path" in
      src/*) continue ;;
    esac
    if is_allowed_workspace_config "$local_path"; then
      continue
    fi
    architecture_fail \
      source-outside-root \
      "$(relative_path "$path")" \
      "first-party source lives outside src/" \
      "move implementation under src/"
  done <"$TMP_ROOT/workspace-files"
done <"$TMP_ROOT/workspaces"

if grep -F '"@neongate-ai/neon"' "$PROJECT_ROOT/package.json" >/dev/null 2>&1; then
  architecture_fail \
    elo-ownership \
    package.json \
    "external generic Neon CLI dependency remains after Elo cutover" \
    "remove @neongate-ai/neon and update pnpm-lock.yaml"
fi

if [ "$failures" -gt 0 ]; then
  printf 'Architecture FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Architecture PASS — %s workspaces\n' "$workspace_count"
