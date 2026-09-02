#!/usr/bin/env sh
set -eu
cd "$ELO_PROJECT_ROOT"
exec pnpm exec lint-staged
