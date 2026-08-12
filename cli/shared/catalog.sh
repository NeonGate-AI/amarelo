#!/usr/bin/env bash
# Sim CLI — command catalog. Data only; routing lives in cli.sh.
# Bash 3 compatible: plain indexed arrays of "field|field|field" strings.

CLI_GROUPS=(
  "Workspace|Environment setup."
  "Audit|Repository health and architecture analysis."
  "Validation|Correctness and environment checks."
  "Utilities|Developer utilities."
  "Git|Husky-invoked Git hooks."
)

CLI_CATALOG=(
  "Workspace|env setup|Copy each app's .env.template to .env (skips existing)."
  "Workspace|env validate|Verify every .env.template key exists in its .env."

  "Audit|audit --all|Run every audit module and aggregate a report."
  "Audit|audit circular|Detect circular dependencies (madge)."

  "Validation|doctor|Diagnose Node, pnpm and env state."
  "Validation|health|Validate core CLI commands."

  "Utilities|clean|Remove node_modules, .turbo, dist, .next and tsbuildinfo."

  "Git|git-commit-msg|Lint the commit message (conventional commits)."
  "Git|git-pre-commit|Run build, tests and lint-staged before commit."
  "Git|git-post-pull|Re-run pnpm install after merge or pull."
)

CLI_ALIASES=()
