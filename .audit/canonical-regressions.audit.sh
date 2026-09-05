#!/bin/sh
set -eu

AUDIT_DIR=$(
  CDPATH=
  cd -P "$(dirname "$0")"
  pwd
)

node - "$AUDIT_DIR/canonical.audit.sh" <<'NODE'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const checker = process.argv[2];
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'amarelo-canonical-test-'));
const adrName = '0001-fixture.adr.md';
const adr = `---\nid: ADR-0001\nstatus: accepted\n---\n# ADR-0001: Fixture\n`;
const specName = '001-fixture.spec.md';
const spec = `---\nid: SPEC-001\nstatus: ready\ntargets:\n  - workspaces/microservices/chatterbox\ncontext:\n  - .agents/context/fixture.md\n---\n# SPEC-001: Fixture\n`;
function write(relative, contents) {
  const target = path.join(fixture, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}
function verify(name, expected) {
  const result = spawnSync('/bin/sh', [checker], {
    env: { ...process.env, GITHUB_WORKSPACE: fixture }, encoding: 'utf8',
  });
  assert.ifError(result.error);
  const output = result.stdout + result.stderr;
  if (expected) {
    assert.equal(result.status, 1, `${name}: mutation was accepted\n${output}`);
    assert.match(output, new RegExp(`\\[${expected}\\]`), `${name}: wrong rejection\n${output}`);
  } else {
    assert.equal(result.status, 0, `${name}: valid fixture was rejected\n${output}`);
  }
  console.log(`Canonical regression PASS - ${name}`);
}
try {
  write(`.agents/adrs/${adrName}`, adr);
  write('.agents/adrs/readme.md', `[ADR-0001](${adrName})\n`);
  write(`.agents/specs/${specName}`, spec);
  write('.agents/context/fixture.md', '# Synthetic context\n');
  write('workspaces/microservices/chatterbox/package.json', '{"name":"chatterbox"}\n');
  verify('valid current boundaries and references');

  write('.agents/adrs/0001-duplicate.adr.md', adr);
  verify('duplicate ADR identity', 'duplicate-adr-id');
  fs.unlinkSync(path.join(fixture, '.agents/adrs/0001-duplicate.adr.md'));

  write(`.agents/adrs/${adrName}`, adr.replace('id: ADR-0001', 'id: ADR-0002'));
  verify('ADR metadata identity mismatch', 'adr-identity');
  write(`.agents/adrs/${adrName}`, adr);

  write(`.agents/adrs/${adrName}`, adr.replace('# ADR-0001:', '# ADR-0002:'));
  verify('ADR heading identity mismatch', 'adr-identity');
  write(`.agents/adrs/${adrName}`, '# ADR-0001: Missing metadata\n');
  verify('ADR metadata is required', 'adr-identity');
  write(`.agents/adrs/${adrName}`, adr);

  write('.agents/adrs/readme.md', '# Missing catalog row\n');
  verify('missing ADR catalog entry', 'adr-catalog');
  write('.agents/adrs/readme.md', `[ADR-0001](${adrName})\n`);

  write('.agents/context/fixture.md', '[Missing](missing.md)\n');
  verify('missing live Markdown reference', 'missing-reference');
  write('.agents/context/fixture.md', '# Synthetic context\n');

  write(`.agents/specs/${specName}`, spec.replace('.agents/context/fixture.md', '.agents/context/missing.md'));
  verify('missing active frontmatter reference', 'missing-reference');
  write(`.agents/specs/${specName}`, spec);

  write(`.agents/specs/${specName}`, spec.replace('workspaces/microservices/chatterbox', 'workspaces/apps/conversation-api'));
  verify('retired active workspace target', 'stale-target');

  write(`.agents/specs/${specName}`, spec.replace('status: ready', 'status: implemented').replace('workspaces/microservices/chatterbox', 'workspaces/apps/conversation-api'));
  verify('implemented historical workspace evidence is preserved');
  write(`.agents/specs/${specName}`, spec.replace('workspaces/microservices/chatterbox', 'workspaces/microservices/chatterbox/src/new-boundary'));
  verify('new files retain an existing workspace owner');
  write(`.agents/specs/${specName}`, spec.replace('workspaces/microservices/chatterbox', 'Memory serving assurance'));
  verify('prose target labels are not filesystem claims');
  write(`.agents/specs/${specName}`, spec);

  write('.agents/specs/002-duplicate.spec.md', spec);
  verify('duplicate durable spec identity', 'duplicate-spec-id');
  fs.unlinkSync(path.join(fixture, '.agents/specs/002-duplicate.spec.md'));
  write('.agents/specs/001-duplicate.spec.md', spec.replaceAll('SPEC-001', 'SPEC-002'));
  verify('duplicate spec priority', 'duplicate-spec-priority');
  fs.unlinkSync(path.join(fixture, '.agents/specs/001-duplicate.spec.md'));

  write('.agents/context/fixture.md', 'Load `.agents/decisions/0001-fixture.md`.\n');
  verify('retired normative decisions path', 'retired-harness-path');
  write('.agents/context/fixture.md', 'Load `.agents/skills/<name>/SKILL.md` only when relevant.\n');
  verify('illustrative placeholders are not live references');
  write('.agents/context/fixture.md', '# Current context\n\n## Historical evidence\n\nOld [snapshot](removed.md).\n\n## Current references\n\n[Fixture](fixture.md).\n');
  verify('explicit historical evidence is not a live instruction');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
NODE
