#!/usr/bin/env bash
# Sim CLI — shared bash primitives.
# Sourced by every command. Defines the centralized emoji token system, the
# command lifecycle primitives (cli_section, cli_intent, cli_step, cli_result,
# cli_row, cli_done, cli_warn, cli_error), and the print_banner helper used by
# the dispatcher.
#
# Rules:
#   - No command file declares its own EMOJI_* or color escape. All UX comes
#     from this file.
#   - Every emoji in command output expands from a centralized variable.
#   - Bash 3 compatible (no declare -A, no mapfile, no ${var,,}).

# ─── Centralized emoji tokens ──────────────────────────────────────────────
# Semantic — same meaning always maps to the same token.
EMOJI_SUCCESS="✅"
EMOJI_WARNING="⚠️"
EMOJI_ERROR="❌"
EMOJI_INFO="ℹ️"
EMOJI_STEP="🔹"

# Vibrancy — reserved for specific operational moments.
EMOJI_RUNTIME="🚀"
EMOJI_HOT="🔥"
EMOJI_EXPLOSION="💥"
EMOJI_PARTY="🎉"
EMOJI_BRAIN="🧠"
EMOJI_PACKAGE="📦"

# ─── Environment ───────────────────────────────────────────────────────────
CLI_VERBOSE="${LOGS:-false}"

CLI_TTY=false
if [[ -t 1 ]]; then
  CLI_TTY=true
fi

# ─── Color escapes ─────────────────────────────────────────────────────────
# Gated behind CLI_TTY so non-TTY output (CI logs, file redirects) stays plain.
if [[ "$CLI_TTY" == "true" ]]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
else
  C_RESET=""
  C_BOLD=""
  C_DIM=""
  C_RED=""
  C_GREEN=""
  C_YELLOW=""
fi

print_banner() {
  echo -e "\033[0m

\033[38;2;255;196;0m███████╗██╗███╗   ███╗\033[0m
\033[38;2;255;196;0m██╔════╝██║████╗ ████║\033[0m
\033[38;2;255;196;0m███████╗██║██╔████╔██║\033[0m
\033[38;2;255;196;0m╚════██║██║██║╚██╔╝██║\033[0m
\033[38;2;255;196;0m███████║██║██║ ╚═╝ ██║\033[0m
\033[38;2;255;196;0m╚══════╝╚═╝╚═╝     ╚═╝\033[0m

\033[38;2;120;120;120mDeveloper CLI\033[0m

"
}

# ─── Output primitives ─────────────────────────────────────────────────────

# cli_section "Runtime"
cli_section() {
  printf "%s%s%s\n" "$C_BOLD" "$1" "$C_RESET"
}

# cli_intent "Starting local runtime stack..."
cli_intent() {
  printf "%s%s%s\n\n" "$C_DIM" "$1" "$C_RESET"
}

# cli_step <n> <total> "Description"
cli_step() {
  local n="$1" total="$2" desc="$3"
  printf "%s [%d/%d] %s\n" "$EMOJI_STEP" "$n" "$total" "$desc"
}

# cli_step_run <n> <total> "Description" cmd args...
# Prints the step line, runs the command, handles failure.
# In TTY non-verbose: command runs silently with a spinner.
# In LOGS=true or non-TTY: command output is interleaved.
cli_step_run() {
  local n="$1" total="$2" desc="$3"
  shift 3

  if [[ "$CLI_VERBOSE" == "true" || "$CLI_TTY" != "true" ]]; then
    cli_step "$n" "$total" "$desc"
    if ! "$@"; then
      cli_error "Step '$desc' failed" "Run with LOGS=true for full output."
      exit 1
    fi
  else
    printf "%s [%d/%d] %s" "$EMOJI_STEP" "$n" "$total" "$desc"
    "$@" >/dev/null 2>&1 &
    local pid=$!
    local frames='|/-\'
    local i=0
    while kill -0 "$pid" 2>/dev/null; do
      printf " [%s]" "${frames:$i:1}"
      i=$(((i + 1) % 4))
      sleep 0.08
      printf "\b\b\b\b"
    done
    if ! wait "$pid"; then
      printf "\n"
      cli_error "Step '$desc' failed" "Run with LOGS=true for full output."
      exit 1
    fi
    printf "    \n"
  fi
}

# cli_result "Success" | "Failure" | "Warnings"
cli_result() {
  local header="$1"
  local emoji color
  case "$header" in
    Success)  emoji="$EMOJI_SUCCESS"; color="$C_GREEN" ;;
    Failure)  emoji="$EMOJI_ERROR";   color="$C_RED" ;;
    Warnings) emoji="$EMOJI_WARNING"; color="$C_YELLOW" ;;
    *)        emoji="";              color="" ;;
  esac
  printf "\n%s %s%s%s%s\n" "$emoji" "$C_BOLD" "$color" "$header" "$C_RESET"
}

# cli_row "key" "value" [color]
# Aligned 2-column row inside a result block. The CLI_ROW_KEY_WIDTH variable
# can be set by the caller before printing rows for nicer alignment; otherwise
# a 28-character minimum is used.
cli_row() {
  local key="$1" value="$2" color_name="${3:-}"
  local color=""
  case "$color_name" in
    green)  color="$C_GREEN" ;;
    red)    color="$C_RED" ;;
    yellow) color="$C_YELLOW" ;;
    dim)    color="$C_DIM" ;;
    *)      color="" ;;
  esac
  local width="${CLI_ROW_KEY_WIDTH:-28}"
  printf "%-${width}s  %s%s%s\n" "$key" "$color" "$value" "$C_RESET"
}

# cli_done "Runtime stack ready."
cli_done() {
  printf "\n%s\n" "$1"
}

# cli_warn "<message>"
cli_warn() {
  printf "%s %sWarning:%s %s\n" "$EMOJI_WARNING" "$C_YELLOW" "$C_RESET" "$1"
}

# cli_error "<message>" ["context"]
cli_error() {
  printf "%s %sError:%s %s\n" "$EMOJI_ERROR" "$C_RED" "$C_RESET" "$1" >&2
  if [[ -n "${2:-}" ]]; then
    printf "%s %s\n" "$EMOJI_INFO" "$2" >&2
  fi
}
