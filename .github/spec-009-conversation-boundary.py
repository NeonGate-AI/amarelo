from pathlib import Path
import json
import os

conversation_root = Path('workspaces/ai/conversation/src')
alias_targets = {
    '@context': conversation_root / 'context',
    '@contracts': conversation_root / 'contracts',
    '@memory': conversation_root / 'memory',
    '@ports': conversation_root / 'ports',
    '@routing': conversation_root / 'routing',
    '@runtime': conversation_root / 'runtime',
}

changed_files = 0
for path in sorted(conversation_root.rglob('*.ts')):
    if 'assurance' in path.relative_to(conversation_root).parts:
        continue

    content = path.read_text(encoding='utf-8')
    updated = content
    for alias, target in alias_targets.items():
        relative = os.path.relpath(target, path.parent).replace(os.sep, '/')
        if not relative.startswith('.'):
            relative = f'./{relative}'
        updated = updated.replace(f"from '{alias}'", f"from '{relative}'")
        updated = updated.replace(f'from "{alias}"', f'from "{relative}"')

    if updated != content:
        path.write_text(updated, encoding='utf-8')
        changed_files += 1

for path in sorted(conversation_root.rglob('*.ts')):
    if 'assurance' in path.relative_to(conversation_root).parts:
        continue
    content = path.read_text(encoding='utf-8')
    for alias in alias_targets:
        if f"from '{alias}'" in content or f'from "{alias}"' in content:
            raise RuntimeError(
                f'Conversation production source retains private alias {alias}: {path}'
            )

if changed_files == 0:
    raise RuntimeError('No Conversation production imports were migrated')

for relative in [
    'workspaces/ai/agents/ana/tsconfig.json',
    'workspaces/apps/conversation-api/tsconfig.json',
]:
    path = Path(relative)
    data = json.loads(path.read_text(encoding='utf-8'))
    compiler_options = data.get('compilerOptions', {})
    paths = compiler_options.pop('paths', None)
    if paths is None:
        raise RuntimeError(f'Expected cross-package paths mapping is missing: {path}')
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

audit_path = Path('.audit/import-boundaries.audit.sh')
audit = audit_path.read_text(encoding='utf-8')
old_collection = ''': >"$TMP_ROOT/source-files"
: >"$TMP_ROOT/package-files"
while IFS= read -r path; do
  [ -n "$path" ] || continue
  case "$path" in
    */package.json) printf '%s\\n' "$path" >>"$TMP_ROOT/package-files" ;;
  esac
'''
new_collection = ''': >"$TMP_ROOT/source-files"
: >"$TMP_ROOT/package-files"
: >"$TMP_ROOT/tsconfig-files"
while IFS= read -r path; do
  [ -n "$path" ] || continue
  case "$path" in
    */package.json) printf '%s\\n' "$path" >>"$TMP_ROOT/package-files" ;;
    */tsconfig.json) printf '%s\\n' "$path" >>"$TMP_ROOT/tsconfig-files" ;;
  esac
'''
if old_collection not in audit:
    raise RuntimeError('Import audit file collection seam is missing')
audit = audit.replace(old_collection, new_collection, 1)

old_package_loop = '''done <"$TMP_ROOT/package-files"

while IFS= read -r path; do
'''
new_package_loop = '''done <"$TMP_ROOT/package-files"

while IFS= read -r config_file; do
  [ -n "$config_file" ] || continue
  case "$config_file" in
    "$WORKSPACE_ROOT/ai/conversation/tsconfig.json") continue ;;
  esac
  if grep -F 'conversation/src/' "$config_file" >/dev/null 2>&1; then
    import_fail \\
      cross-package-source-alias \\
      "$(relative_path "$config_file")" \\
      "TypeScript paths must not remap @ai/conversation private source; consume its declared package exports"
  fi
done <"$TMP_ROOT/tsconfig-files"

while IFS= read -r path; do
'''
if old_package_loop not in audit:
    raise RuntimeError('Import audit package loop seam is missing')
audit = audit.replace(old_package_loop, new_package_loop, 1)

old_footer = '''printf '@ absolute aliases: PASS\\n'
printf 'cross-directory barrel imports: PASS\\n'
printf 'leaf index.ts coverage: PASS\\n'
'''
new_footer = '''printf '@ absolute aliases: PASS\\n'
printf 'cross-package source aliases: PASS\\n'
printf 'cross-directory barrel imports: PASS\\n'
printf 'leaf index.ts coverage: PASS\\n'
'''
if old_footer not in audit:
    raise RuntimeError('Import audit footer seam is missing')
audit_path.write_text(audit.replace(old_footer, new_footer, 1), encoding='utf-8')
