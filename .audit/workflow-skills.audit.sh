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
SKILL_ROOT="$PROJECT_ROOT/.agents/skills"
SPEC_ROOT="$PROJECT_ROOT/.agents/specs"
TMP_ROOT="${TMPDIR:-/tmp}/amarelo-workflow-skills.$$"

umask 077
mkdir "$TMP_ROOT" || {
  printf 'Workflow skills FAIL: cannot create temporary directory\n' >&2
  exit 1
}
cleanup() { rm -rf "$TMP_ROOT"; }
trap cleanup 0 1 2 15

failures=0

workflow_fail() {
  failures=$((failures + 1))
  printf '\n[%s] %s\n  %s\n  fix: %s\n' "$1" "$2" "$3" "$4" >&2
}

frontmatter_scalar() {
  awk -v key="$2" '
    NR == 1 { if ($0 != "---") exit 2; inside = 1; next }
    inside && $0 == "---" { exit }
    inside && index($0, key ":") == 1 {
      value = substr($0, length(key) + 2)
      sub(/^[[:space:]]*/, "", value)
      sub(/[[:space:]]*$/, "", value)
      print value
      exit
    }
  ' "$1"
}

frontmatter_skill_refs() {
  awk '
    NR == 1 { inside = ($0 == "---"); next }
    inside && $0 == "---" { exit }
    inside && /^skills:[[:space:]]*$/ { list = 1; next }
    list && /^  -[[:space:]]+/ {
      value = $0
      sub(/^  -[[:space:]]+/, "", value)
      sub(/[[:space:]]*$/, "", value)
      print value
      next
    }
    list && /^[a-z][a-z-]*:/ { list = 0 }
  ' "$1"
}

required_workflow_skills='
to-spec
to-tickets
implement
tdd
code-review
domain-modeling
writing-for-agents
'

project_skill_inventory='
accessibility
agent-memory-systems
best-practices
context-engineering
core-web-vitals
deep-agents-core
deep-agents-memory
deep-agents-orchestration
documentation-and-adrs
frontend-ui-engineering
langchain-architecture
langchain-fundamentals
langchain-middleware
langchain-rag
langchain-typescript-quickstart
langgraph-docs
langgraph-human-in-the-loop
langgraph-persistence
managed-deep-agents
performance
pwa-development
seo
spec-driven-development
web-quality-audit
'

removed_imported_skills='
ask-matt
claude-handoff
codebase-design
diagnosing-bugs
git-guardrails-claude-code
grill-me
grill-with-docs
grilling
handoff
implement-spec
improve-codebase-architecture
loop-me
migrate-to-shoehorn
prototype
research
resolving-merge-conflicts
retro
scaffold-exercises
setup-matt-pocock-skills
setup-pre-commit
setup-ts-deep-modules
teach
to-questionnaire
triage
wait-what
wayfinder
wizard
writing-beats
writing-fragments
writing-shape
'

for skill in $required_workflow_skills; do
  entry="$SKILL_ROOT/$skill/SKILL.md"
  [ -f "$entry" ] ||
    workflow_fail retained-skill "$entry" \
      "canonical workflow skill entry point is missing" \
      "restore the retained local skill"

  grep -F "[$skill]($skill/SKILL.md)" "$SKILL_ROOT/readme.md" >/dev/null 2>&1 ||
    workflow_fail skill-index .agents/skills/readme.md \
      "canonical workflow skill is not linked: $skill" \
      "add the exact local SKILL.md link"

  grep -F "../skills/$skill/SKILL.md" "$SPEC_ROOT/workflow.md" >/dev/null 2>&1 ||
    workflow_fail workflow-pointer .agents/specs/workflow.md \
      "workflow does not link the local $skill procedure" \
      "add the exact repository-local link"
done

for skill in $project_skill_inventory; do
  entry="$SKILL_ROOT/$skill/SKILL.md"
  [ -f "$entry" ] ||
    workflow_fail preserved-skill "$entry" \
      "independently sourced/project skill was removed" \
      "restore the preserved project skill"
  grep -Fx -- "- $skill" "$SKILL_ROOT/readme.md" >/dev/null 2>&1 ||
    workflow_fail skill-index .agents/skills/readme.md \
      "preserved project skill is absent from the inventory: $skill" \
      "record the skill in the project/domain section"
done

for skill in $removed_imported_skills; do
  [ ! -e "$SKILL_ROOT/$skill" ] ||
    workflow_fail imported-skill ".agents/skills/$skill" \
      "non-retained Matt Pocock import-lineage skill remains" \
      "remove the directory; do not add a compatibility wrapper"
done

