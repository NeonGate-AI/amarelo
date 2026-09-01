#!/usr/bin/env node

import { access, chmod, copyFile, readFile, readdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

import { runArchitectureCheck } from './scripts/architecture.script.mjs'
import { runMemoryInvariantCheck } from './scripts/memory-invariants.script.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const packagePath = join(projectRoot, 'package.json')

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  })
  return result
}

function commandText(command, args) {
  const result = run(command, args, { capture: true })
  return result.status === 0
    ? `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
    : null
}

async function readManifest() {
  return JSON.parse(await readFile(packagePath, 'utf8'))
}

async function localPackageVersion(name) {
  const manifest = join(
    projectRoot,
    'node_modules',
    ...name.split('/'),
    'package.json'
  )
  if (!(await exists(manifest))) return null
  const parsed = JSON.parse(await readFile(manifest, 'utf8'))
  return typeof parsed.version === 'string' ? parsed.version : null
}

function major(version) {
  const match = String(version ?? '').match(/v?(\d+)/u)
  return match ? Number(match[1]) : null
}

async function findEnvTemplates(directory = projectRoot, out = []) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(
    () => []
  )) {
    if (
      [
        '.git',
        'node_modules',
        '.next',
        '.turbo',
        'dist',
        'coverage',
        '.audit'
      ].includes(entry.name)
    )
      continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await findEnvTemplates(path, out)
    else if (entry.name === '.env.example' || entry.name === '.env.template')
      out.push(path)
  }
  return out
}

async function doctor({ ci = false } = {}) {
  const manifest = await readManifest()
  const checks = []
  const add = (name, ok, actual, expected, fix) =>
    checks.push({ name, ok, actual, expected, fix })

  add(
    'node',
    major(process.version) === 24,
    process.version,
    '24.x',
    'Install Node.js 24.'
  )
  const packageManager = String(manifest.packageManager ?? '')
  const expectedPnpm = packageManager.startsWith('pnpm@')
    ? packageManager.slice(5)
    : null
  const pnpm = commandText('pnpm', ['--version'])
  add(
    'pnpm',
    Boolean(pnpm && (!expectedPnpm || pnpm === expectedPnpm)),
    pnpm,
    expectedPnpm ?? 'declared packageManager',
    'Enable Corepack and activate the repository pnpm version.'
  )
  add(
    'git',
    Boolean(commandText('git', ['--version'])),
    commandText('git', ['--version']),
    'available',
    'Install Git.'
  )

  for (const [name, expected] of [
    ['typescript', manifest.devDependencies?.typescript],
    ['@biomejs/biome', manifest.devDependencies?.['@biomejs/biome']],
    ['turbo', manifest.devDependencies?.turbo],
    ['@commitlint/cli', manifest.devDependencies?.['@commitlint/cli']],
    ['husky', manifest.devDependencies?.husky],
    ['lint-staged', manifest.devDependencies?.['lint-staged']]
  ]) {
    const actual = await localPackageVersion(name)
    add(
      name,
      Boolean(actual),
      actual,
      expected ?? 'declared locally',
      `Run pnpm install --frozen-lockfile to install ${name}.`
    )
  }

  const dockerVersion = commandText('docker', ['--version'])
  add(
    'docker',
    Boolean(dockerVersion),
    dockerVersion,
    'available',
    'Install Docker.'
  )
  const composeVersion = commandText('docker', ['compose', 'version'])
  add(
    'docker-compose',
    Boolean(composeVersion),
    composeVersion,
    'docker compose available',
    'Install/enable Docker Compose v2.'
  )
  const daemon = dockerVersion
    ? run('docker', ['info'], { capture: true }).status === 0
    : false
  add(
    'docker-daemon',
    daemon,
    daemon ? 'reachable' : 'unreachable',
    'reachable',
    'Start the Docker daemon.'
  )

  add(
    'lockfile',
    await exists(join(projectRoot, 'pnpm-lock.yaml')),
    'pnpm-lock.yaml',
    'present',
    'Restore the committed lockfile.'
  )
  add(
    'install-state',
    await exists(join(projectRoot, 'node_modules')),
    'node_modules',
    'present',
    'Run pnpm install --frozen-lockfile.'
  )
  add(
    'commitlint-config',
    await exists(join(projectRoot, 'commitlint.config.js')),
    'commitlint.config.js',
    'present',
    'Restore Commitlint configuration.'
  )
  add(
    'husky-pre-commit',
    await exists(join(projectRoot, '.husky', 'pre-commit')),
    '.husky/pre-commit',
    'present',
    'Run ./elo git setup.'
  )
  add(
    'husky-commit-msg',
    await exists(join(projectRoot, '.husky', 'commit-msg')),
    '.husky/commit-msg',
    'present',
    'Run ./elo git setup.'
  )

  const schemaCandidates = [
    join(
      projectRoot,
      'workspaces/memory-nucleus/src/infrastructure/database/schema.sql'
    ),
    join(
      projectRoot,
      'workspaces/memory-nucleus/infrastructure/database/schema.sql'
    )
  ]
  add(
    'memory-schema',
    (await Promise.all(schemaCandidates.map(exists))).some(Boolean),
    'schema.sql',
    'present',
    'Restore the Memory Nucleus database baseline.'
  )

  const templates = await findEnvTemplates()
  if (!ci) {
    for (const template of templates) {
      const target = join(dirname(template), '.env')
      if (!(await exists(target)))
        console.warn(
          `WARN env target missing for ${template.slice(projectRoot.length + 1)}; run ./elo env setup`
        )
    }
  }

  let failed = 0
  console.log('Elo doctor')
  for (const check of checks) {
    const label = check.ok ? 'PASS' : 'FAIL'
    console.log(
      `${label.padEnd(4)}  ${check.name}${check.actual ? ` — ${check.actual}` : ''}`
    )
    if (!check.ok) {
      failed += 1
      if (check.fix) console.log(`      fix: ${check.fix}`)
    }
  }
  console.log(`INFO  env templates — ${templates.length}`)
  return failed === 0 ? 0 : 1
}

async function gitSetup() {
  if (!(await exists(join(projectRoot, '.git')))) {
    console.error('Elo git setup must run inside an Amarelo Git checkout.')
    return 1
  }
  const husky = run('pnpm', ['exec', 'husky'])
  if (husky.status !== 0) return husky.status ?? 1
  for (const hook of ['pre-commit', 'commit-msg']) {
    const path = join(projectRoot, '.husky', hook)
    if (await exists(path)) await chmod(path, 0o755)
  }
  console.log('Elo Git platform ready.')
  return 0
}

async function envSetup() {
  const templates = await findEnvTemplates()
  let created = 0
  for (const template of templates) {
    const target = join(dirname(template), '.env')
    if (await exists(target)) continue
    await copyFile(template, target)
    created += 1
    console.log(`created ${target.slice(projectRoot.length + 1)}`)
  }
  console.log(`Elo env setup complete (${created} created).`)
  return 0
}

async function envValidate() {
  const templates = await findEnvTemplates()
  const missing = []
  for (const template of templates) {
    const target = join(dirname(template), '.env')
    if (!(await exists(target)))
      missing.push(target.slice(projectRoot.length + 1))
  }
  if (missing.length) {
    console.error('Missing environment files:')
    for (const path of missing) console.error(`- ${path}`)
    return 1
  }
  console.log('Elo env validation PASS')
  return 0
}

async function bootstrap() {
  const pnpm = commandText('pnpm', ['--version'])
  if (!pnpm) {
    console.error(
      'pnpm is required. Enable Corepack and activate the repository packageManager version.'
    )
    return 1
  }
  if (!commandText('git', ['--version'])) {
    console.error('Git is required.')
    return 1
  }
  const install = run('pnpm', ['install', '--frozen-lockfile'])
  if (install.status !== 0) return install.status ?? 1
  const git = await gitSetup()
  if (git !== 0) return git
  return doctor()
}

function help() {
  console.log(
    `Elo — Amarelo repository platform CLI\n\nUsage:\n  ./elo bootstrap\n  ./elo doctor [--ci]\n  ./elo env <setup|validate>\n  ./elo check <architecture|memory>\n  ./elo git setup\n  ./elo help\n\nTurborepo/root package scripts own dev, start, build, typecheck, tests, evals, lint and format.`
  )
}

async function main(args) {
  const [command, subcommand] = args
  if (
    !command ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    help()
    return 0
  }
  if (command === 'doctor') return doctor({ ci: args.includes('--ci') })
  if (command === 'bootstrap') return bootstrap()
  if (command === 'env' && subcommand === 'setup') return envSetup()
  if (command === 'env' && subcommand === 'validate') return envValidate()
  if (command === 'git' && subcommand === 'setup') return gitSetup()
  if (command === 'check' && subcommand === 'architecture')
    return runArchitectureCheck({ projectRoot })
  if (command === 'check' && subcommand === 'memory')
    return runMemoryInvariantCheck({ projectRoot })
  console.error(`Unknown Elo command: ${args.join(' ')}`)
  help()
  return 2
}

process.exitCode = await main(process.argv.slice(2))
