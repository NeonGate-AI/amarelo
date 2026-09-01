import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs'
])
const CONFIG_SOURCE_NAMES = new Set([
  'next.config.ts',
  'vite.config.ts',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'eslint.config.js'
])

async function exists(path) {
  return Boolean(await stat(path).catch(() => null))
}
async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(
    () => []
  )) {
    if (
      [
        'node_modules',
        'dist',
        '.next',
        '.turbo',
        'coverage',
        '.git',
        '.audit'
      ].includes(entry.name)
    )
      continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await walk(path, out)
    else out.push(path)
  }
  return out
}

export async function runArchitectureCheck({
  projectRoot = process.cwd()
} = {}) {
  const failures = []
  const fail = (rule, file, detail, fix) =>
    failures.push({ rule, file, detail, fix })
  const files = await walk(projectRoot)
  const rel = (path) => relative(projectRoot, path).split(sep).join('/')
  const workspaces = []

  for (const packageFile of files.filter(
    (path) =>
      rel(path).startsWith('workspaces/') && rel(path).endsWith('/package.json')
  )) {
    const manifest = JSON.parse(await readFile(packageFile, 'utf8'))
    workspaces.push({
      root: rel(packageFile).slice(0, -'/package.json'.length),
      name: manifest.name,
      manifest
    })
  }

  for (const ws of workspaces) {
    if (ws.root.startsWith('workspaces/ai/') && !ws.name?.startsWith('@ai/'))
      fail(
        'package-namespace',
        ws.root,
        `${ws.name} must use @ai/*`,
        'rename the package'
      )
    if (
      ws.root === 'workspaces/memory-nucleus' &&
      ws.name !== '@nucleus/memory'
    )
      fail(
        'package-namespace',
        ws.root,
        `${ws.name} must be @nucleus/memory`,
        'use the canonical name'
      )
    if (
      ws.root.startsWith('workspaces/packages/') &&
      !ws.name?.startsWith('@repo/')
    )
      fail(
        'package-namespace',
        ws.root,
        `${ws.name} must use @repo/*`,
        'rename the package'
      )
    if (ws.root.startsWith('workspaces/apps/') && ws.name?.startsWith('@'))
      fail(
        'app-package-name',
        ws.root,
        `${ws.name} must use an app name`,
        'remove shared-package namespace'
      )
    if (!(await exists(join(projectRoot, ws.root, 'src'))))
      fail(
        'source-root',
        ws.root,
        'code-bearing workspace has no src/',
        'move first-party implementation under src/'
      )
  }

  for (const forbidden of [
    'elos',
    'tooling',
    'workspaces/memory-nucleus/apps',
    'workspaces/memory-nucleus/packages'
  ]) {
    if (await exists(join(projectRoot, forbidden)))
      fail(
        'forbidden-topology',
        forbidden,
        'obsolete/forbidden path exists',
        'remove or migrate the path'
      )
  }
  for (const required of [
    'AGENTS.md',
    '.audit/.gitkeep',
    '.agents/skills/readme.md',
    '.agents/context/product/strategy.md'
  ]) {
    if (!(await exists(join(projectRoot, required))))
      fail(
        'harness',
        required,
        'required harness/evidence path missing',
        'restore the canonical path'
      )
  }
  if (await exists(join(projectRoot, 'agents.md')))
    fail(
      'harness',
      'agents.md',
      'lowercase duplicate entrypoint exists',
      'keep only AGENTS.md'
    )

  const agentDirs = (
    await readdir(join(projectRoot, '.agents'), { withFileTypes: true }).catch(
      () => []
    )
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const expected = ['adrs', 'context', 'rules', 'skills', 'specs']
  for (const name of expected)
    if (!agentDirs.includes(name))
      fail(
        'agents-taxonomy',
        '.agents',
        `missing ${name}/`,
        'restore the canonical category'
      )
  for (const name of agentDirs)
    if (!expected.includes(name))
      fail(
        'agents-taxonomy',
        `.agents/${name}`,
        'unexpected first-class category',
        'move durable knowledge into the canonical taxonomy'
      )

  const agentEntry = await readFile(
    join(projectRoot, 'AGENTS.md'),
    'utf8'
  ).catch(() => '')
  const ruleDir = join(projectRoot, '.agents', 'rules')
  for (const name of (await readdir(ruleDir).catch(() => [])).filter((name) =>
    name.endsWith('.md')
  )) {
    const text = await readFile(join(ruleDir, name), 'utf8')
    if (!text.startsWith('---\n') || !text.includes('\n---\n'))
      fail(
        'rule-frontmatter',
        `.agents/rules/${name}`,
        'rule has invalid/missing frontmatter',
        'add valid YAML frontmatter'
      )
    if (
      /alwaysApply:\s*true/u.test(text) &&
      !agentEntry.includes('alwaysApply: true')
    )
      fail(
        'always-rules',
        'AGENTS.md',
        'alwaysApply rules are not operationally discoverable',
        'tell agents to load alwaysApply rules'
      )
  }

  for (const path of files) {
    const r = rel(path)
    if (r.endsWith('.value-object.ts'))
      fail(
        'vo-suffix',
        r,
        'legacy .value-object.ts suffix remains',
        'rename to .vo.ts'
      )
    if (!SOURCE_EXTENSIONS.has(extname(path))) continue
    const text = await readFile(path, 'utf8').catch(() => '')
    for (const match of text.matchAll(
      /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g
    )) {
      const spec = match[1]
      if (/^(\.\.\/){2,}/.test(spec))
        fail(
          'deep-relative-import',
          r,
          spec,
          'use a barrel/import map/package API'
        )
      if (
        r.startsWith('workspaces/memory-nucleus/src/domain/') &&
        (spec.startsWith('#application/') ||
          spec.startsWith('#infrastructure/'))
      )
        fail(
          'clean-domain-direction',
          r,
          spec,
          'Domain cannot depend on Application/Infrastructure'
        )
      if (
        r.startsWith('workspaces/memory-nucleus/src/application/') &&
        spec.startsWith('#infrastructure/')
      )
        fail(
          'clean-application-direction',
          r,
          spec,
          'define an Application port'
        )
      if (
        r.startsWith('workspaces/memory-nucleus/src/') &&
        !r.includes('/assurance/') &&
        spec.includes('/assurance/')
      )
        fail(
          'assurance-production-dependency',
          r,
          spec,
          'production layers must not depend on assurance'
        )
      if (r.startsWith('workspaces/ai/') && spec === '@nucleus/memory')
        fail(
          'memory-sdk-boundary',
          r,
          spec,
          'AI consumes memory through @repo/memory-sdk'
        )
      if (
        r.startsWith('workspaces/ai/knowledge/') &&
        spec === '@repo/memory-sdk'
      )
        fail(
          'memory-knowledge-isolation',
          r,
          spec,
          'Knowledge remains independent from personal memory'
        )
    }
  }

  for (const ws of workspaces) {
    const workspaceRoot = join(projectRoot, ws.root)
    for (const path of files.filter(
      (file) =>
        rel(file).startsWith(`${ws.root}/`) &&
        SOURCE_EXTENSIONS.has(extname(file))
    )) {
      const local = relative(workspaceRoot, path).split(sep).join('/')
      if (local.startsWith('src/')) continue
      if (
        CONFIG_SOURCE_NAMES.has(local) ||
        /(?:^|\/)config\.[cm]?[jt]s$/u.test(local)
      )
        continue
      fail(
        'source-outside-root',
        rel(path),
        'first-party source lives outside src/',
        'move implementation under src/'
      )
    }
  }

  // Leaf barrels are enforced on non-app module workspaces. App/React folder conventions are handled in Handoff 3.
  for (const ws of workspaces.filter(
    (item) => !item.root.startsWith('workspaces/apps/')
  )) {
    const sourceRoot = join(projectRoot, ws.root, 'src')
    if (!(await exists(sourceRoot))) continue
    const dirs = []
    async function collect(dir) {
      const entries = await readdir(dir, { withFileTypes: true }).catch(
        () => []
      )
      const childDirs = entries.filter((entry) => entry.isDirectory())
      for (const child of childDirs) await collect(join(dir, child.name))
      const moduleFiles = entries.filter(
        (entry) =>
          entry.isFile() &&
          SOURCE_EXTENSIONS.has(extname(entry.name)) &&
          entry.name !== 'index.ts'
      )
      const childHasSource = await Promise.all(
        childDirs.map(async (child) =>
          (await walk(join(dir, child.name), [])).some((file) =>
            SOURCE_EXTENSIONS.has(extname(file))
          )
        )
      )
      if (moduleFiles.length && !childHasSource.some(Boolean))
        dirs.push({ dir, moduleFiles })
    }
    await collect(sourceRoot)
    for (const leaf of dirs) {
      const indexPath = join(leaf.dir, 'index.ts')
      if (!(await exists(indexPath)))
        fail(
          'leaf-barrel',
          rel(leaf.dir),
          'code-bearing leaf has no index.ts',
          'add a barrel exporting every project-created module in the leaf'
        )
    }
  }

  const nucleus = workspaces.find(
    (item) => item.root === 'workspaces/memory-nucleus'
  )
  for (const [key, target] of Object.entries(nucleus?.manifest.imports ?? {})) {
    if (!key.endsWith('/*') || !String(target).includes('*')) continue
    const base = String(target)
      .slice(0, String(target).indexOf('*'))
      .replace(/^\.\//, '')
    if (!(await exists(join(projectRoot, 'workspaces/memory-nucleus', base))))
      fail(
        'import-map',
        'workspaces/memory-nucleus/package.json',
        `${key} -> ${target} does not resolve`,
        'repair import map'
      )
  }

  if (failures.length) {
    console.error(`Architecture FAIL (${failures.length})`)
    for (const finding of failures)
      console.error(
        `\n[${finding.rule}] ${finding.file}\n  ${finding.detail}\n  fix: ${finding.fix}`
      )
    return 1
  }
  console.log(`Architecture PASS — ${workspaces.length} workspaces`)
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`)
  process.exitCode = await runArchitectureCheck()
