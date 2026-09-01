import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

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

async function runEloPlatformAudit({ projectRoot = process.cwd() } = {}) {
  const failures = []
  const fail = (file, detail) => failures.push({ file, detail })
  const rel = (path) => relative(projectRoot, path).split(sep).join('/')
  const cliRoot = join(projectRoot, 'cli', 'src')
  const launcher = join(projectRoot, 'cli', 'elo')

  if (await exists(join(projectRoot, 'elo'))) {
    fail('elo', 'the Elo binary must live at cli/elo, not the repository root')
  }
  if (!(await exists(launcher))) {
    fail('cli/elo', 'the repository-local Elo binary is missing')
  }
  if (!(await exists(cliRoot))) {
    fail('cli/src', 'Elo source root is missing')
  } else {
    for (const path of await walk(cliRoot)) {
      if (extname(path) !== '.sh') {
        fail(rel(path), 'Elo implementation must be POSIX shell only')
      }
    }
  }

  const dispatcherPath = join(cliRoot, 'elo.sh')
  const dispatcher = await readFile(dispatcherPath, 'utf8').catch(() => '')
  for (const command of [
    'build',
    'dev',
    'eval',
    'format',
    'lint',
    'start',
    'test',
    'typecheck',
    'verify'
  ]) {
    const branch = new RegExp(`(^|\\n)\\s*${command}(?:\\|[^)]*)?\\)`, 'u')
    if (branch.test(dispatcher)) {
      fail(
        'cli/src/elo.sh',
        `Elo exposes ${command}; Turborepo/root scripts own task-graph execution`
      )
    }
  }

  const manifest = JSON.parse(
    await readFile(join(projectRoot, 'package.json'), 'utf8')
  )
  const scripts = manifest.scripts ?? {}
  const allowedRootScripts = new Set([
    'prepare',
    'elo',
    'dev',
    'start',
    'build',
    'typecheck',
    'test'
  ])
  for (const name of Object.keys(scripts)) {
    if (!allowedRootScripts.has(name)) {
      fail(
        'package.json',
        `root script ${name} is not a canonical Elo/Turbo entrypoint`
      )
    }
  }

  if (scripts.prepare !== './cli/elo git setup --prepare') {
    fail(
      'package.json',
      'prepare must delegate repository-local Git platform setup to cli/elo'
    )
  }
  if (scripts.elo !== './cli/elo') {
    fail('package.json', 'pnpm elo must execute the local cli/elo binary')
  }
  for (const name of ['dev', 'start', 'build', 'typecheck', 'test']) {
    if (typeof scripts[name] !== 'string' || !scripts[name].includes('turbo')) {
      fail(
        'package.json',
        `${name} must remain a direct Turborepo task-graph entrypoint`
      )
    }
  }

  const expectedHooks = new Map([
    [
      '.husky/pre-commit',
      '#!/usr/bin/env sh\nexec ./cli/elo git pre-commit "$@"'
    ],
    [
      '.husky/commit-msg',
      '#!/usr/bin/env sh\nexec ./cli/elo git commit-msg "$@"'
    ]
  ])
  for (const [hookPath, expected] of expectedHooks) {
    const text = await readFile(join(projectRoot, hookPath), 'utf8').catch(
      () => ''
    )
    if (text.trim() !== expected) {
      fail(hookPath, 'Husky adapter must remain an exact thin delegation to cli/elo')
    }
  }

  if (failures.length) {
    console.error(`Elo platform audit FAIL (${failures.length})`)
    for (const finding of failures) {
      console.error(`- ${finding.file}: ${finding.detail}`)
    }
    return 1
  }

  console.log('Elo platform audit PASS')
  console.log('cli/elo binary placement: PASS')
  console.log('shell-only CLI: PASS')
  console.log('Turbo command boundary: PASS')
  console.log('minimal root scripts: PASS')
  console.log('thin Git adapters: PASS')
  return 0
}

process.exitCode = await runEloPlatformAudit()