for skill in $required_workflow_skills; do
  skill_file="$SKILL_ROOT/$skill/SKILL.md"
  [ -f "$skill_file" ] || continue

  if grep -F 'docs/agents/issue-tracker.md' "$skill_file" >/dev/null 2>&1; then
    workflow_fail deleted-dependency ".agents/skills/$skill/SKILL.md" \
      "retained skill depends on the deleted external tracker setup document" \
      "use the Amarelo workflow and GitHub issue contract"
  fi

  for removed in $removed_imported_skills; do
    if grep -E "(\.agents/skills/|/)$removed(/|[^a-zA-Z0-9-]|$)" "$skill_file" >/dev/null 2>&1; then
      workflow_fail deleted-dependency ".agents/skills/$skill/SKILL.md" \
        "retained skill references deleted procedure: $removed" \
        "replace it with the current Amarelo workflow or retained local procedure"
    fi
  done
done

for document in \
  AGENTS.md \
  .agents/specs/workflow.md \
  .agents/specs/template.md \
  .agents/skills/readme.md \
  .agents/context/engineering/workflow-skills.md \
  .agents/rules/011-spec-driven-development.rule.md
do
  path="$PROJECT_ROOT/$document"
  [ -f "$path" ] || {
    workflow_fail workflow-document "$document" \
      "required local workflow document is missing" \
      "restore the canonical harness document"
    continue
  }
  if grep -E 'github\.com/(mattpocock/skills|NeonGate-AI/skills)' "$path" >/dev/null 2>&1; then
    workflow_fail remote-normative-reference "$document" \
      "canonical workflow document points to a remote skill repository" \
      "use a repository-local .agents/skills/<name>/SKILL.md path"
  fi
done

grep -F '.agents/skills/to-spec/SKILL.md' "$SPEC_ROOT/template.md" >/dev/null 2>&1 ||
  workflow_fail template-skill-reference .agents/specs/template.md \
    "template does not use a repository-local skill example" \
    "use .agents/skills/to-spec/SKILL.md"

for spec in "$SPEC_ROOT"/*.spec.md; do
  [ -f "$spec" ] || continue
  status=$(frontmatter_scalar "$spec" status)
  case "$status" in
    draft|ready|in-progress) ;;
    *) continue ;;
  esac

  refs="$TMP_ROOT/$(basename "$spec").skills"
  frontmatter_skill_refs "$spec" >"$refs"
  while IFS= read -r reference; do
    [ -n "$reference" ] || continue
    case "$reference" in
      http://github.com/mattpocock/skills*|https://github.com/mattpocock/skills*|\
      http://github.com/NeonGate-AI/skills*|https://github.com/NeonGate-AI/skills*)
        workflow_fail remote-normative-reference "${spec#"$PROJECT_ROOT"/}" \
          "active skills metadata points to a remote vendored procedure: $reference" \
          "replace it with the canonical local SKILL.md path"
        ;;
      .agents/skills/*/SKILL.md)
        [ -f "$PROJECT_ROOT/$reference" ] ||
          workflow_fail unresolved-skill-reference "${spec#"$PROJECT_ROOT"/}" \
            "active skills metadata does not resolve: $reference" \
            "use an existing local skill or remove the dependency"
        ;;
    esac
  done <"$refs"
done

if [ ! -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then
  workflow_fail lockfile pnpm-lock.yaml \
    "tracked repository lockfile is missing" \
    "restore pnpm-lock.yaml or regenerate it intentionally"
elif ! git -C "$PROJECT_ROOT" ls-files --error-unmatch -- pnpm-lock.yaml >/dev/null 2>&1; then
  workflow_fail lockfile pnpm-lock.yaml \
    "repository lockfile is not tracked" \
    "add pnpm-lock.yaml to the repository before using frozen installs"
fi

fixture="$TMP_ROOT/remote.spec.md"
cat >"$fixture" <<'EOF'
---
status: ready
skills:
  - https://github.com/NeonGate-AI/skills/tree/main/skills/engineering/to-spec
---
EOF
if ! frontmatter_skill_refs "$fixture" | grep -F 'github.com/NeonGate-AI/skills' >/dev/null 2>&1; then
  workflow_fail audit-contract .audit/workflow-skills.audit.sh \
    "negative fixture did not expose a prohibited remote normative skill reference" \
    "preserve the frontmatter skill-reference detector"
fi

if [ "$failures" -gt 0 ]; then
  printf 'Workflow skills FAIL (%s)\n' "$failures" >&2
  exit 1
fi

printf 'Workflow skills PASS - 7 workflow procedures and 24 project skills\n'
