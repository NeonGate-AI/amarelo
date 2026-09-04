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
RUNTIME_ROOT="$PROJECT_ROOT/workspaces/packages/runtime"
KUBERNETES_ROOT="$RUNTIME_ROOT/kubernetes"
RUNTIME_CLI="$RUNTIME_ROOT/src/cli.ts"
RUNTIME_ENV="$RUNTIME_ROOT/.env"
ELO_RUNTIME_COMMAND="$PROJECT_ROOT/cli/src/commands/runtime.sh"
CYPRESS_JOB="$KUBERNETES_ROOT/cypress-job.yaml"
CYPRESS_CONFIG="$RUNTIME_ROOT/cypress/cypress.config.cjs"
CYPRESS_SPEC="$RUNTIME_ROOT/cypress/e2e/runtime.cy.js"
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-runtime-audit.$$"
had_runtime_env=false
mkdir "$TMP_ROOT" || {
  printf 'Runtime audit FAIL: cannot create temporary directory\n' >&2
  exit 1
}
if [ -f "$RUNTIME_ENV" ]; then
  had_runtime_env=true
  cp "$RUNTIME_ENV" "$TMP_ROOT/runtime.env.before"
fi

runtime_audit_cleanup() {
  if [ "$had_runtime_env" = true ]; then
    cp "$TMP_ROOT/runtime.env.before" "$RUNTIME_ENV"
  else
    rm -f "$RUNTIME_ENV"
  fi
  rm -rf "$TMP_ROOT"
}
trap runtime_audit_cleanup 0 1 2 15

failures=0
runtime_fail() {
  failures=$((failures + 1))
  printf '%s\n' "- $1: $2" >&2
}

require_file() {
  [ -f "$1" ] || runtime_fail "${1#"$PROJECT_ROOT"/}" "required Kubernetes runtime file is missing"
}

[ ! -e "$RUNTIME_ROOT/compose.yaml" ] ||
  runtime_fail workspaces/packages/runtime/compose.yaml "Docker Compose must not remain an active runtime source"

for runtime_file in \
  "$KUBERNETES_ROOT/kustomization.yaml" \
  "$KUBERNETES_ROOT/namespace.yaml" \
  "$KUBERNETES_ROOT/config-map.yaml" \
  "$KUBERNETES_ROOT/postgres.yaml" \
  "$KUBERNETES_ROOT/neo4j.yaml" \
  "$KUBERNETES_ROOT/redis-queue.yaml" \
  "$KUBERNETES_ROOT/redis-cache.yaml" \
  "$KUBERNETES_ROOT/object-storage.yaml" \
  "$KUBERNETES_ROOT/apps.yaml"
do
  require_file "$runtime_file"
done

[ ! -e "$KUBERNETES_ROOT/redis.yaml" ] ||
  runtime_fail workspaces/packages/runtime/kubernetes/redis.yaml "ambiguous shared Redis workload must not remain"

