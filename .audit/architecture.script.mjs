import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'

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
  'next-env.d.ts',
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

function exportTargets(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (value && typeof value === 'object')
    for (const nested of Object.values(value)) exportTargets(nested, out)
  return out
}

function isFrameworkLeafExempt(workspaceRoot, directory, moduleFiles) {
  if (!workspaceRoot.startsWith('workspaces/apps/')) return false
  const local = relative(workspaceRoot, directory).split(sep).join('/')
  if (
    moduleFiles.every((entry) =>
      [
        'layout.tsx',
        'page.tsx',
        'route.ts',
        'loading.tsx',
        'error.tsx',
        'not-found.tsx',
        'template.tsx',
        'default.tsx'
      ].includes(entry.name)
    )
  )
    return true

  return !/(?:^|\/)(?:lib|section|state|ui|views)(?:\/|$)/u.test(local)
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

    for (const target of exportTargets(ws.manifest.exports)) {
      if (!target.startsWith('./')) continue
      const normalized = target.slice(2)
      const prefix = normalized.includes('*')
        ? normalized.slice(0, normalized.indexOf('*'))
        : normalized
      const resolves = await exists(join(projectRoot, ws.root, prefix))
      const generatedByBuild =
        normalized.startsWith('dist/') && Boolean(ws.manifest.scripts?.build)
      if (!resolves && !generatedByBuild)
        fail(
          'package-export',
          `${ws.root}/package.json`,
          `${target} does not resolve to source or a declared build artifact`,
          'repair the export target or package build contract'
        )
    }
  }

  if (!(await exists(join(projectRoot, 'cli/src'))))
    fail(
      'source-root',
      'cli',
      'the Elo development subsystem has no cli/src/',
      'restore the embedded CLI source root'
    )
  if (await exists(join(projectRoot, 'cli/package.json')))
    fail(
      'cli-ownership',
      'cli/package.json',
      'Elo must not be a nested package/workspace',
      'keep CLI dependencies in the repository root'
    )

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
    const frontmatter = text.startsWith('---\n')
      ? text.slice(4, text.indexOf('\n---\n', 4))
      : ''
    if (!/^(?:name|title):\s*\S/mu.test(frontmatter))
      fail(
        'rule-frontmatter',
        `.agents/rules/${name}`,
        'rule frontmatter has no name/title',
        'add a stable human-readable rule identity'
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
    if (extname(path) === '.css') {
      const css = await readFile(path, 'utf8').catch(() => '')
      for (const match of css.matchAll(/@source\s+["']([^"']+)["']/gu)) {
        const source = match[1]
        if (!source.startsWith('.')) continue
        if (!(await exists(resolve(dirname(path), source))))
          fail(
            'tailwind-source',
            r,
            `${source} does not resolve from this stylesheet`,
            'repair the relative @source path after source-root moves'
          )
      }
    }
    if (r.endsWith('.value-object.ts'))
      fail(
        'vo-suffix',
        r,
        'legacy .value-object.ts suffix remains',
        'rename to .vo.ts'
      )
    if (r.endsWith('.vo.ts')) {
      const valueObject = await readFile(path, 'utf8').catch(() => '')
      if (!/export\s+(?:abstract\s+)?class\s+\w+/u.test(valueObject))
        fail(
          'vo-semantics',
          r,
          '.vo.ts must define an encapsulated Value Object class',
          'use a semantic suffix such as .compute/.domain or implement a real Value Object'
        )
    }
    if (!SOURCE_EXTENSIONS.has(extname(path))) continue
    const text = await readFile(path, 'utf8').catch(() => '')
    if (
      r.startsWith('workspaces/memory-nucleus/src/domain/') &&
      /from\s+['"]node:crypto['"]/u.test(text)
    )
      fail(
        'domain-technology-dependency',
        r,
        'Domain imports node:crypto',
        'move generic hashing to Infrastructure and keep only domain meaning here'
      )
    if (r !== 'cli/src/scripts/architecture.script.mjs')
      for (const stale of [
        '#domain/' + 'judgment/',
        '#domain/services/' + 'memory-text.normalizer',
        '.value' + '-object'
      ])
        if (text.includes(stale))
          fail(
            'obsolete-import',
            r,
            stale,
            'use the normalized source path and canonical suffix'
          )
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

  for (const ws of workspaces) {
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
          entry.name !== 'index.ts' &&
          !entry.name.endsWith('.d.ts')
      )
      const childHasSource = await Promise.all(
        childDirs.map(async (child) =>
          (await walk(join(dir, child.name), [])).some((file) =>
            SOURCE_EXTENSIONS.has(extname(file))
          )
        )
      )
      if (
        moduleFiles.length &&
        !childHasSource.some(Boolean) &&
        !isFrameworkLeafExempt(ws.root, dir, moduleFiles)
      )
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
      else {
        const barrel = await readFile(indexPath, 'utf8')
        for (const moduleFile of leaf.moduleFiles) {
          const stem = moduleFile.name.replace(/\.[^.]+$/u, '')
          if (!barrel.includes(`./${stem}`))
            fail(
              'leaf-barrel-export',
              rel(indexPath),
              `${moduleFile.name} is not exported`,
              'export every project-created leaf module from index.ts'
            )
        }
      }
    }
  }

  const rootManifest = JSON.parse(
    await readFile(join(projectRoot, 'package.json'), 'utf8')
  )
  if (
    rootManifest.dependencies?.['@neongate-ai/neon'] ||
    rootManifest.devDependencies?.['@neongate-ai/neon']
  )
    fail(
      'elo-ownership',
      'package.json',
      'external generic Neon CLI dependency remains after Elo cutover',
      'remove @neongate-ai/neon and regenerate the lockfile'
    )

  const cliFiles = files.filter((path) => {
    const r = rel(path)
    return r === 'elo' || r.startsWith('cli/src/')
  })
  const hostMutationPattern =
    /(?:process\.env\.HOME|homedir\s*\(|\/usr\/local|\.local\/bin|\.(?:bashrc|zshrc)|git\s+config\s+--global|(?:npm|pnpm)\s+[^\n]*(?:--global|-g\b))/u
  const forbiddenEloCommandPattern =
    /command\s*===\s*['"](?:build|dev|eval|format|lint|start|test|typecheck|verify)['"]/u
  for (const path of cliFiles) {
    const text = await readFile(path, 'utf8').catch(() => '')
    if (hostMutationPattern.test(text))
      fail(
        'elo-host-mutation',
        rel(path),
        'Elo contains host/global mutation behavior',
        'keep bootstrap, env and Git setup project-local'
      )
    if (forbiddenEloCommandPattern.test(text))
      fail(
        'elo-command-boundary',
        rel(path),
        'Elo exposes a task-runner command owned by root/Turborepo',
        'remove the command from Elo and use the root package script'
      )
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
