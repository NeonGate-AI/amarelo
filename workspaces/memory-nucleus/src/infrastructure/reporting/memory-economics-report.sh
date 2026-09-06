#!/bin/sh
set -eu

CDPATH=
cd -P "$(dirname "$0")/../../.."
exec node --import tsx src/infrastructure/reporting/memory-economics-report.cli.ts "$@"
