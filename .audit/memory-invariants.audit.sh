#!/bin/sh
set -eu

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

MEMORY_ROOT="$PROJECT_ROOT/workspaces/memory-nucleus"
SOURCE_ROOT="$MEMORY_ROOT/src"
errors=0

memory_fail() {
  printf '%s\n' "- $1" >&2
  errors=$((errors + 1))
}

for relative_path in \
  domain \
  application/use-cases \
  application/ports \
  application/validation \
  infrastructure/adapters \
  infrastructure/adapters/persistence/neo4j \
  infrastructure/database/neo4j/neo4j-memory.factory.ts \
  infrastructure/database/neo4j/neo4j-memory.schema.ts \
  application/contracts/operational-memory.contract.ts \
  application/contracts/memory-usage-ledger.contract.ts \
  infrastructure/database/schema.sql \
  assurance/evals \
  domain/value-objects/memory-judgment.vo.ts \
  domain/services/memory-economics.compute.ts
do
  [ -e "$SOURCE_ROOT/$relative_path" ] ||
    memory_fail "missing src/$relative_path"
done

# Structural guard only. Real graph behavior is proved by the mandatory CI suite.
integration_root="$PROJECT_ROOT/workspaces/microservices/chatterbox/src/assurance/tests/operational-memory"
for integration in operational-memory authority candidate-delivery readiness http-memory operational-memory-usage; do
  [ -f "$integration_root/$integration.integration.test.ts" ] ||
    memory_fail "missing operational Neo4j assurance seam: $integration"
done
grep -F 'pnpm --filter chatterbox run test:integration' "$PROJECT_ROOT/.github/workflows/ci.yml" >/dev/null 2>&1 ||
  memory_fail "CI must run the public operational Memory integration suite"

for relative_path in apps packages scripts docs db/migrations; do
  [ ! -e "$MEMORY_ROOT/$relative_path" ] ||
    memory_fail "production/nested path must not exist: $relative_path"
done

for relative_path in \
  application/services/memory-query.validator.ts \
  application/services/memory-record.validator.ts
do
  [ ! -e "$SOURCE_ROOT/$relative_path" ] ||
    memory_fail "legacy validation module remains: $relative_path"
done

manifest="$MEMORY_ROOT/package.json"
package_name=$(
  sed -n 's/^[[:space:]]*"name":[[:space:]]*"\([^"]*\)".*/\1/p' "$manifest" |
    sed -n '1p'
)
[ "$package_name" = "@nucleus/memory" ] ||
  memory_fail "Memory Nucleus package must be @nucleus/memory"

grep -F '"@langchain/langgraph"' "$manifest" >/dev/null 2>&1 ||
  memory_fail "the approved background orchestration requires LangGraph"
[ -f "$SOURCE_ROOT/infrastructure/orchestration/langgraph-memory-background.adapter.ts" ] ||
  memory_fail "LangGraph must remain behind its infrastructure orchestration adapter"
if grep -R -n -F '@langchain/langgraph' \
  "$SOURCE_ROOT/domain" "$SOURCE_ROOT/application"
then
  memory_fail "Domain and Application must not depend on LangGraph"
fi

schema="$SOURCE_ROOT/infrastructure/database/schema.sql"
for marker in \
  memory_evidence \
  memory_candidates \
  memories \
  memory_versions \
  memory_search_projections \
  tsvector \
  memory_consent_ledger
do
  grep -F "$marker" "$schema" >/dev/null 2>&1 ||
    memory_fail "schema missing $marker"
done

for marker in \
  memory_outbox \
  fencing_token \
  dead_letter \
  export_artifact \
  suppression_hmac
do
  if grep -F "$marker" "$schema" >/dev/null 2>&1; then
    memory_fail "production-only schema concept remains: $marker"
  fi
done

retrieval_use_case="$SOURCE_ROOT/application/use-cases/retrieve-memory.use-case.ts"
repository_search="$SOURCE_ROOT/application/services/memory-repository-search.service.ts"
query_validation="$SOURCE_ROOT/application/validation/memory-query.validate.ts"

grep -F 'vectorFallback: false' "$repository_search" >/dev/null 2>&1 ||
  memory_fail "retrieval must keep vector fallback disabled in MVP baseline"

if ! grep -F 'maxTokens' "$retrieval_use_case" >/dev/null 2>&1 &&
  ! grep -F 'maxTokens' "$query_validation" >/dev/null 2>&1
then
  memory_fail "retrieval must enforce token budgeting"
fi

if [ "$errors" -gt 0 ]; then
  printf 'Memory invariants FAIL\n' >&2
  exit 1
fi

printf 'Memory invariants PASS\n'
printf 'single workspace: PASS\n'
printf 'clean layers: PASS\n'
printf 'validation ownership: PASS\n'
printf 'PostgreSQL reference baseline: PASS\n'
printf 'Neo4j operational assurance structure: PASS\n'
printf 'retrieval/token budget: PASS\n'
