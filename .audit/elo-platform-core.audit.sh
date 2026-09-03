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
CLI_ROOT="$PROJECT_ROOT/cli/src"
LAUNCHER="$PROJECT_ROOT/cli/elo"
DESIGN_SYSTEM_ROOT="$PROJECT_ROOT/workspaces/packages/design-system"
TOKEN_SCRIPT="$DESIGN_SYSTEM_ROOT/src/scripts/build-tokens.sh"
TOKEN_BACKEND="$DESIGN_SYSTEM_ROOT/src/scripts/build-tokens.ts"
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-elo-platform.$$"
doctor_fifo_writer=
umask 077
mkdir "$TMP_ROOT" || {
  printf 'Elo platform audit FAIL: cannot create temporary directory\n' >&2
  exit 1
}
audit_cleanup() {
  if [ -n "$doctor_fifo_writer" ]; then
    kill "$doctor_fifo_writer" 2>/dev/null || :
    wait "$doctor_fifo_writer" 2>/dev/null || :
    doctor_fifo_writer=
  fi
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

platform_fail() {
  failures=$((failures + 1))
  printf '%s\n' "- $1: $2" >&2
}

is_framework_owned_mjs() {
  case "$1" in
    workspaces/apps/*/postcss.config.mjs)
      elo_mjs_app=${1#workspaces/apps/}
      elo_mjs_app=${elo_mjs_app%/postcss.config.mjs}
      case "$elo_mjs_app" in
        ''|*/*) return 1 ;;
        *) return 0 ;;
      esac
      ;;
    *) return 1 ;;
  esac
}

