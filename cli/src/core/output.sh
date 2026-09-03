#!/bin/sh

: "${ELO_LOGS:=false}"

if [ "${NO_COLOR+x}" != x ] && { [ "${ELO_FORCE_COLOR:-0}" = 1 ] || [ -t 1 ]; }; then
  ELO_COLOR_YELLOW=$(printf '\033[33m')
  ELO_COLOR_GREEN=$(printf '\033[32m')
  ELO_COLOR_RED=$(printf '\033[31m')
  ELO_COLOR_CYAN=$(printf '\033[36m')
  ELO_COLOR_DIM=$(printf '\033[2m')
  ELO_COLOR_RESET=$(printf '\033[0m')
else
  ELO_COLOR_YELLOW=
  ELO_COLOR_GREEN=
  ELO_COLOR_RED=
  ELO_COLOR_CYAN=
  ELO_COLOR_DIM=
  ELO_COLOR_RESET=
fi

ELO_ICON_SUCCESS='✅'
ELO_ICON_WARNING='⚠️'
ELO_ICON_ERROR='❌'
ELO_ICON_INFO='ℹ️'
ELO_ICON_LOG='🔎'

elo_print_logo() {
  printf '%s\n' \
    "${ELO_COLOR_YELLOW}███████╗██╗      ██████╗ " \
    "██╔════╝██║     ██╔═══██╗" \
    "█████╗  ██║     ██║   ██║" \
    "██╔══╝  ██║     ██║   ██║" \
    "███████╗███████╗╚██████╔╝" \
    "╚══════╝╚══════╝ ╚═════╝ ${ELO_COLOR_RESET}"
}

elo_print_success() {
  printf '%s%s %s%s\n' "$ELO_COLOR_GREEN" "$ELO_ICON_SUCCESS" "$*" "$ELO_COLOR_RESET"
}

elo_print_warning() {
  printf '%s%s %s%s\n' "$ELO_COLOR_YELLOW" "$ELO_ICON_WARNING" "$*" "$ELO_COLOR_RESET" >&2
}

elo_print_error() {
  printf '%s%s %s%s\n' "$ELO_COLOR_RED" "$ELO_ICON_ERROR" "$*" "$ELO_COLOR_RESET" >&2
}

elo_print_info() {
  printf '%s%s %s%s\n' "$ELO_COLOR_CYAN" "$ELO_ICON_INFO" "$*" "$ELO_COLOR_RESET"
}

elo_log() {
  [ "$ELO_LOGS" = true ] || return 0
  printf '%s%s %s%s\n' "$ELO_COLOR_DIM" "$ELO_ICON_LOG" "$*" "$ELO_COLOR_RESET" >&2
}
