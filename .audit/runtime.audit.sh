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
  "$KUBERNETES_ROOT/redis.yaml" \
  "$KUBERNETES_ROOT/apps.yaml"
do
  require_file "$runtime_file"
done

if [ -f "$KUBERNETES_ROOT/kustomization.yaml" ]; then
  if ! command -v kubectl >/dev/null 2>&1; then
    runtime_fail kubectl "kubectl is required to render the canonical Kustomize runtime"
  elif ! kubectl kustomize "$KUBERNETES_ROOT" >"$TMP_ROOT/rendered.yaml" 2>"$TMP_ROOT/render.err"; then
    runtime_fail workspaces/packages/runtime/kubernetes/kustomization.yaml "kubectl could not render the Kustomize base"
  else
    for resource_name in amarelo-runtime postgres redis landing console onboarding mobile; do
      grep -F "name: $resource_name" "$TMP_ROOT/rendered.yaml" >/dev/null 2>&1 ||
        runtime_fail workspaces/packages/runtime/kubernetes "rendered resources omit $resource_name"
    done
    [ "$(grep -c '^kind: Deployment$' "$TMP_ROOT/rendered.yaml")" -eq 5 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "runtime must render five Deployments"
    [ "$(grep -c '^kind: StatefulSet$' "$TMP_ROOT/rendered.yaml")" -eq 1 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "runtime must render one StatefulSet"
    [ "$(grep -c '^kind: Service$' "$TMP_ROOT/rendered.yaml")" -eq 6 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "runtime must render six Services"
    [ "$(grep -c '^kind: PersistentVolumeClaim$' "$TMP_ROOT/rendered.yaml")" -eq 1 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "runtime must render one retained PostgreSQL claim"
    if grep -Eq '^kind: Secret$|POSTGRES_PASSWORD:[[:space:]]*[^|[:space:]]|REDIS_PASSWORD:[[:space:]]*[^|[:space:]]' "$TMP_ROOT/rendered.yaml"; then
      runtime_fail workspaces/packages/runtime/kubernetes "tracked manifests must not contain a Secret payload"
    fi
    [ "$(grep -c 'automountServiceAccountToken: false' "$TMP_ROOT/rendered.yaml")" -eq 6 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "every workload must disable service-account token mounting"
    [ "$(grep -c 'readinessProbe:' "$TMP_ROOT/rendered.yaml")" -eq 6 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "every workload must declare readiness"
    [ "$(grep -c 'livenessProbe:' "$TMP_ROOT/rendered.yaml")" -eq 6 ] ||
      runtime_fail workspaces/packages/runtime/kubernetes "every workload must declare liveness"
  fi
fi

if [ ! -f "$RUNTIME_CLI" ]; then
  runtime_fail workspaces/packages/runtime/src/cli.ts "runtime command entrypoint is missing"
else
  grep -F "'kubectl'" "$RUNTIME_CLI" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "runtime entrypoint does not invoke kubectl"
  if grep -Eq 'composeActions|[[:space:]]compose[[:space:]' "$RUNTIME_CLI"; then
    runtime_fail workspaces/packages/runtime/src/cli.ts "runtime entrypoint still owns Docker Compose behavior"
  fi
fi

if grep -F 'Docker Compose' "$RUNTIME_ROOT/readme.md" >/dev/null 2>&1; then
  runtime_fail workspaces/packages/runtime/readme.md "current runtime documentation still requires Docker Compose"
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
  "config current-context") printf 'kind-amarelo\n' ;;
  "get namespace amarelo-runtime"*) printf 'namespace/amarelo-runtime\n' ;;
  *"create secret generic"*) printf 'apiVersion: v1\nkind: Secret\nmetadata:\n  name: amarelo-runtime-environment\n' ;;
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
    pnpm --dir "$PROJECT_ROOT" --filter @repo/runtime start -- "$@"
}

if ! runtime_command up >"$TMP_ROOT/up.out" 2>&1; then
  runtime_fail workspaces/packages/runtime/src/cli.ts "controlled Kubernetes up command failed"
else
  grep -F 'docker build ' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "up did not build the default application image"
  grep -F 'kind load docker-image --name amarelo amarelo-dev-workspace:local' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "up did not load the default image into the detected kind cluster"
  grep -F 'kubectl apply --filename' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "up did not establish the runtime namespace"
  grep -F 'kubectl apply --kustomize' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "up did not reconcile the Kustomize base"
  grep -F 'kubectl rollout status' "$command_log" >/dev/null 2>&1 ||
    runtime_fail workspaces/packages/runtime/src/cli.ts "up did not wait for workload readiness"
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
    runtime_fail workspaces/packages/runtime/src/cli.ts "down must preserve namespace and PostgreSQL state"
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
  pnpm --dir "$PROJECT_ROOT" --filter @repo/runtime start -- up >"$TMP_ROOT/failure.out" 2>&1
failure_status=$?
[ "$failure_status" -ne 0 ] ||
  runtime_fail workspaces/packages/runtime/src/cli.ts "kubectl reconciliation failure must propagate non-zero"

if [ "$failures" -gt 0 ]; then
  printf 'Runtime audit FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Runtime audit PASS\n'
printf 'Kustomize resource inventory: PASS\n'
printf 'Kubernetes lifecycle contract: PASS\n'
printf 'runtime secret and persistence boundaries: PASS\n'
