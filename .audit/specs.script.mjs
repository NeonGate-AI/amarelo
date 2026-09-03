import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_PROJECT_ROOT =
  process.env.GITHUB_WORKSPACE ??
  resolve(dirname(fileURLToPath(import.meta.url)), '..')

const REQUIRED_FILES = [
  'AGENTS.md',
  '.agents/rules/spec-driven-development.md',
  '.agents/specs/readme.md',
  '.agents/specs/template.md',
  '.agents/specs/workflow.md'
]

const REQUIRED_METADATA = [
  'id',
  'title',
  'type',
  'status',
  'mode',
  'created',
  'updated'
]

const REQUIRED_LIST_METADATA = [
  'owners',
  'targets',
  'context',
  'rules',
  'adrs',
  'skills',
  'evidence'
]

const REQUIRED_SECTIONS = [
  'Problem Statement',
  'Solution',
  'User Stories',
  'Scope',
  'Implementation Decisions',
  'Testing Decisions',
  'Acceptance Criteria',
  'Failure Behavior',
  'Out of Scope',
  'Evidence and Promotion',
  'Further Notes'
]

const ALLOWED_TYPES = new Set([
  'chore',
  'experiment',
  'feature',
  'fix',
  'governance',
  'migration',
  'refactor'
])

const ALLOWED_STATUSES = new Set([
  'draft',
  'ready',
  'in-progress',
  'implemented',
  'superseded',
  'retired'
])

const ALLOWED_MODES = new Set([
  'bootstrap',
  'prospective',
  'retrospective'
])

async function exists(path) {
  return Boolean(await stat(path).catch(() => null))
}

async function walk(directory, out = []) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(
    () => []
  )) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path, out)
    else out.push(path)
  }
  return out
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u)
  if (!match) return null

  const metadata = {}
  let currentList = null

  for (const rawLine of match[1].split('\n')) {
    const scalar = rawLine.match(/^([a-z][a-z-]*):(?:\s*(.*))?$/u)
    if (scalar) {
      const [, key, rawValue = ''] = scalar
      const value = rawValue.trim()
      if (value.length > 0) {
        metadata[key] = value
        currentList = null
      } else {
        metadata[key] = []
        currentList = key
      }
      continue
    }

    const item = rawLine.match(/^\s{2}-\s+(.+)$/u)
    if (item && currentList !== null) {
      metadata[currentList].push(item[1].trim())
      continue
    }

    if (rawLine.trim().length > 0) {
      return { error: `unsupported frontmatter line: ${rawLine}` }
    }
  }

  return {
    body: text.slice(match[0].length),
    metadata
  }
}

function sectionBody(body, heading) {
  const marker = `## ${heading}\n`
  const start = body.indexOf(marker)
  if (start === -1) return null

  const contentStart = start + marker.length
  const next = body.indexOf('\n## ', contentStart)
  return body.slice(contentStart, next === -1 ? body.length : next).trim()
}

