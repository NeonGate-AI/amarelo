#!/bin/sh
set -eu
. "$ELO_CLI_DIR/core/common.sh"

elo_has node || elo_die "Node.js 24 is required."
elo_has pnpm || elo_die "pnpm is required. Enable Corepack and activate the packageManager version."
elo_has git || elo_die "Git is required."

cd "$ELO_PROJECT_ROOT"
pnpm install --frozen-lockfile
"$ELO_CLI_DIR/commands/setup.sh" --postclone
"$ELO_CLI_DIR/commands/git-setup.sh" --prepare
exec "$ELO_CLI_DIR/commands/doctor.sh"
