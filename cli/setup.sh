#!/usr/bin/env bash
# Sim. CLI installer — `pnpm cli [install|doctor|status|uninstall]`.
# Installation lifecycle only (can this machine find & launch Sim.?).
# Runtime diagnostics live in `sim doctor`, not here.
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$PKG_DIR/.." && pwd)"
source "$PKG_DIR/shared/core.sh"
source "$PKG_DIR/shared/setup-lib.sh"

CLI_VERSION="$(sim_json "$REPO_ROOT/package.json" version)"
[[ -n "$CLI_VERSION" ]] || CLI_VERSION="dev"

# ─── Args ───────────────────────────────────────────────────────────────────
SUBCOMMAND="install"
ASSUME_YES=false
JSON=false
[[ "${CI:-}" == "true" || "${CI:-}" == "1" ]] && ASSUME_YES=true

for arg in "$@"; do
  case "$arg" in
    install|doctor|status|uninstall|activate) SUBCOMMAND="$arg" ;;
    -y|--yes) ASSUME_YES=true ;;
    --json)   JSON=true ;;
    *) ;;
  esac
done

# ─── install ──────────────────────────────────────────────────────────────
cmd_install() {
  print_banner
  cli_section "Sim. CLI Setup"

  sim_detect_shell
  local os repo name remote on_path launcher_state block_needed
  os="$(sim_os)"
  repo="$(sim_repo_root "$REPO_ROOT")"; [[ -n "$repo" ]] || repo="$REPO_ROOT"
  name="$(sim_repo_name "$repo")"
  remote="$(sim_repo_remote "$repo")"
  sim_local_bin_on_path && on_path=true || on_path=false
  sim_launcher_is_ours "$SIM_LAUNCHER" && launcher_state="present" || launcher_state="absent"
  [[ "$on_path" == "true" ]] && block_needed=false || block_needed=true

  cli_intent "Detected:"
  CLI_ROW_KEY_WIDTH=18
  cli_row "OS" "$os" "green"
  cli_row "Shell" "$SIM_SHELL_NAME ($SIM_SHELL_RC)" "green"
  cli_row "Workspace" "$name" "green"
  cli_row "Launcher" "$SIM_LAUNCHER ($launcher_state)" "dim"
  cli_row "~/.local/bin on PATH" "$on_path" "$([[ "$on_path" == true ]] && echo green || echo yellow)"

  printf "\nTo make \`sim\` available in every future terminal, Sim will install a\nuser-local launcher at %s and point it at this repo via\n%s.\n" \
    "$SIM_LAUNCHER" "$SIM_CONFIG"
  if [[ "$block_needed" == "true" ]]; then
    printf "\nBecause %s is not on PATH, Sim will add this managed block to %s:\n\n  %s\n  export PATH=\"\$HOME/.local/bin:\$PATH\"\n  %s\n" \
      "$SIM_LOCAL_BIN" "$SIM_SHELL_RC" "$SIM_BLOCK_BEGIN" "$SIM_BLOCK_END"
  else
    printf "\n%s is already on PATH — no shell configuration will change.\n" "$SIM_LOCAL_BIN"
  fi
  printf "\nThis change is user-local, reversible, idempotent, and managed by Sim.\nNo global packages are installed and no existing configuration is overwritten.\n\n"

  if [[ "$ASSUME_YES" != "true" ]]; then
    if [[ ! -t 0 ]]; then
      cli_error "Non-interactive shell and no consent flag." "Re-run with: pnpm cli --yes"
      exit 1
    fi
    local ans=""
    printf "Proceed with installation? [Y/n] "
    read -r ans || ans="Y"
    case "${ans:-Y}" in [Nn]*) cli_done "Aborted. No changes made."; exit 0 ;; esac
  fi

  # Apply.
  cli_step 1 4 "Repairing executable permissions"
  chmod +x "$repo"/cli/*.sh "$repo"/cli/commands/**/*.sh "$repo"/cli/audit/**/*.sh "$repo"/cli/shared/*.sh "$repo"/cli/m 2>/dev/null || true
  find "$repo/cli/husky" -maxdepth 1 -type f -exec chmod +x {} + 2>/dev/null || true

  cli_step 2 4 "Installing launcher → $SIM_LAUNCHER"
  sim_generate_launcher

  cli_step 3 4 "Writing configuration → $SIM_CONFIG_DIR"
  sim_write_config "$repo" "$name" "$remote"
  local added=false rc_record=""
  if [[ "$block_needed" == "true" ]]; then
    # We own a managed block in this rc whether or not THIS run created it,
    # so uninstall can always find and remove it.
    rc_record="$SIM_SHELL_RC"
    sim_add_block "$SIM_SHELL_RC" && added=true || true
  fi
  sim_write_install "$SIM_LAUNCHER" "$rc_record" "$added" "$CLI_VERSION"
  sim_write_cache "$repo" "$repo"   # seed recovery cache with this repo
  sim_log_to "install.log" "install repo=$repo block_added=$added launcher_v=$SIM_LAUNCHER_VERSION cli_v=$CLI_VERSION"

  cli_step 4 4 "Validating installation"
  if ! "$SIM_LAUNCHER" --help >/dev/null 2>&1; then
    cli_error "Launcher failed to execute the dispatcher." "Repro: bash $repo/cli/cli.sh --help"
    exit 1
  fi

  # Auto-run install doctor; installation is complete only when it passes.
  printf "\n"
  if ! cmd_doctor; then
    cli_error "Installation incomplete — \`pnpm cli doctor\` reported problems (above)."
    exit 1
  fi

  cli_done "$EMOJI_PARTY Sim CLI installed."
  # Base the next step on whether ~/.local/bin is live in THIS shell — not on
  # whether this run wrote the block. A child process can't change the parent
  # shell's PATH, so if it isn't live yet the user MUST start a new shell or
  # eval the activate output into the current one.
  if sim_local_bin_on_path; then
    printf "Run: %ssim doctor%s\n" "$C_BOLD" "$C_RESET"
  else
    local reload_cmd; reload_cmd="$(sim_reload_cmd)"
    local box_line="────────────────────────────────────────────────────────────────"
    printf "\n%s%s%s%s\n" "$C_BOLD" "$C_YELLOW" "$box_line" "$C_RESET"
    printf "%s%s  %s  ONE MORE STEP — \`sim\` is not on PATH in this shell yet.%s\n" "$C_BOLD" "$C_YELLOW" "$EMOJI_WARNING" "$C_RESET"
    printf "%s%s%s%s\n\n" "$C_BOLD" "$C_YELLOW" "$box_line" "$C_RESET"
    printf "  %sActivate now (this shell):%s\n" "$C_BOLD" "$C_RESET"
    printf "    %s%seval \"\$(pnpm -s cli activate)\"%s\n\n" "$C_BOLD" "$C_GREEN" "$C_RESET"
    printf "  %sOr restart the shell:%s\n" "$C_BOLD" "$C_RESET"
    printf "    %s%s%s%s\n\n" "$C_BOLD" "$C_GREEN" "$reload_cmd" "$C_RESET"
    printf "  Then: %ssim doctor%s\n" "$C_BOLD" "$C_RESET"
  fi
}

# ─── activate ───────────────────────────────────────────────────────────────
# Prints shell code to put ~/.local/bin on PATH in the *current* shell. Quiet
# and stdout-only so it composes: `eval "$(pnpm cli activate)"`. Idempotent —
# if ~/.local/bin is already on PATH, prints nothing and exits 0.
cmd_activate() {
  sim_local_bin_on_path && return 0
  printf 'export PATH="%s:$PATH"\n' "$SIM_LOCAL_BIN"
}

# ─── doctor ─────────────────────────────────────────────────────────────────
# Returns 0 healthy, 1 unhealthy. Honors --json.
cmd_doctor() {
  sim_detect_shell
  local repo name remote
  repo="$(sim_json "$SIM_CONFIG" repoPath)"
  name="$(sim_json "$SIM_CONFIG" workspaceName)"
  remote="$(sim_json "$SIM_CONFIG" gitRemote)"

  local ok_launcher=false ok_config=false ok_fp=false ok_path=false ok_block=false ok_dispatch=false ok_husky=false ok_hooks=false
  local husky_ver; husky_ver="$(sim_husky_version "$REPO_ROOT")"
  local hooks_path; hooks_path="$(sim_hooks_path "$repo")"
  local cfg_ver; cfg_ver="$(sim_json_num "$SIM_CONFIG" version)"
  local cfg_age; cfg_age="$(sim_age_days "$(sim_json "$SIM_CONFIG" installedAt)")"
  local launcher_ver; launcher_ver="$(sim_launcher_version "$SIM_LAUNCHER")"
  local cand_count; cand_count="$(sim_cache_paths | sed '/^$/d' | wc -l | tr -d ' ')"
  local cache_state="absent"; [[ -f "$SIM_CACHE" ]] && cache_state="healthy"

  sim_launcher_is_ours "$SIM_LAUNCHER" && "$SIM_LAUNCHER" --help >/dev/null 2>&1 && ok_launcher=true
  [[ -f "$SIM_CONFIG" && -n "$repo" ]] && ok_config=true
  sim_is_repo "$repo" "$name" "$remote" && ok_fp=true
  sim_local_bin_on_path && ok_path=true
  { sim_local_bin_on_path || sim_block_present "$SIM_SHELL_RC"; } && ok_block=true
  [[ -n "$repo" && -f "$repo/cli/cli.sh" ]] && ok_dispatch=true
  [[ -n "$husky_ver" ]] && sim_semver_ge "$husky_ver" "$SIM_HUSKY_MIN" && ok_husky=true
  [[ "$hooks_path" == "$SIM_HOOKS_PATH" ]] && ok_hooks=true

  # Gate on discoverability being *configured* (ok_block: block present or already
  # on PATH), not on the current shell's live PATH (ok_path) — the latter only
  # updates in a new terminal, so it's informational, never fatal.
  local healthy=true
  for f in "$ok_launcher" "$ok_config" "$ok_fp" "$ok_block" "$ok_dispatch" "$ok_husky" "$ok_hooks"; do
    [[ "$f" == "true" ]] || healthy=false
  done

  sim_log_to "doctor.log" "doctor healthy=$healthy launcher=$ok_launcher config=$ok_config fp=$ok_fp path=$ok_block dispatch=$ok_dispatch husky=$ok_husky:$husky_ver hooks=$ok_hooks:$hooks_path"

  if [[ "$JSON" == "true" ]]; then
    # "path" reports whether discovery is *configured* (managed block or already
    # on PATH); "pathActiveInShell" is the (informational) live-shell state.
    printf '{"healthy":%s,"launcher":%s,"config":%s,"fingerprint":%s,"path":%s,"pathActiveInShell":%s,"managedBlock":%s,"dispatcher":%s,"shell":"%s","husky":{"version":"%s","healthy":%s},"hooks":{"path":"%s","healthy":%s},"recovery":{"cache":"%s","candidates":%s},"configVersion":"%s","launcherVersion":"%s","version":"%s"}\n' \
      "$healthy" "$ok_launcher" "$ok_config" "$ok_fp" "$ok_block" "$ok_path" "$ok_block" "$ok_dispatch" \
      "$SIM_SHELL_NAME" "${husky_ver:-unknown}" "$ok_husky" "${hooks_path:-unset}" "$ok_hooks" \
      "$cache_state" "${cand_count:-0}" "${cfg_ver:-unknown}" "${launcher_ver:-unknown}" "$CLI_VERSION"
    [[ "$healthy" == "true" ]] && return 0 || return 1
  fi

  cli_section "Sim CLI — Installation Doctor"
  CLI_ROW_KEY_WIDTH=18
  [[ "$healthy" == "true" ]] && cli_result "Success" || cli_result "Failure"
  cli_row "Shell" "$SIM_SHELL_NAME" "$([[ -n "$SIM_SHELL_NAME" ]] && echo green || echo red)"
  cli_row "Launcher" "$([[ "$ok_launcher" == true ]] && echo "$SIM_LAUNCHER" || echo "missing/broken")" "$([[ "$ok_launcher" == true ]] && echo green || echo red)"
  cli_row "Config" "$([[ "$ok_config" == true ]] && echo healthy || echo missing)" "$([[ "$ok_config" == true ]] && echo green || echo red)"
  cli_row "Fingerprint" "$([[ "$ok_fp" == true ]] && echo "$repo" || echo "repo not found")" "$([[ "$ok_fp" == true ]] && echo green || echo red)"
  # PATH verdict comes from what Sim manages (the rc block, or ~/.local/bin
  # already on PATH) — never from the ambient $PATH of whatever shell ran this.
  local path_label path_color
  if [[ "$ok_block" == true ]]; then
    path_color="green"
    [[ "$ok_path" == true ]] && path_label="configured" || path_label="configured (restart shell to activate)"
  else
    path_color="red"; path_label="not configured"
  fi
  cli_row "PATH" "$path_label" "$path_color"
  cli_row "Dispatcher" "$([[ "$ok_dispatch" == true ]] && echo reachable || echo missing)" "$([[ "$ok_dispatch" == true ]] && echo green || echo red)"
  cli_row "Husky" "$([[ "$ok_husky" == true ]] && echo "${husky_ver}" || echo "${husky_ver:-missing} (require >= $SIM_HUSKY_MIN)")" "$([[ "$ok_husky" == true ]] && echo green || echo red)"
  cli_row "Hooks Path" "$([[ "$ok_hooks" == true ]] && echo "$hooks_path" || echo "${hooks_path:-unset} (expected $SIM_HOOKS_PATH)")" "$([[ "$ok_hooks" == true ]] && echo green || echo red)"
  cli_row "Recovery Cache" "$cache_state" "$([[ "$cache_state" == healthy ]] && echo green || echo dim)"
  cli_row "Candidates" "${cand_count:-0} cached" "dim"
  cli_row "Config Version" "${cfg_ver:-unknown}" "dim"
  cli_row "Config Age" "$([[ -n "$cfg_age" ]] && echo "${cfg_age} days" || echo unknown)" "dim"
  cli_row "Launcher Version" "${launcher_ver:-unknown}" "dim"
  cli_row "CLI Version" "$CLI_VERSION" "dim"

  if [[ "$healthy" != "true" ]]; then
    printf "\n"
    [[ "$ok_launcher" == true ]] || cli_error "Launcher missing/broken." "Run: pnpm cli"
    [[ "$ok_config" == true ]]   || cli_error "Config missing." "Run: pnpm cli"
    [[ "$ok_fp" == true ]]       || cli_error "Configured repo not found or identity mismatch." "cd into the repo and run: pnpm cli"
    [[ "$ok_block" == true ]]    || cli_error "~/.local/bin is not configured for discovery." "Run: pnpm cli"
    [[ "$ok_dispatch" == true ]] || cli_error "Dispatcher (cli/cli.sh) not reachable." "cd into the repo and run: pnpm cli"
    [[ "$ok_husky" == true ]]    || cli_error "Husky version unsupported (need >= $SIM_HUSKY_MIN; Sim uses custom hooks dir cli/husky)." "Bump husky in package.json, then: pnpm install"
    [[ "$ok_hooks" == true ]]    || cli_error "Git hooks misconfigured — core.hooksPath is '${hooks_path:-unset}', expected '$SIM_HOOKS_PATH'." "Run: pnpm install (re-runs husky cli/husky)"
    return 1
  fi
  if [[ "$ok_path" == true ]]; then
    cli_done "$EMOJI_SUCCESS Installation healthy."
  else
    cli_done "$EMOJI_SUCCESS Installation healthy. Open a new terminal (or run: $(sim_reload_cmd)) to use \`sim\`."
  fi
  return 0
}

# ─── status ─────────────────────────────────────────────────────────────────
cmd_status() {
  sim_detect_shell
  cli_section "Sim CLI — Status"
  CLI_ROW_KEY_WIDTH=18
  local installed="no"
  sim_launcher_is_ours "$SIM_LAUNCHER" && [[ -f "$SIM_CONFIG" ]] && installed="yes"
  cli_row "Installed" "$installed" "$([[ "$installed" == yes ]] && echo green || echo yellow)"
  cli_row "Launcher" "$SIM_LAUNCHER" "dim"
  cli_row "Config" "$SIM_CONFIG" "dim"
  cli_row "Repo" "$(sim_json "$SIM_CONFIG" repoPath)" "dim"
  cli_row "Shell" "$SIM_SHELL_NAME ($SIM_SHELL_RC)" "dim"
  local path_state
  if sim_local_bin_on_path; then path_state="configured (active in this shell)"
  elif sim_block_present "$SIM_SHELL_RC"; then path_state="configured (restart shell to activate)"
  else path_state="not configured"; fi
  cli_row "PATH" "$path_state" "$(sim_block_present "$SIM_SHELL_RC" || sim_local_bin_on_path && echo green || echo yellow)"
  cli_row "Managed block" "$(sim_block_present "$SIM_SHELL_RC" && echo present || echo absent)" "dim"
  cli_row "Husky" "$(sim_husky_version "$REPO_ROOT")" "dim"
  cli_done "Run \`pnpm cli doctor\` for health checks."
}

# ─── uninstall ──────────────────────────────────────────────────────────────
cmd_uninstall() {
  cli_section "Sim CLI — Uninstall"
  sim_detect_shell
  local removed_launcher=false removed_block=false block_rc=""

  # Remove the launcher only if it carries our generated signature.
  if sim_launcher_is_ours "$SIM_LAUNCHER"; then
    rm -f "$SIM_LAUNCHER"; removed_launcher=true
  fi

  # Clean the managed block from both the recorded rc and the live-detected rc
  # (dedup), tolerant of missing files — defense in depth if install.json is stale.
  local recorded; recorded="$(sim_json "$SIM_INSTALL" shellRc)"
  local candidate
  for candidate in "$recorded" "$SIM_SHELL_RC"; do
    [[ -n "$candidate" ]] || continue
    if sim_block_present "$candidate"; then
      sim_remove_block "$candidate"
      removed_block=true; block_rc="$candidate"
    fi
  done

  rm -rf "$SIM_CONFIG_DIR"

  CLI_ROW_KEY_WIDTH=18
  cli_result "Success"
  cli_row "Launcher" "$([[ "$removed_launcher" == true ]] && echo removed || echo "not ours / absent")" "dim"
  cli_row "Managed block" "$([[ "$removed_block" == true ]] && echo "removed from $block_rc" || echo "none")" "dim"
  cli_row "Config dir" "removed" "dim"
  cli_done "Sim CLI uninstalled. Nothing else was touched."
  return 0
}

case "$SUBCOMMAND" in
  install)   cmd_install ;;
  doctor)    cmd_doctor ;;
  status)    cmd_status ;;
  uninstall) cmd_uninstall ;;
  activate)  cmd_activate ;;
esac