snapshot_directory() {
  snapshot_root=$1
  find "$snapshot_root" -print |
    sort |
    while IFS= read -r snapshot_path; do
      [ -n "$snapshot_path" ] || continue
      if [ "$snapshot_path" = "$snapshot_root" ]; then
        snapshot_relative=.
      else
        snapshot_relative=${snapshot_path#"$snapshot_root"/}
      fi

      if [ -L "$snapshot_path" ]; then
        printf 'link\t%s\n' "$snapshot_relative"
      elif [ -d "$snapshot_path" ]; then
        printf 'directory\t%s\n' "$snapshot_relative"
      elif [ -f "$snapshot_path" ]; then
        snapshot_checksum=$(cksum <"$snapshot_path")
        printf 'file\t%s\t%s\n' "$snapshot_relative" "$snapshot_checksum"
      else
        printf 'other\t%s\n' "$snapshot_relative"
      fi
    done
}

if ! is_framework_owned_mjs workspaces/apps/example/postcss.config.mjs ||
  is_framework_owned_mjs workspaces/apps/example/src/scripts/postcss.config.mjs ||
  is_framework_owned_mjs workspaces/packages/design-system/src/scripts/build.config.mjs
then
  platform_fail .audit/elo-platform.audit.sh "framework MJS allowlist contract is too broad"
fi

package_script_names() {
  awk '
    /^[[:space:]]*"scripts":[[:space:]]*\{/ {
      inside = 1
      next
    }
    inside && /^[[:space:]]*\},?[[:space:]]*$/ { exit }
    inside && /^[[:space:]]*"[^"]+":[[:space:]]*/ {
      line = $0
      sub(/^[[:space:]]*"/, "", line)
      sub(/".*$/, "", line)
      print line
    }
  ' "$PROJECT_ROOT/package.json"
}

package_script_value() {
  awk -v wanted="$1" '
    /^[[:space:]]*"scripts":[[:space:]]*\{/ {
      inside = 1
      next
    }
    inside && /^[[:space:]]*\},?[[:space:]]*$/ { exit }
    inside {
      line = $0
      key = line
      sub(/^[[:space:]]*"/, "", key)
      sub(/".*$/, "", key)
      if (key == wanted) {
        sub(/^[^:]*:[[:space:]]*"/, "", line)
        sub(/",[[:space:]]*$/, "", line)
        print line
        exit
      }
    }
  ' "$PROJECT_ROOT/package.json"
}

if [ -e "$PROJECT_ROOT/elo" ]; then
  platform_fail elo "the Elo binary must live at cli/elo, not the repository root"
fi
[ -f "$LAUNCHER" ] ||
  platform_fail cli/elo "the repository-local Elo binary is missing"
[ -d "$CLI_ROOT" ] ||
  platform_fail cli/src "Elo source root is missing"
[ -f "$CLI_ROOT/commands/setup.sh" ] ||
  platform_fail cli/src/commands/setup.sh "direct-command setup implementation is missing"

if [ -d "$CLI_ROOT" ]; then
  find "$CLI_ROOT" -type f ! -name '*.sh' -print >"$TMP_ROOT/non-shell"
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    relative=${path#"$PROJECT_ROOT"/}
    platform_fail "$relative" "Elo implementation must be POSIX shell only"
  done <"$TMP_ROOT/non-shell"
fi

dispatcher="$CLI_ROOT/elo.sh"
if [ -f "$dispatcher" ]; then
  for command_name in build dev eval format lint start test typecheck verify; do
    if grep -Eq "^[[:space:]]*${command_name}([|)])" "$dispatcher"; then
      platform_fail \
        cli/src/elo.sh \
        "Elo exposes $command_name; Turborepo/root scripts own task-graph execution"
    fi
  done

  grep -F 'elo_command=${1:-help}' "$dispatcher" >/dev/null 2>&1 ||
    platform_fail cli/src/elo.sh "Elo without arguments must default to help"
  grep -F 'elo_run_check' "$dispatcher" >/dev/null 2>&1 ||
    platform_fail cli/src/elo.sh "Elo must dispatch audit checks through the shell checker boundary"
  grep -Eq '^[[:space:]]*all\)' "$dispatcher" ||
    platform_fail cli/src/elo.sh "Elo check must expose an aggregate all subcommand"
fi

allowed_scripts='
prepare
postinstall
postclone
elo
dev
start
build
typecheck
test
'
package_script_names >"$TMP_ROOT/scripts"
while IFS= read -r script_name; do
  [ -n "$script_name" ] || continue
  if ! printf '%s' "$allowed_scripts" | grep -Fx "$script_name" >/dev/null 2>&1; then
    platform_fail package.json "root script $script_name is not a canonical Elo/Turbo entrypoint"
  fi
done <"$TMP_ROOT/scripts"

[ "$(package_script_value prepare)" = './cli/elo git setup --prepare' ] ||
  platform_fail package.json "prepare must delegate repository-local Git platform setup to cli/elo"
[ "$(package_script_value postinstall)" = './cli/elo setup --postinstall' ] ||
  platform_fail package.json "postinstall must install the direct Elo command through cli/elo"
[ "$(package_script_value postclone)" = './cli/elo setup --postclone' ] ||
  platform_fail package.json "postclone must expose the explicit direct-command recovery path"
[ "$(package_script_value elo)" = './cli/elo' ] ||
  platform_fail package.json "pnpm elo must execute the local cli/elo binary"

for script_name in dev start build typecheck test; do
  script_value=$(package_script_value "$script_name")
  case "$script_value" in
    *turbo*) ;;
    *)
      platform_fail package.json "$script_name must remain a direct Turborepo task-graph entrypoint"
      ;;
  esac
done

expected_pre_commit='#!/usr/bin/env sh
exec ./cli/elo git pre-commit "$@"'
expected_commit_msg='#!/usr/bin/env sh
exec ./cli/elo git commit-msg "$@"'

actual_pre_commit=$(
  tr -d '\r' <"$PROJECT_ROOT/.husky/pre-commit" 2>/dev/null || true
)
actual_commit_msg=$(
  tr -d '\r' <"$PROJECT_ROOT/.husky/commit-msg" 2>/dev/null || true
)
[ "$actual_pre_commit" = "$expected_pre_commit" ] ||
  platform_fail .husky/pre-commit "Husky adapter must remain an exact thin delegation to cli/elo"
[ "$actual_commit_msg" = "$expected_commit_msg" ] ||
  platform_fail .husky/commit-msg "Husky adapter must remain an exact thin delegation to cli/elo"

for audit_name in \
  architecture \
  elo-platform \
  import-boundaries \
  memory-invariants \
  specs
do
  audit_path="$PROJECT_ROOT/.audit/$audit_name.script.sh"
  [ -f "$audit_path" ] ||
    platform_fail ".audit/$audit_name.script.sh" "required shell audit checker is missing"
  [ -x "$audit_path" ] ||
    platform_fail ".audit/$audit_name.script.sh" "shell audit checker must be executable"
done

[ -f "$TOKEN_SCRIPT" ] ||
  platform_fail workspaces/packages/design-system/src/scripts/build-tokens.sh \
    "the design-token shell entrypoint is missing"
[ -x "$TOKEN_SCRIPT" ] ||
  platform_fail workspaces/packages/design-system/src/scripts/build-tokens.sh \
    "the design-token shell entrypoint must be executable"
[ -f "$TOKEN_BACKEND" ] ||
  platform_fail workspaces/packages/design-system/src/scripts/build-tokens.ts \
    "the typed design-token backend is missing"

if [ -f "$DESIGN_SYSTEM_ROOT/package.json" ]; then
  token_build=$(awk '
    /^[[:space:]]*"build":[[:space:]]*/ {
      line = $0
      sub(/^[^:]*:[[:space:]]*"/, "", line)
      sub(/",?[[:space:]]*$/, "", line)
      print line
      exit
    }
  ' "$DESIGN_SYSTEM_ROOT/package.json")
  token_dev=$(awk '
    /^[[:space:]]*"dev":[[:space:]]*/ {
      line = $0
      sub(/^[^:]*:[[:space:]]*"/, "", line)
      sub(/",?[[:space:]]*$/, "", line)
      print line
      exit
    }
  ' "$DESIGN_SYSTEM_ROOT/package.json")
  [ "$token_build" = './src/scripts/build-tokens.sh' ] ||
    platform_fail workspaces/packages/design-system/package.json \
      "design-system build must execute the shell token entrypoint"
  [ "$token_dev" = './src/scripts/build-tokens.sh --watch' ] ||
    platform_fail workspaces/packages/design-system/package.json \
      "design-system dev must execute the shell token entrypoint in watch mode"
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
  -type f -name '*.mjs' -print >"$TMP_ROOT/mjs-files"
while IFS= read -r path; do
  [ -n "$path" ] || continue
  relative=${path#"$PROJECT_ROOT"/}
  if ! is_framework_owned_mjs "$relative"; then
    platform_fail "$relative" \
      "MJS is reserved for framework-owned app configuration; executable automation must enter through shell"
  fi
done <"$TMP_ROOT/mjs-files"

find "$PROJECT_ROOT" \
  \( -type d \( \
    -name .git -o \
    -name .next -o \
    -name .turbo -o \
    -name coverage -o \
    -name dist -o \
    -name node_modules \
  \) -prune \) -o \
  -type f -name package.json -print >"$TMP_ROOT/package-files"
while IFS= read -r manifest; do
  [ -n "$manifest" ] || continue
  if awk '
    /^[[:space:]]*"scripts":[[:space:]]*\{/ { inside = 1; next }
    inside && /^[[:space:]]*\},?[[:space:]]*$/ { exit }
    inside && /\.mjs/ { found = 1 }
    END { exit(found ? 0 : 1) }
  ' "$manifest"
  then
    platform_fail "${manifest#"$PROJECT_ROOT"/}" \
      "package scripts must not execute .mjs automation"
  fi
done <"$TMP_ROOT/package-files"

{
  printf '%s\n' "$LAUNCHER"
  find "$CLI_ROOT" -type f -name '*.sh' -print
  for elo_audit_path in "$PROJECT_ROOT"/.audit/*.script.sh; do
    [ -f "$elo_audit_path" ] || continue
    printf '%s\n' "$elo_audit_path"
  done
  printf '%s\n' "$TOKEN_SCRIPT"
} >"$TMP_ROOT/shell-files"
while IFS= read -r path; do
  [ -n "$path" ] || continue
  if ! /bin/sh -n "$path"; then
    platform_fail "${path#"$PROJECT_ROOT"/}" "POSIX shell syntax validation failed"
  fi
done <"$TMP_ROOT/shell-files"

contract_bin="$TMP_ROOT/direct-bin"
contract_home="$TMP_ROOT/contract-home"
contract_pnpm="$TMP_ROOT/contract-pnpm"
contract_xdg="$TMP_ROOT/contract-xdg"
contract_output="$TMP_ROOT/setup.out"
for alternative_dir in "$contract_home" "$contract_pnpm" "$contract_xdg"; do
  mkdir "$alternative_dir"
  printf 'unchanged\n' >"$alternative_dir/.sentinel"
done
snapshot_directory "$contract_home" >"$TMP_ROOT/contract-home.before"
snapshot_directory "$contract_pnpm" >"$TMP_ROOT/contract-pnpm.before"
snapshot_directory "$contract_xdg" >"$TMP_ROOT/contract-xdg.before"
if ! CI= ELO_SETUP_DISABLED= HOME="$contract_home" \
  PNPM_HOME="$contract_pnpm" XDG_BIN_HOME="$contract_xdg" \
  ELO_BIN_DIR="$contract_bin" \
  "$LAUNCHER" setup >"$contract_output" 2>&1
then
  platform_fail cli/src/commands/setup.sh "direct launcher setup failed in an isolated destination"
elif [ ! -x "$contract_bin/elo" ]; then
  platform_fail cli/src/commands/setup.sh "direct launcher was not created as an executable"
else
  snapshot_directory "$contract_home" >"$TMP_ROOT/contract-home.after"
  snapshot_directory "$contract_pnpm" >"$TMP_ROOT/contract-pnpm.after"
  snapshot_directory "$contract_xdg" >"$TMP_ROOT/contract-xdg.after"
  for alternative_name in contract-home contract-pnpm contract-xdg; do
    cmp -s \
      "$TMP_ROOT/$alternative_name.before" \
      "$TMP_ROOT/$alternative_name.after" ||
      platform_fail cli/src/commands/setup.sh "setup modified an alternate destination"
  done
  [ ! -e "$contract_home/.local/bin/elo" ] ||
    platform_fail cli/src/commands/setup.sh "setup wrote to the HOME fallback despite ELO_BIN_DIR"
  [ ! -e "$contract_pnpm/elo" ] ||
    platform_fail cli/src/commands/setup.sh "setup wrote to PNPM_HOME despite ELO_BIN_DIR"
  [ ! -e "$contract_xdg/elo" ] ||
    platform_fail cli/src/commands/setup.sh "setup wrote to XDG_BIN_HOME despite ELO_BIN_DIR"

  cp "$contract_bin/elo" "$TMP_ROOT/elo.first"
  if ! CI= ELO_SETUP_DISABLED= HOME="$contract_home" \
    PNPM_HOME="$contract_pnpm" XDG_BIN_HOME="$contract_xdg" \
    ELO_BIN_DIR="$contract_bin" \
    "$LAUNCHER" setup >>"$contract_output" 2>&1
  then
    platform_fail cli/src/commands/setup.sh "idempotent setup rerun failed"
  elif ! cmp -s "$TMP_ROOT/elo.first" "$contract_bin/elo"; then
    platform_fail cli/src/commands/setup.sh "idempotent setup changed an equivalent managed launcher"
  fi

  chmod 600 "$contract_bin/elo"
  if ! CI= ELO_SETUP_DISABLED= HOME="$contract_home" \
    PNPM_HOME="$contract_pnpm" XDG_BIN_HOME="$contract_xdg" \
    ELO_BIN_DIR="$contract_bin" \
    "$LAUNCHER" setup >>"$contract_output" 2>&1
  then
    platform_fail cli/src/commands/setup.sh "setup did not repair a managed launcher without execute permission"
  elif [ ! -x "$contract_bin/elo" ]; then
    platform_fail cli/src/commands/setup.sh "repaired managed launcher is not executable"
  fi

  expected_version=$(
    sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' \
      "$PROJECT_ROOT/package.json" |
      sed -n '1p'
  )
  actual_version=$(
    cd "$TMP_ROOT" &&
      "$contract_bin/elo" --version 2>/dev/null
  )
  [ "$actual_version" = "elo $expected_version" ] ||
    platform_fail "$contract_bin/elo" "installed launcher does not execute the configured checkout"

  if [ "${ELO_PLATFORM_NESTED:-0}" != 1 ]; then
    if ! ELO_PLATFORM_NESTED=1 "$contract_bin/elo" check platform \
      >"$TMP_ROOT/installed-platform.out" 2>&1
    then
      platform_fail "$contract_bin/elo" "installed launcher cannot execute elo check platform"
    fi
  fi
fi

quoted_root="$TMP_ROOT/checkout with an apostrophe '"
quoted_bin="$TMP_ROOT/quoted-bin"
mkdir "$quoted_root"
if ! cp -R "$PROJECT_ROOT/cli" "$quoted_root/cli" || \
  ! cp "$PROJECT_ROOT/package.json" "$quoted_root/package.json"
then
  platform_fail cli/src/commands/setup.sh "cannot prepare the quoted-checkout fixture"
elif ! CI= ELO_SETUP_DISABLED= ELO_BIN_DIR="$quoted_bin" \
  "$quoted_root/cli/elo" setup >"$TMP_ROOT/quoted-setup.out" 2>&1
then
  platform_fail cli/src/commands/setup.sh "setup failed for a checkout path containing spaces and an apostrophe"
else
  quoted_version=$(
    cd "$TMP_ROOT" &&
      "$quoted_bin/elo" --version 2>/dev/null
  )
  expected_quoted_version=$("$LAUNCHER" --version 2>/dev/null)
  [ "$quoted_version" = "$expected_quoted_version" ] ||
    platform_fail "$quoted_bin/elo" "launcher did not preserve the quoted checkout path"

  moved_quoted_root="$quoted_root.moved"
  mv "$quoted_root" "$moved_quoted_root"
  "$quoted_bin/elo" --version >"$TMP_ROOT/missing-checkout.out" 2>&1
  missing_checkout_status=$?
  [ "$missing_checkout_status" -eq 2 ] ||
    platform_fail "$quoted_bin/elo" "launcher with an unavailable checkout must exit 2"
  grep -F 'run ./cli/elo setup from a valid checkout' "$TMP_ROOT/missing-checkout.out" >/dev/null 2>&1 ||
    platform_fail "$quoted_bin/elo" "unavailable checkout error lacks setup recovery guidance"
fi

if ! "$LAUNCHER" >"$TMP_ROOT/help.out" 2>"$TMP_ROOT/help.err"; then
  platform_fail cli/src/elo.sh "no-argument help must exit successfully"
elif ! grep -F 'Usage:' "$TMP_ROOT/help.out" >/dev/null 2>&1; then
  platform_fail cli/src/elo.sh "no-argument execution must print help"
fi

if ! "$LAUNCHER" --help >"$TMP_ROOT/global-help.out" 2>"$TMP_ROOT/global-help.err"; then
  platform_fail cli/src/elo.sh "--help must exit successfully"
elif ! grep -F '███████╗██╗      ██████╗' "$TMP_ROOT/global-help.out" >/dev/null 2>&1; then
  platform_fail cli/src/commands/help.sh "global help must print the ELO wordmark"
elif ! grep -F '🚀 bootstrap' "$TMP_ROOT/global-help.out" >/dev/null 2>&1; then
  platform_fail cli/src/commands/help.sh "global help must expose the emoji command catalog"
fi

elo_escape=$(printf '\033')
if grep -F "$elo_escape" "$TMP_ROOT/global-help.out" >/dev/null 2>&1; then
  platform_fail cli/src/core/output.sh "redirected help must not contain ANSI escapes"
fi

if ! NO_COLOR= ELO_FORCE_COLOR=1 "$LAUNCHER" --help >"$TMP_ROOT/no-color.out" 2>&1; then
  platform_fail cli/src/core/output.sh "NO_COLOR help invocation failed"
elif grep -F "$elo_escape" "$TMP_ROOT/no-color.out" >/dev/null 2>&1; then
  platform_fail cli/src/core/output.sh "NO_COLOR must suppress ANSI escapes"
fi

if ! (
  unset NO_COLOR
  ELO_FORCE_COLOR=1 "$LAUNCHER" --help
) >"$TMP_ROOT/force-color.out" 2>&1; then
  platform_fail cli/src/core/output.sh "forced-color help invocation failed"
elif ! grep -F "$elo_escape" "$TMP_ROOT/force-color.out" >/dev/null 2>&1; then
  platform_fail cli/src/core/output.sh "forced-color help must contain ANSI escapes"
fi

if ! "$LAUNCHER" --logs --help >"$TMP_ROOT/logs-before.out" 2>"$TMP_ROOT/logs-before.err"; then
  platform_fail cli/src/elo.sh "--logs before a command must be accepted"
elif ! grep -F '🔎 command=--help' "$TMP_ROOT/logs-before.err" >/dev/null 2>&1; then
  platform_fail cli/src/elo.sh "--logs before a command must enable diagnostics"
fi

if ! "$LAUNCHER" --help --logs >"$TMP_ROOT/logs-after.out" 2>"$TMP_ROOT/logs-after.err"; then
  platform_fail cli/src/elo.sh "--logs after a command must be accepted"
elif ! grep -F '🔎 command=--help' "$TMP_ROOT/logs-after.err" >/dev/null 2>&1; then
  platform_fail cli/src/elo.sh "--logs after a command must enable diagnostics"
fi

if ! "$LAUNCHER" doctor --logs --help >"$TMP_ROOT/doctor-logs.out" 2>"$TMP_ROOT/doctor-logs.err"; then
  platform_fail cli/src/commands/doctor.sh "a dispatched command must accept global --logs"
elif ! grep -F '🔎 doctor module initialized' "$TMP_ROOT/doctor-logs.err" >/dev/null 2>&1; then
  platform_fail cli/src/commands/doctor.sh "a dispatched command must observe ELO_LOGS=true"
fi

scaffold_root="$TMP_ROOT/scaffold-checkout"
scaffold_launcher="$scaffold_root/cli/elo"
mkdir -p \
  "$scaffold_root/.agents/adrs" \
  "$scaffold_root/.agents/rules" \
  "$scaffold_root/.agents/specs" \
  "$scaffold_root/.agents/skills"
cp -R "$PROJECT_ROOT/cli" "$scaffold_root/cli"
cp -R "$PROJECT_ROOT/.agents/prompts" "$scaffold_root/.agents/prompts"
: >"$scaffold_root/.agents/adrs/0025-existing.adr.md"
scaffold_rule_number=1
for scaffold_rule in architecture code-style context-engineering import-boundaries markdown memory-nucleus package-ownership product-safety-and-privacy react-and-next source-organization spec-driven-development; do
  scaffold_rule_prefix=$(printf '%03d' "$scaffold_rule_number")
  : >"$scaffold_root/.agents/rules/$scaffold_rule_prefix-$scaffold_rule.rule.md"
  scaffold_rule_number=$((scaffold_rule_number + 1))
done
cat >"$scaffold_root/.agents/specs/030-existing.spec.md" <<'EOF'
---
id: SPEC-030
---
EOF

if ! "$scaffold_launcher" spec >"$TMP_ROOT/scaffold-spec.out" 2>&1; then
  platform_fail cli/src/commands/scaffold.sh "elo spec failed in the isolated checkout"
elif [ ! -f "$scaffold_root/.agents/specs/031-new-spec.spec.md" ]; then
  platform_fail cli/src/commands/scaffold.sh "elo spec did not allocate the next priority"
elif ! grep -F 'id: SPEC-031' "$scaffold_root/.agents/specs/031-new-spec.spec.md" >/dev/null 2>&1; then
  platform_fail cli/src/commands/scaffold.sh "elo spec did not allocate the next durable ID"
elif ! grep -F '## Failure Behavior' "$scaffold_root/.agents/specs/031-new-spec.spec.md" >/dev/null 2>&1; then
  platform_fail .agents/prompts/spec.prompt.md "generated spec is missing canonical headings"
fi

if ! "$scaffold_launcher" adr >"$TMP_ROOT/scaffold-adr.out" 2>&1 ||
  [ ! -f "$scaffold_root/.agents/adrs/0026-new-adr.adr.md" ]
then
  platform_fail cli/src/commands/scaffold.sh "elo adr did not allocate the next ADR"
fi

if ! "$scaffold_launcher" rule >"$TMP_ROOT/scaffold-rule.out" 2>&1 ||
  scaffold_default_rule_name=012-new-rule.rule.md
  [ ! -f "$scaffold_root/.agents/rules/$scaffold_default_rule_name" ]
then
  platform_fail cli/src/commands/scaffold.sh "elo rule did not reserve the post-migration rule number"
fi

if ! "$scaffold_launcher" skill >"$TMP_ROOT/scaffold-skill.out" 2>&1 ||
  [ ! -f "$scaffold_root/.agents/skills/new-skill/SKILL.md" ]
then
  platform_fail cli/src/commands/scaffold.sh "elo skill did not create the canonical SKILL.md path"
fi

"$scaffold_launcher" skill >"$TMP_ROOT/scaffold-skill-repeat.out" 2>&1
scaffold_repeat_status=$?
[ "$scaffold_repeat_status" -eq 2 ] ||
  platform_fail cli/src/commands/scaffold.sh "scaffolding must not overwrite an existing target"

"$scaffold_launcher" spec 'Bad Name' >"$TMP_ROOT/scaffold-invalid.out" 2>&1
scaffold_invalid_status=$?
[ "$scaffold_invalid_status" -eq 2 ] ||
  platform_fail cli/src/commands/scaffold.sh "invalid artifact names must exit 2"

cat >"$scaffold_root/.agents/specs/040-first.spec.md" <<'EOF'
---
id: SPEC-040
---
EOF
cat >"$scaffold_root/.agents/specs/040-second.spec.md" <<'EOF'
---
id: SPEC-041
---
EOF
"$scaffold_launcher" spec duplicate >"$TMP_ROOT/scaffold-duplicate-prefix.out" 2>&1
scaffold_duplicate_prefix_status=$?
[ "$scaffold_duplicate_prefix_status" -ne 0 ] ||
  platform_fail cli/src/commands/scaffold.sh "duplicate artifact prefixes must block allocation"
grep -F 'Duplicate artifact prefix: 040' "$TMP_ROOT/scaffold-duplicate-prefix.out" >/dev/null 2>&1 ||
  platform_fail cli/src/commands/scaffold.sh "duplicate-prefix failure lacks clear guidance"

rm -f "$scaffold_root/.agents/specs/040-second.spec.md"
cat >"$scaffold_root/.agents/specs/041-second.spec.md" <<'EOF'
---
id: SPEC-040
---
EOF
"$scaffold_launcher" spec duplicate >"$TMP_ROOT/scaffold-duplicate-id.out" 2>&1
scaffold_duplicate_id_status=$?
[ "$scaffold_duplicate_id_status" -ne 0 ] ||
  platform_fail cli/src/commands/scaffold.sh "duplicate SPEC IDs must block allocation"
grep -F 'Duplicate SPEC durable ID: SPEC-040' "$TMP_ROOT/scaffold-duplicate-id.out" >/dev/null 2>&1 ||
  platform_fail cli/src/commands/scaffold.sh "duplicate-ID failure lacks clear guidance"

if find "$scaffold_root/.agents" \
  \( -type f -name '*.tmp.*' -o -type d -name '.elo-scaffold.*' \) -print |
  grep . >/dev/null 2>&1
then
  platform_fail cli/src/commands/scaffold.sh "failed scaffolding left partial staging state"
fi

"$LAUNCHER" unknown-command >"$TMP_ROOT/unknown.out" 2>"$TMP_ROOT/unknown.err"
unknown_status=$?
[ "$unknown_status" -eq 2 ] ||
  platform_fail cli/src/elo.sh "unknown commands must exit with status 2"

"$LAUNCHER" check unknown-check >"$TMP_ROOT/unknown-check.out" 2>"$TMP_ROOT/unknown-check.err"
unknown_check_status=$?
[ "$unknown_check_status" -eq 2 ] ||
  platform_fail cli/src/elo.sh "invalid check subcommands must exit with status 2"

collision_bin="$TMP_ROOT/collision-bin"
mkdir "$collision_bin"
printf '#!/bin/sh\nexit 0\n' >"$collision_bin/elo"
chmod 755 "$collision_bin/elo"
cp "$collision_bin/elo" "$TMP_ROOT/unmanaged.first"
CI= ELO_SETUP_DISABLED= ELO_BIN_DIR="$collision_bin" \
  "$LAUNCHER" setup >"$TMP_ROOT/collision.out" 2>&1
collision_status=$?
[ "$collision_status" -ne 0 ] ||
  platform_fail cli/src/commands/setup.sh "manual setup must reject an unmanaged Elo collision"
cmp -s "$TMP_ROOT/unmanaged.first" "$collision_bin/elo" ||
  platform_fail cli/src/commands/setup.sh "manual setup modified an unmanaged Elo collision"

if ! CI= ELO_SETUP_DISABLED= ELO_BIN_DIR="$collision_bin" \
  "$LAUNCHER" setup --postinstall >"$TMP_ROOT/lifecycle-collision.out" 2>&1
then
  platform_fail cli/src/commands/setup.sh "lifecycle setup must skip an unmanaged collision"
elif ! grep -F 'unmanaged command already exists' "$TMP_ROOT/lifecycle-collision.out" >/dev/null 2>&1
then
  platform_fail cli/src/commands/setup.sh "lifecycle collision skip must emit a warning"
fi
cmp -s "$TMP_ROOT/unmanaged.first" "$collision_bin/elo" ||
  platform_fail cli/src/commands/setup.sh "lifecycle setup modified an unmanaged collision"

symlink_bin="$TMP_ROOT/symlink-bin"
symlink_sentinel="$TMP_ROOT/symlink-sentinel"
mkdir "$symlink_bin"
printf 'sentinel remains intact\n' >"$symlink_sentinel"
if ! ln -s "$symlink_sentinel" "$symlink_bin/elo"; then
  platform_fail cli/src/commands/setup.sh "cannot prepare the symlink-collision fixture"
else
  CI= ELO_SETUP_DISABLED= ELO_BIN_DIR="$symlink_bin" \
    "$LAUNCHER" setup >"$TMP_ROOT/symlink.out" 2>&1
  symlink_status=$?
  [ "$symlink_status" -ne 0 ] ||
    platform_fail cli/src/commands/setup.sh "manual setup must reject an Elo symlink collision"
  [ -L "$symlink_bin/elo" ] ||
    platform_fail cli/src/commands/setup.sh "manual setup replaced an Elo symlink collision"
  [ "$(cat "$symlink_sentinel")" = 'sentinel remains intact' ] ||
    platform_fail cli/src/commands/setup.sh "manual setup modified a symlink target"
fi

nonregular_bin="$TMP_ROOT/nonregular-bin"
mkdir "$nonregular_bin"
mkdir "$nonregular_bin/elo"
CI= ELO_SETUP_DISABLED= ELO_BIN_DIR="$nonregular_bin" \
  "$LAUNCHER" setup >"$TMP_ROOT/nonregular.out" 2>&1
nonregular_status=$?
[ "$nonregular_status" -ne 0 ] ||
  platform_fail cli/src/commands/setup.sh "manual setup must reject a non-regular Elo collision"
[ -d "$nonregular_bin/elo" ] ||
  platform_fail cli/src/commands/setup.sh "manual setup replaced a non-regular Elo collision"

doctor_fifo_bin="$TMP_ROOT/doctor-fifo-bin"
doctor_fifo_opened="$TMP_ROOT/doctor-fifo-opened"
mkdir "$doctor_fifo_bin"
if ! mkfifo "$doctor_fifo_bin/elo"; then
  platform_fail cli/src/commands/doctor.sh "cannot prepare the FIFO safety fixture"
else
  (
    exec 3>"$doctor_fifo_bin/elo"
    : >"$doctor_fifo_opened"
    printf '#!/bin/sh\n# managed-by: amarelo-elo\n' >&3
  ) &
  doctor_fifo_writer=$!
  ELO_BIN_DIR="$doctor_fifo_bin" "$LAUNCHER" doctor \
    >"$TMP_ROOT/doctor-fifo.out" 2>&1 || :
  if [ -e "$doctor_fifo_opened" ]; then
    platform_fail cli/src/commands/doctor.sh "doctor opened a non-regular direct-command path"
  fi
  kill "$doctor_fifo_writer" 2>/dev/null || :
  wait "$doctor_fifo_writer" 2>/dev/null || :
  doctor_fifo_writer=
fi

ci_bin="$TMP_ROOT/ci-bin"
if ! CI=1 ELO_SETUP_DISABLED= ELO_BIN_DIR="$ci_bin" \
  "$LAUNCHER" setup --postinstall >"$TMP_ROOT/ci-setup.out" 2>&1
then
  platform_fail cli/src/commands/setup.sh "postinstall setup must skip cleanly in CI"
elif [ -e "$ci_bin/elo" ]; then
  platform_fail cli/src/commands/setup.sh "CI postinstall must not create a user launcher"
fi

disabled_bin="$TMP_ROOT/disabled-bin"
if ! CI= ELO_SETUP_DISABLED=1 ELO_BIN_DIR="$disabled_bin" \
  "$LAUNCHER" setup --postinstall >"$TMP_ROOT/disabled-setup.out" 2>&1
then
  platform_fail cli/src/commands/setup.sh "explicitly disabled postinstall setup must skip cleanly"
elif [ -e "$disabled_bin/elo" ]; then
  platform_fail cli/src/commands/setup.sh "disabled postinstall must not create a user launcher"
fi

if ! CI= ELO_SETUP_DISABLED= ELO_BIN_DIR= PNPM_HOME= XDG_BIN_HOME= HOME= \
  "$LAUNCHER" setup --postinstall >"$TMP_ROOT/no-destination.out" 2>&1
then
  platform_fail cli/src/commands/setup.sh "lifecycle setup without a destination must skip cleanly"
elif ! grep -F 'no user binary directory is available' "$TMP_ROOT/no-destination.out" >/dev/null 2>&1
then
  platform_fail cli/src/commands/setup.sh "missing-destination lifecycle skip must emit a warning"
fi

if [ "$failures" -gt 0 ]; then
  printf 'Elo platform audit FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Elo platform audit PASS\n'
printf 'cli/elo binary placement: PASS\n'
printf 'shell control plane and executable automation: PASS\n'
printf 'direct user launcher: PASS\n'
printf 'Turbo command boundary: PASS\n'
printf 'package lifecycle contract: PASS\n'
printf 'thin Git adapters: PASS\n'
