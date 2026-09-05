#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
exec node --import tsx src/mvp/local-mvp.command.ts "$@"
