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

node - "$PROJECT_ROOT" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2];
const failures = [];
const active = new Set(['draft', 'ready', 'in-progress']);
const fail = (code, file, detail) => failures.push(`[${code}] ${file}: ${detail}`);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
function documents(directory) {
  if (!exists(directory)) return [];
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const file = `${directory}/${entry.name}`;
      return entry.isDirectory() ? documents(file) : entry.name.endsWith('.md') ? [file] : [];
    });
}
function metadata(text) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const result = {};
  if (block === undefined) return result;
  let list;
  for (const line of block.split(/\r?\n/)) {
    const field = line.match(/^([a-z][a-zA-Z-]*):\s*(.*)$/);
    if (field) {
      list = field[2] ? undefined : field[1];
      result[field[1]] = field[2] ? field[2].replace(/^['"]|['"]$/g, '') : [];
    } else if (list && /^  - /.test(line)) {
      result[list].push(line.slice(4).trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  return result;
}
function unique(values, value, file, code) {
  if (values.has(value)) fail(code, file, `${value} already belongs to ${values.get(value)}`);
  else values.set(value, file);
}
function normativeBody(text) {
  let historicalLevel = 0;
  let fenced = false;
  return text.split(/\r?\n/).filter((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return false; }
    if (fenced) return false;
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (historicalLevel && heading[1].length <= historicalLevel) historicalLevel = 0;
      if (/^(?:Retrospective Integrity|Historical(?:\s|$)|Evidence$)/i.test(heading[2])) {
        historicalLevel = heading[1].length;
      }
    }
    return !historicalLevel;
  }).join('\n');
}
function illustrative(reference) {
  return /[<>{}*]|\b(?:NNN|NUMBER|BRANCH)\b|^#|^[a-z][a-z0-9+.-]*:/i.test(reference);
}
function validateReference(file, reference, relative = false) {
  if (reference === 'none' || illustrative(reference)) return;
  const clean = reference.split('#')[0].replace(/\/$/, '');
  if (!clean) return;
  const target = path.resolve(root, relative ? path.dirname(file) : '.', clean);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) {
    fail('outside-reference', file, reference);
  } else if (!fs.existsSync(target)) {
    fail('missing-reference', file, reference);
  }
}
function validateReferences(file, text) {
  const body = normativeBody(text);
  const seen = new Set();
  for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
    const reference = match[1].trim().replace(/^<|>$/g, '');
    if (illustrative(reference)) continue;
    seen.add(reference);
    validateReference(file, reference, !reference.startsWith('.agents/') && !reference.startsWith('.audit/'));
  }
  for (const match of body.matchAll(/(?:^|[\s`(])((?:\.agents|\.audit)\/[A-Za-z0-9_./-]+)(?=$|[\s`),;:]|[<>{}*])/gm)) {
    const reference = match[1].replace(/\.$/, '');
    const next = body[match.index + match[0].length];
    if (next && /[<>{}*]/.test(next)) continue;
    if (reference.startsWith('.agents/decisions/')) {
      fail('retired-harness-path', file, reference);
    }
    if (!seen.has(reference)) validateReference(file, reference);
  }
}
function validateTarget(file, target) {
  if (!/^(?:workspaces\/|\.agents(?:\/|$)|\.audit(?:\/|$)|cli(?:\/|$)|\.github(?:\/|$))/.test(target)) return;
  if (illustrative(target) || exists(target)) return;
  // A spec can introduce files within an existing owning workspace, but not
  // invent or revive a workspace implicitly through a stale target path.
  if (target.startsWith('workspaces/')) {
    let parent = path.dirname(target);
    while (parent !== 'workspaces' && parent !== '.') {
      if (exists(`${parent}/package.json`)) return;
      parent = path.dirname(parent);
    }
  }
  fail('stale-target', file, `no current owning boundary for ${target}`);
}

const harness = documents('.agents');
const adrs = harness.filter((file) => /^\.agents\/adrs\/[^/]+\.adr\.md$/.test(file));
const specs = harness.filter((file) => /^\.agents\/specs\/[^/]+\.spec\.md$/.test(file));
const adrIds = new Map();
const specIds = new Map();
const priorities = new Map();
if (!adrs.length) fail('adr-catalog', '.agents/adrs', 'no ADRs found');
const catalog = exists('.agents/adrs/readme.md') ? read('.agents/adrs/readme.md') : '';
for (const file of adrs) {
  const name = path.basename(file);
  const number = name.match(/^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.adr\.md$/)?.[1];
  if (!number) { fail('adr-identity', file, 'expected NNNN-lowercase-slug.adr.md'); continue; }
  const id = `ADR-${number}`;
  unique(adrIds, id, file, 'duplicate-adr-id');
  const text = read(file);
  const declared = metadata(text).id;
  const heading = text.match(/^# ADR-(\d{4}):/m)?.[1];
  if (heading !== number || declared !== id) {
    fail('adr-identity', file, `filename, H1 and declared frontmatter must agree on ${id}`);
  }
  const links = [...catalog.matchAll(/\]\(([^)]+)\)/g)].filter((match) => match[1] === name);
  if (links.length !== 1) fail('adr-catalog', file, `expected one exact catalog link, found ${links.length}`);
}
for (const file of specs) {
  const text = read(file);
  const meta = metadata(text);
  const priority = path.basename(file).match(/^(\d{3})-/)?.[1];
  if (priority) unique(priorities, priority, file, 'duplicate-spec-priority');
  if (meta.id) unique(specIds, meta.id, file, 'duplicate-spec-id');
  if (!active.has(meta.status)) continue;
  for (const target of Array.isArray(meta.targets) ? meta.targets : []) validateTarget(file, target);
  for (const key of ['context', 'rules', 'adrs', 'skills']) {
    for (const reference of Array.isArray(meta[key]) ? meta[key] : []) validateReference(file, reference);
  }
}
for (const file of harness) {
  const text = read(file);
  // Completed contracts retain their exact historical evidence. Their identity,
  // status, catalog and acceptance checks remain owned by specs.audit.sh.
  if (file.endsWith('.spec.md') && !active.has(metadata(text).status)) continue;
  validateReferences(file, text);
}
for (const file of ['AGENTS.md', 'readme.md', 'cli/readme.md']) {
  if (exists(file)) validateReferences(file, read(file));
}
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  console.error(`Canonical FAIL (${new Set(failures).size})`);
  process.exitCode = 1;
} else {
  console.log(`Canonical PASS - ${adrs.length} ADRs, ${specs.length} specs and live normative references`);
}
NODE