if [ -f "$KUBERNETES_ROOT/kustomization.yaml" ]; then
  if ! command -v kubectl >/dev/null 2>&1; then
    runtime_fail kubectl "kubectl is required to render the canonical Kustomize runtime"
  elif ! kubectl kustomize "$KUBERNETES_ROOT" >"$TMP_ROOT/rendered.yaml" 2>"$TMP_ROOT/render.err"; then
    runtime_fail workspaces/packages/runtime/kubernetes/kustomization.yaml "kubectl could not render the Kustomize base"
  else
    for resource_name in amarelo-runtime postgres neo4j redis-queue redis-cache object-storage landing console onboarding mobile chatterbox; do
      grep -F "name: $resource_name" "$TMP_ROOT/rendered.yaml" >/dev/null 2>&1 ||
        runtime_fail workspaces/packages/runtime/kubernetes "rendered resources omit $resource_name"
    done
    [ "$(grep -c '^kind: Deployment$' "$TMP_ROOT/rendered.yaml")" -eq 6 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "runtime must render six Deployments"
    [ "$(grep -c '^kind: StatefulSet$' "$TMP_ROOT/rendered.yaml")" -eq 4 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "runtime must render four StatefulSets"
    [ "$(grep -c '^kind: Service$' "$TMP_ROOT/rendered.yaml")" -eq 10 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "runtime must render ten Services"
    [ "$(grep -c '^kind: PersistentVolumeClaim$' "$TMP_ROOT/rendered.yaml")" -eq 4 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "runtime must render four retained state claims"
    if grep -Eq '^kind: Secret$|POSTGRES_PASSWORD:[[:space:]]*[^|[:space:]]|NEO4J_AUTH:[[:space:]]*[^|[:space:]]|REDIS_(QUEUE|CACHE)_PASSWORD:[[:space:]]*[^|[:space:]]|MINIO_ROOT_PASSWORD:[[:space:]]*[^|[:space:]]' "$TMP_ROOT/rendered.yaml"; then
      runtime_fail workspaces/packages/runtime/kubernetes "tracked manifests must not contain a Secret payload"
    fi
    [ "$(grep -c 'automountServiceAccountToken: false' "$TMP_ROOT/rendered.yaml")" -eq 10 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "every workload must disable service-account token mounting"
    [ "$(grep -c 'readinessProbe:' "$TMP_ROOT/rendered.yaml")" -eq 10 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "every workload must declare readiness"
    [ "$(grep -c 'livenessProbe:' "$TMP_ROOT/rendered.yaml")" -eq 10 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "every workload must declare liveness"
  fi
fi

if [ ! -f "$RUNTIME_CLI" ]; then
  runtime_fail workspaces/packages/runtime/src/cli.ts "runtime command entrypoint is missing"
else
  grep -F "'kubectl'" "$RUNTIME_CLI" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "runtime entrypoint does not invoke kubectl"
  if grep -Eq 'composeActions|[[:space:]]compose[[:space:]]' "$RUNTIME_CLI"; then
    runtime_fail workspaces/packages/runtime/src/cli.ts "runtime entrypoint still owns Docker Compose behavior"
  fi
fi

[ ! -e "$RUNTIME_ROOT/Dockerfile.dev" ] ||
  runtime_fail workspaces/packages/runtime/Dockerfile.dev "runtime must not own a generic application Dockerfile"

for project_container in \
  landing:workspaces/apps/landing \
  console:workspaces/apps/console \
  onboarding:workspaces/apps/onboarding \
  mobile:workspaces/apps/mobile \
  chatterbox:workspaces/microservices/chatterbox
do
  workload=${project_container%%:*}
  project_path=${project_container#*:}
  require_file "$PROJECT_ROOT/$project_path/Dockerfile"
  require_file "$PROJECT_ROOT/$project_path/.env.template"
  grep -F "$project_path/Dockerfile" "$RUNTIME_CLI" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "runtime does not select $workload project Dockerfile"
  grep -F "amarelo-$workload:local" "$KUBERNETES_ROOT/apps.yaml" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/kubernetes/apps.yaml "runtime manifest does not declare the $workload image"
done

if grep -Eq '^[[:space:]]*(OPENAI_API_KEY|[^=]*(TOKEN|SECRET)[^=]*)=' "$PROJECT_ROOT/workspaces/apps/mobile/.env.template"; then
  runtime_fail workspaces/apps/mobile/.env.template "browser template must not declare credentials"
fi

grep -F 'path: /health' "$KUBERNETES_ROOT/apps.yaml" >/dev/null 2>&1 ||
  runtime_fail workspaces/packages/runtime/kubernetes/apps.yaml "Chatterbox must expose health probes"

if grep -F 'Docker Compose' "$RUNTIME_ROOT/readme.md" >/dev/null 2>&1; then
  runtime_fail workspaces/packages/runtime/readme.md "current runtime documentation still requires Docker Compose"
fi

for public_runtime_file in \
  "$ELO_RUNTIME_COMMAND" \
  "$CYPRESS_JOB" \
  "$CYPRESS_CONFIG" \
  "$CYPRESS_SPEC"
do
  require_file "$public_runtime_file"
done

if [ -f "$ELO_RUNTIME_COMMAND" ]; then
  /bin/sh -n "$ELO_RUNTIME_COMMAND" ||
    runtime_fail cli/src/commands/runtime.sh "public runtime adapter is not valid POSIX shell"
  grep -F '<up|down|prune|e2e>' "$ELO_RUNTIME_COMMAND" >/dev/null 2>&1 ||
    runtime_fail cli/src/commands/runtime.sh "public adapter does not expose the exact runtime command family"
fi

if [ -f "$CYPRESS_JOB" ]; then
  grep -F 'image: cypress/included:15.19.0' "$CYPRESS_JOB" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/kubernetes/cypress-job.yaml "Cypress image is not pinned"
  grep -F -- '--headless' "$CYPRESS_JOB" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/kubernetes/cypress-job.yaml "Cypress Job is not explicitly headless"
  grep -F 'automountServiceAccountToken: false' "$CYPRESS_JOB" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/kubernetes/cypress-job.yaml "Cypress Job must disable service-account token mounting"
  grep -F 'backoffLimit: 0' "$CYPRESS_JOB" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/kubernetes/cypress-job.yaml "Cypress Job must report its first failed run"
fi

if [ -f "$CYPRESS_SPEC" ]; then
  for service_url in \
    http://landing:3000 \
    http://console:3001 \
    http://onboarding:3002 \
    http://mobile:3003 \
    http://chatterbox:3004/health
  do
    grep -F "$service_url" "$CYPRESS_SPEC" >/dev/null 2>&1 ||
      runtime_fail workspaces/packages/runtime/cypress/e2e/runtime.cy.js "Cypress suite omits $service_url"
  done
  [ "$(grep -Eo 'https?://' "$CYPRESS_SPEC" | wc -l | tr -d ' ')" -eq 5 ] ||
    runtime_fail workspaces/packages/runtime/cypress/e2e/runtime.cy.js "Cypress suite must contain only the five in-cluster service URLs"
  grep -F 'followRedirect: false' "$CYPRESS_SPEC" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/cypress/e2e/runtime.cy.js "Cypress suite must not follow redirects out of the cluster"
fi

if ! "$PROJECT_ROOT/cli/elo" --help >"$TMP_ROOT/elo-help.out" 2>&1; then
  runtime_fail cli/src/commands/help.sh "Elo help failed while checking runtime commands"
elif ! grep -F 'runtime <up|down|prune|e2e>' "$TMP_ROOT/elo-help.out" >/dev/null 2>&1; then
  runtime_fail cli/src/commands/help.sh "Elo help does not expose the exact runtime command family"
fi

active_compose_references=$(
  git -C "$PROJECT_ROOT" grep -n -E \
    'docker[[:space:]]+compose|compose\.yaml' \
    -- workspaces cli .github 2>/dev/null ||
    true
)
if [ -n "$active_compose_references" ]; then
  runtime_fail repository "active implementation or documentation still references Docker Compose"
  printf '%s\n' "$active_compose_references" >&2
fi

fake_bin="$TMP_ROOT/bin"
command_log="$TMP_ROOT/commands.log"
mkdir "$fake_bin"
: >"$command_log"
cat >"$fake_bin/docker" <<'EOF'
#!/bin/sh
printf 'docker %s\n' "$*" >>"$AMARELO_RUNTIME_AUDIT_LOG"
exit 0
EOF
cat >"$fake_bin/kubectl" <<'EOF'
#!/bin/sh
printf 'kubectl %s\n' "$*" >>"$AMARELO_RUNTIME_AUDIT_LOG"
if [ -n "${AMARELO_RUNTIME_FAIL_MATCH:-}" ]; then
  case "$*" in
    *"$AMARELO_RUNTIME_FAIL_MATCH"*) exit 17 ;;
  esac
fi
case "$*" in
  *"apply --filename -"*) cat >/dev/null ;;
  "config current-context") printf 'kind-amarelo\n' ;;
  "get namespace amarelo-runtime"*)
    if [ "${AMARELO_RUNTIME_NAMESPACE_ABSENT:-}" != true ]; then
      printf 'namespace/amarelo-runtime\n'
    fi
    ;;
  *"get pods"*)
    if [ "${AMARELO_RUNTIME_PODS_REMAINING:-}" = true ]; then
      printf 'pod/runtime-still-terminating\n'
    fi
    ;;
  *"get job amarelo-cypress"*) printf '%s\n' "${AMARELO_RUNTIME_CYPRESS_STATUS:-1:0}" ;;
  *"create secret generic"*) printf 'apiVersion: v1\nkind: Secret\nmetadata:\n  name: amarelo-runtime-environment\n' ;;
  *"create configmap amarelo-cypress-suite"*) printf 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: amarelo-cypress-suite\n' ;;
  *"logs"*"job/amarelo-cypress"*) printf 'Cypress headless PASS\n' ;;