export async function runSpecWorkflowCheck({
  projectRoot = DEFAULT_PROJECT_ROOT
} = {}) {
  const failures = []
  const fail = (rule, file, detail, fix) =>
    failures.push({ rule, file, detail, fix })
  const rel = (path) => relative(projectRoot, path).split(sep).join('/')

  for (const requiredFile of REQUIRED_FILES) {
    if (!(await exists(join(projectRoot, requiredFile)))) {
      fail(
        'required-workflow-file',
        requiredFile,
        'required spec-driven workflow file is missing',
        'restore the canonical workflow artifact'
      )
    }
  }

  const agents = await readFile(join(projectRoot, 'AGENTS.md'), 'utf8').catch(
    () => ''
  )
  if (!agents.includes('.agents/specs/workflow.md')) {
    fail(
      'workflow-entrypoint',
      'AGENTS.md',
      'the engineering entrypoint does not point to the spec workflow',
      'add a concise workflow and active-spec loading pointer'
    )
  }

  const specRule = await readFile(
    join(projectRoot, '.agents/rules/spec-driven-development.md'),
    'utf8'
  ).catch(() => '')
  if (!/^alwaysApply:\s*true$/mu.test(specRule)) {
    fail(
      'always-apply-rule',
      '.agents/rules/spec-driven-development.md',
      'the spec-driven rule is not always applied',
      'declare alwaysApply: true in rule frontmatter'
    )
  }

  const specRoot = join(projectRoot, '.agents', 'specs')
  const deliveryFiles = (await walk(specRoot))
    .filter((path) => /^spec-\d{3}-[a-z0-9-]+\.md$/u.test(basename(path)))
    .sort()

  if (deliveryFiles.length === 0) {
    fail(
      'delivery-spec-presence',
      '.agents/specs',
      'no numbered delivery specs were found',
      'create a SPEC-### document from the canonical template'
    )
  }

  const seenIds = new Map()
  const numericIds = []

  for (const path of deliveryFiles) {
    const file = rel(path)
    const text = await readFile(path, 'utf8')
    const filenameMatch = basename(path).match(/^spec-(\d{3})-/u)
    const expectedId = `SPEC-${filenameMatch?.[1] ?? '???'}`
    const parsed = parseFrontmatter(text)

    if (parsed === null) {
      fail(
        'frontmatter',
        file,
        'numbered delivery spec has no YAML frontmatter',
        'start from .agents/specs/template.md'
      )
      continue
    }

    if ('error' in parsed) {
      fail(
        'frontmatter',
        file,
        parsed.error,
        'use scalar values and two-space list items from the template'
      )
      continue
    }

    const { body, metadata } = parsed

    for (const key of REQUIRED_METADATA) {
      if (typeof metadata[key] !== 'string' || metadata[key].trim() === '') {
        fail(
          'required-metadata',
          file,
          `${key} must be a non-empty scalar`,
          'complete the canonical delivery-spec frontmatter'
        )
      }
    }

    for (const key of REQUIRED_LIST_METADATA) {
      if (!Array.isArray(metadata[key]) || metadata[key].length === 0) {
        fail(
          'required-list-metadata',
          file,
          `${key} must contain at least one item`,
          'complete the canonical delivery-spec frontmatter'
        )
      }
    }

    if (metadata.id !== expectedId) {
      fail(
        'spec-id-filename',
        file,
        `frontmatter id ${metadata.id ?? '<missing>'} does not match ${expectedId}`,
        'make the stable ID and lowercase filename agree'
      )
    }

    if (seenIds.has(metadata.id)) {
      fail(
        'duplicate-spec-id',
        file,
        `${metadata.id} is already used by ${seenIds.get(metadata.id)}`,
        'assign the next unused sequential delivery ID'
      )
    } else if (typeof metadata.id === 'string') {
      seenIds.set(metadata.id, file)
    }

    const numericId = Number(filenameMatch?.[1])
    if (Number.isInteger(numericId)) numericIds.push(numericId)

    if (!ALLOWED_TYPES.has(metadata.type)) {
      fail(
        'spec-type',
        file,
        `${metadata.type ?? '<missing>'} is not an allowed type`,
        `use one of: ${[...ALLOWED_TYPES].join(', ')}`
      )
    }

    if (!ALLOWED_STATUSES.has(metadata.status)) {
      fail(
        'spec-status',
        file,
        `${metadata.status ?? '<missing>'} is not an allowed status`,
        `use one of: ${[...ALLOWED_STATUSES].join(', ')}`
      )
    }

    if (!ALLOWED_MODES.has(metadata.mode)) {
      fail(
        'spec-mode',
        file,
        `${metadata.mode ?? '<missing>'} is not an allowed mode`,
        `use one of: ${[...ALLOWED_MODES].join(', ')}`
      )
    }

    if (metadata.mode === 'retrospective') {
      if (metadata.status !== 'implemented') {
        fail(
          'retrospective-status',
          file,
          'retrospective specs must record implemented pre-workflow work',
          'set status to implemented or use prospective mode'
        )
      }
      if (!file.startsWith('.agents/specs/history/')) {
        fail(
          'retrospective-location',
          file,
          'retrospective specs must live under .agents/specs/history/',
          'move the file to the history directory'
        )
      }
      const integrity = sectionBody(body, 'Retrospective Integrity')
      if (integrity === null || integrity.length < 80) {
        fail(
          'retrospective-integrity',
          file,
          'retrospective spec lacks a substantive integrity disclosure',
          'state that it was reconstructed after implementation and disclose evidence limits'
        )
      }
    }

    if (metadata.mode === 'prospective' && metadata.status === 'implemented') {
      if (
        Array.isArray(metadata.evidence) &&
        metadata.evidence.some((item) => item === 'pending')
      ) {
        fail(
          'implemented-evidence',
          file,
          'implemented prospective spec still has pending evidence',
          'replace pending with stable evidence references'
        )
      }
    }

    if (metadata.status === 'implemented') {
      const acceptance = sectionBody(body, 'Acceptance Criteria')
      if (acceptance === null || !/- \[[xX]\]\s+/u.test(acceptance)) {
        fail(
          'implemented-acceptance',
          file,
          'implemented spec has no checked acceptance criteria',
          'record evidenced completion with checked criteria'
        )
      }
      if (acceptance !== null && /- \[ \]\s+/u.test(acceptance)) {
        fail(
          'implemented-acceptance',
          file,
          'implemented spec still contains unchecked acceptance criteria',
          'finish, supersede or explicitly remove unmet scope before closure'
        )
      }
      if (
        Array.isArray(metadata.evidence) &&
        metadata.evidence.some((item) => item === 'pending')
      ) {
        fail(
          'implemented-evidence',
          file,
          'implemented spec still has pending evidence',
          'replace pending with stable evidence references'
        )
      }
    }

    for (const heading of REQUIRED_SECTIONS) {
      const section = sectionBody(body, heading)
      if (section === null || section.length === 0) {
        fail(
          'required-section',
          file,
          `missing or empty section: ${heading}`,
          'complete the canonical delivery-spec body'
        )
      }
    }

    if (!body.trimStart().startsWith(`# ${expectedId}: `)) {
      fail(
        'spec-title',
        file,
        `document title must start with # ${expectedId}:`,
        'align the H1 with the stable spec ID'
      )
    }
  }

  if (numericIds.length > 0) {
    const maxId = Math.max(...numericIds)
    const expectedNext = `SPEC-${String(maxId + 1).padStart(3, '0')}`
    const readme = await readFile(
      join(specRoot, 'readme.md'),
      'utf8'
    ).catch(() => '')
    if (!readme.includes(expectedNext)) {
      fail(
        'next-spec-id',
        '.agents/specs/readme.md',
        `the next available delivery ID should be ${expectedNext}`,
        'update the spec index after adding or retiring an ID'
      )
    }
  }

  if (failures.length > 0) {
    console.error(`Spec workflow FAIL (${failures.length})`)
    for (const finding of failures) {
      console.error(
        `\n[${finding.rule}] ${finding.file}\n  ${finding.detail}\n  fix: ${finding.fix}`
      )
    }
    return 1
  }

  console.log(`Spec workflow PASS - ${deliveryFiles.length} delivery specs`)
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await runSpecWorkflowCheck()
}