esac
exit 0
EOF
cat >"$fake_bin/kind" <<'EOF'
#!/bin/sh
printf 'kind %s\n' "$*" >>"$AMARELO_RUNTIME_AUDIT_LOG"
exit 0
EOF
cat >"$fake_bin/minikube" <<'EOF'
#!/bin/sh
printf 'minikube %s\n' "$*" >>"$AMARELO_RUNTIME_AUDIT_LOG"
exit 0
EOF
chmod 700 "$fake_bin/docker" "$fake_bin/kubectl" "$fake_bin/kind" "$fake_bin/minikube"

runtime_command() {
  PATH="$fake_bin:$PATH" \
  AMARELO_RUNTIME_AUDIT_LOG="$command_log" \
  AMARELO_RUNTIME_ENV_FILE="$TMP_ROOT/runtime.env" \
  AMARELO_RUNTIME_CYPRESS_STATUS="${AMARELO_RUNTIME_CYPRESS_STATUS:-}" \
  AMARELO_RUNTIME_FAIL_MATCH="${AMARELO_RUNTIME_FAIL_MATCH:-}" \
  AMARELO_RUNTIME_NAMESPACE_ABSENT="${AMARELO_RUNTIME_NAMESPACE_ABSENT:-}" \
  AMARELO_RUNTIME_PODS_REMAINING="${AMARELO_RUNTIME_PODS_REMAINING:-}" \
    corepack pnpm --dir "$PROJECT_ROOT" --filter @repo/runtime start -- "$@"
}

elo_runtime_command() {
  PATH="$fake_bin:$PATH" \
  AMARELO_RUNTIME_AUDIT_LOG="$command_log" \
  AMARELO_RUNTIME_CYPRESS_STATUS="${AMARELO_RUNTIME_CYPRESS_STATUS:-}" \
  AMARELO_RUNTIME_ENV_FILE="$TMP_ROOT/runtime.env" \
  AMARELO_RUNTIME_FAIL_MATCH="${AMARELO_RUNTIME_FAIL_MATCH:-}" \
  AMARELO_RUNTIME_NAMESPACE_ABSENT="${AMARELO_RUNTIME_NAMESPACE_ABSENT:-}" \
  AMARELO_RUNTIME_PODS_REMAINING="${AMARELO_RUNTIME_PODS_REMAINING:-}" \
    "$PROJECT_ROOT/cli/elo" runtime "$@"
}

if ! runtime_command up >"$TMP_ROOT/up.out" 2>&1; then
  runtime_fail workspaces/packages/runtime/src/cli.ts "controlled Kubernetes up command failed"
  sed 's/^/  /' "$TMP_ROOT/up.out" >&2
else
  for project_container in \
    landing:workspaces/apps/landing \
    console:workspaces/apps/console \
    onboarding:workspaces/apps/onboarding \
    mobile:workspaces/apps/mobile \
    chatterbox:workspaces/microservices/chatterbox
  do
    workload=${project_container%%:*}
    project_path=${project_container#*:}
    grep -F "docker build --file $PROJECT_ROOT/$project_path/Dockerfile --tag amarelo-$workload:local $PROJECT_ROOT" "$command_log" >/dev/null 2>&1 ||
      runtime_fail workspaces/packages/runtime/src/cli.ts "up did not build the $workload project image"
    grep -F "kind load docker-image --name amarelo amarelo-$workload:local" "$command_log" >/dev/null 2>&1 ||
      runtime_fail workspaces/packages/runtime/src/cli.ts "up did not load the $workload image into the detected kind cluster"
  done
  grep -F 'kubectl apply --filename' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "up did not establish the runtime namespace"
  grep -F 'kubectl apply --kustomize' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "up did not reconcile the Kustomize base"
  grep -F 'kubectl rollout status' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "up did not wait for workload readiness"
  for stateful_workload in postgres neo4j redis-queue object-storage; do
    grep -F "statefulset/$stateful_workload --timeout=300s" "$command_log" >/dev/null 2>&1 ||
      runtime_fail workspaces/packages/runtime/src/cli.ts "up did not wait for $stateful_workload readiness"
  done
  for environment_key in NEO4J_AUTH REDIS_QUEUE_PASSWORD REDIS_CACHE_PASSWORD MINIO_ROOT_PASSWORD; do
    grep -F "$environment_key=" "$TMP_ROOT/runtime.env" >/dev/null 2>&1 ||
      runtime_fail workspaces/packages/runtime/src/cli.ts "generated environment omits $environment_key"
  done
  if grep -F 'REDIS_PASSWORD=' "$TMP_ROOT/runtime.env" >/dev/null 2>&1; then
    runtime_fail workspaces/packages/runtime/src/cli.ts "generated environment retains ambiguous REDIS_PASSWORD"
  fi
fi

: >"$command_log"
if ! runtime_command down >"$TMP_ROOT/down.out" 2>&1; then
  runtime_fail workspaces/packages/runtime/src/cli.ts "controlled Kubernetes down command failed"
else
  grep -F 'kubectl --namespace amarelo-runtime scale deployment --all --replicas=0' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "down did not stop every Deployment"
  grep -F 'kubectl --namespace amarelo-runtime scale statefulset --all --replicas=0' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "down did not stop every StatefulSet"
  if grep -F 'delete namespace' "$command_log" >/dev/null 2>&1; then
    runtime_fail workspaces/packages/runtime/src/cli.ts "down must preserve namespace and stateful claims"
  fi
fi

: >"$command_log"
if ! AMARELO_RUNTIME_NAMESPACE_ABSENT=true runtime_command down >"$TMP_ROOT/down-absent.out" 2>&1; then
  runtime_fail workspaces/packages/runtime/src/cli.ts "down must be idempotent when the namespace is absent"
else
  grep -F 'kubectl get namespace amarelo-runtime --ignore-not-found --output=name' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "down did not use an idempotent namespace lookup"
  if grep -F ' scale ' "$command_log" >/dev/null 2>&1; then
    runtime_fail workspaces/packages/runtime/src/cli.ts "down scaled workloads after detecting an absent namespace"
  fi
fi

: >"$command_log"
if ! runtime_command config >"$TMP_ROOT/config.out" 2>&1; then
  runtime_fail workspaces/packages/runtime/src/cli.ts "controlled Kubernetes config command failed"
elif ! grep -F 'kubectl kustomize' "$command_log" >/dev/null 2>&1; then
  runtime_fail workspaces/packages/runtime/src/cli.ts "config did not render through kubectl kustomize"
fi

runtime_command unsupported >"$TMP_ROOT/unsupported.out" 2>&1
unsupported_status=$?
[ "$unsupported_status" -eq 2 ] ||
  runtime_fail workspaces/packages/runtime/src/cli.ts "unknown runtime actions must exit with status 2"

: >"$command_log"
PATH="$fake_bin:$PATH" \
AMARELO_RUNTIME_AUDIT_LOG="$command_log" \
AMARELO_RUNTIME_ENV_FILE="$TMP_ROOT/runtime.env" \
AMARELO_RUNTIME_FAIL_MATCH='apply --kustomize' \
  corepack pnpm --dir "$PROJECT_ROOT" --filter @repo/runtime start -- up >"$TMP_ROOT/failure.out" 2>&1
failure_status=$?
[ "$failure_status" -ne 0 ] ||
  runtime_fail workspaces/packages/runtime/src/cli.ts "kubectl reconciliation failure must propagate non-zero"

: >"$command_log"
if ! elo_runtime_command up >"$TMP_ROOT/elo-up.out" 2>&1; then
  runtime_fail cli/src/commands/runtime.sh "elo runtime up failed"
elif ! grep -F 'kubectl rollout status' "$command_log" >/dev/null 2>&1; then
  runtime_fail cli/src/commands/runtime.sh "elo runtime up did not delegate the complete readiness path"
fi

: >"$command_log"
if ! elo_runtime_command down >"$TMP_ROOT/elo-down.out" 2>&1; then
  runtime_fail cli/src/commands/runtime.sh "elo runtime down failed"
else
  grep -F 'kubectl --namespace amarelo-runtime scale deployment --all --replicas=0' "$command_log" >/dev/null 2>&1 ||
    runtime_fail cli/src/commands/runtime.sh "elo runtime down did not stop Deployments"
  grep -F 'kubectl --namespace amarelo-runtime get pods' "$command_log" >/dev/null 2>&1 ||
    runtime_fail cli/src/commands/runtime.sh "elo runtime down did not wait for zero owned pods"
  grep -F 'kubectl --namespace amarelo-runtime delete job/amarelo-cypress configmap/amarelo-cypress-suite --ignore-not-found=true --wait=true --timeout=300s' "$command_log" >/dev/null 2>&1 ||
    runtime_fail cli/src/commands/runtime.sh "elo runtime down did not bound Cypress resource cleanup"
fi

printf 'generated runtime environment\n' >"$TMP_ROOT/runtime.env"
: >"$command_log"
if ! elo_runtime_command prune >"$TMP_ROOT/elo-prune.out" 2>&1; then
  runtime_fail cli/src/commands/runtime.sh "elo runtime prune failed"
else
  grep -F 'kubectl delete namespace amarelo-runtime --ignore-not-found=true --wait=true --timeout=300s' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "prune did not wait for namespace deletion"
  [ ! -e "$TMP_ROOT/runtime.env" ] ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "prune did not remove the generated runtime environment"
fi

printf 'must survive failed prune\n' >"$TMP_ROOT/runtime.env"
: >"$command_log"
AMARELO_RUNTIME_FAIL_MATCH='delete namespace' elo_runtime_command prune >"$TMP_ROOT/prune-failure.out" 2>&1
prune_failure_status=$?
[ "$prune_failure_status" -ne 0 ] ||
  runtime_fail workspaces/packages/runtime/src/cli.ts "namespace deletion failure must make prune fail"
[ -f "$TMP_ROOT/runtime.env" ] ||
  runtime_fail workspaces/packages/runtime/src/cli.ts "failed prune removed local state before cluster deletion completed"
rm -f "$TMP_ROOT/runtime.env"

: >"$command_log"
if ! elo_runtime_command e2e >"$TMP_ROOT/elo-e2e.out" 2>&1; then
  runtime_fail cli/src/commands/runtime.sh "elo runtime e2e failed"
else
  up_line=$(grep -n -F 'kubectl apply --kustomize' "$command_log" | sed -n '1s/:.*//p')
  cypress_line=$(grep -n -F 'kubectl apply --filename' "$command_log" | grep -F 'cypress-job.yaml' | sed -n '1s/:.*//p')
  if [ -z "$up_line" ] || [ -z "$cypress_line" ] || [ "$up_line" -ge "$cypress_line" ]; then
    runtime_fail workspaces/packages/runtime/src/cli.ts "e2e did not complete runtime up before creating Cypress"
  fi
  grep -F 'kubectl --namespace amarelo-runtime get job amarelo-cypress' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "e2e did not observe the Cypress Job result"
  grep -F 'kubectl --namespace amarelo-runtime logs job/amarelo-cypress' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "e2e did not emit Cypress logs"
fi

: >"$command_log"
AMARELO_RUNTIME_CYPRESS_STATUS='0:1' elo_runtime_command e2e >"$TMP_ROOT/e2e-failure.out" 2>&1
e2e_failure_status=$?
[ "$e2e_failure_status" -ne 0 ] ||
  runtime_fail workspaces/packages/runtime/src/cli.ts "failed Cypress Job must make runtime e2e fail"
[ "$(grep -c -F 'kubectl --namespace amarelo-runtime delete job/amarelo-cypress configmap/amarelo-cypress-suite' "$command_log")" -eq 1 ] ||
  runtime_fail workspaces/packages/runtime/src/cli.ts "failed Cypress resources must remain after the initial stale-resource cleanup"

for invalid_runtime_arguments in '' 'unknown' 'up extra'; do
  : >"$command_log"
  if [ -z "$invalid_runtime_arguments" ]; then
    "$PROJECT_ROOT/cli/elo" runtime >"$TMP_ROOT/invalid-runtime.out" 2>&1
  else
    # Intentional field splitting exercises one or two public arguments.
    elo_runtime_command $invalid_runtime_arguments >"$TMP_ROOT/invalid-runtime.out" 2>&1
  fi
  invalid_runtime_status=$?
  [ "$invalid_runtime_status" -eq 2 ] ||
    runtime_fail cli/src/commands/runtime.sh "invalid runtime syntax must exit with status 2"
  [ ! -s "$command_log" ] ||
    runtime_fail cli/src/commands/runtime.sh "invalid runtime syntax mutated the runtime"
done

if [ "$failures" -gt 0 ]; then
  printf 'Runtime audit FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Runtime audit PASS\n'
printf 'Kustomize resource inventory: PASS\n'
printf 'Kubernetes lifecycle contract: PASS\n'
printf 'runtime secret, queue/cache isolation and persistence boundaries: PASS\n'
