import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const CONFIG_SOURCE_NAMES = new Set([
  'next.config.ts',
  'next-env.d.ts',
  'vite.config.ts',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'eslint.config.js'
])
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'node_modules'
])

async function exists(path) {
  return Boolean(await stat(path).catch(() => null))
}

async function walk(directory, out = []) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(
    () => []
  )) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path, out)
    else out.push(path)
  }
  return out
}

function exportTargets(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) exportTargets(nested, out)
  }
  return out
}

export async function runArchitectureCheck({ projectRoot = process.cwd() } = {}) {
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

  for (const workspace of workspaces) {
    if (
      workspace.root.startsWith('workspaces/ai/') &&
      !workspace.name?.startsWith('@ai/')
    ) {
      fail(
        'package-namespace',
        workspace.root,
        `${workspace.name} must use @ai/*`,
        'rename the package'
      )
    }
    if (
      workspace.root === 'workspaces/memory-nucleus' &&
      workspace.name !== '@nucleus/memory'
    ) {
      fail(
        'package-namespace',
        workspace.root,
        `${workspace.name} must be @nucleus/memory`,
        'use the canonical name'
      )
    }
    if (
      workspace.root.startsWith('workspaces/packages/') &&
      !workspace.name?.startsWith('@repo/')
    ) {
      fail(
        'package-namespace',
        workspace.root,
        `${workspace.name} must use @repo/*`,
        'rename the package'
      )
    }
    if (
      workspace.root.startsWith('workspaces/apps/') &&
      workspace.name?.startsWith('@')
    ) {
      fail(
        'app-package-name',
        workspace.root,
        `${workspace.name} must use an app name`,
        'remove the shared-package namespace'
      )
    }
    if (!(await exists(join(projectRoot, workspace.root, 'src')))) {
      fail(
        'source-root',
        workspace.root,
        'code-bearing workspace has no src/',
        'move first-party implementation under src/'
      )
    }

    for (const target of exportTargets(workspace.manifest.exports)) {
      if (!target.startsWith('./')) continue
      const normalized = target.slice(2)
      const prefix = normalized.includes('*')
        ? normalized.slice(0, normalized.indexOf('*'))
        : normalized
      const resolves = await exists(join(projectRoot, workspace.root, prefix))
      const generatedByBuild =
        normalized.startsWith('dist/') && Boolean(workspace.manifest.scripts?.build)
      if (!resolves && !generatedByBuild) {
        fail(
          'package-export',
          `${workspace.root}/package.json`,
          `${target} does not resolve to source or a declared build artifact`,
          'repair the export target or package build contract'
        )
      }
    }
  }

  const conversationWorkspaces = workspaces.filter(
    (workspace) => workspace.name === '@ai/conversation'
  )
  if (
    conversationWorkspaces.length !== 1 ||
    conversationWorkspaces[0]?.root !==
      'workspaces/ai/orchestrator/conversation'
  ) {
    fail(
      'conversation-topology',
      'workspaces/ai/orchestrator/conversation',
      '@ai/conversation must exist exactly once at its canonical orchestrator path',
      'move or deduplicate the Conversation workspace'
    )
  }

  for (const required of [
    'AGENTS.md',
    '.agents/skills/readme.md',
    '.agents/context/product/strategy.md',
    'cli/elo',
    'cli/src',
    'workspaces/ai/orchestrator/conversation'
  ]) {
    if (!(await exists(join(projectRoot, required)))) {
      fail(
        'harness',
        required,
        'required harness/platform path missing',
        'restore the canonical path'
      )
    }
  }

  for (const forbidden of [
    'elo',
    'elos',
    'tooling',
    'workspaces/memory-nucleus/apps',
    'workspaces/memory-nucleus/packages',
    'workspaces/ai/conversation',
    'workspaces/ai/orchestrator/conversation/src/agents'
  ]) {
    if (await exists(join(projectRoot, forbidden))) {
      fail(
        'forbidden-topology',
        forbidden,
        'obsolete/forbidden path exists',
        'remove or migrate the path'
      )
    }
  }

  for (const parent of [
    'workspaces/ai/agents',
    'workspaces/ai/orchestrator'
  ]) {
    for (const forbiddenChild of ['package.json', 'src', 'tsconfig.json']) {
      const path = `${parent}/${forbiddenChild}`
      if (await exists(join(projectRoot, path))) {
        fail(
          'ai-capability-parent',
          path,
          `${parent} is a structural parent and cannot own ${forbiddenChild}`,
          'move ownership into a named child workspace'
        )
      }
    }
  }

  const agentDirs = (
    await readdir(join(projectRoot, '.agents'), { withFileTypes: true }).catch(
      () => []
    )
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const expectedAgentDirs = ['adrs', 'context', 'rules', 'skills', 'specs']
  for (const name of expectedAgentDirs) {
    if (!agentDirs.includes(name)) {
      fail(
        'agents-taxonomy',
        '.agents',
        `missing ${name}/`,
        'restore the canonical category'
      )
    }
  }
  for (const name of agentDirs) {
    if (!expectedAgentDirs.includes(name)) {
      fail(
        'agents-taxonomy',
        `.agents/${name}`,
        'unexpected first-class category',
        'move durable knowledge into the canonical taxonomy'
      )
    }
  }

  const agentEntry = await readFile(join(projectRoot, 'AGENTS.md'), 'utf8').catch(
    () => ''
  )
  const ruleDir = join(projectRoot, '.agents', 'rules')
  for (const name of (await readdir(ruleDir).catch(() => [])).filter((item) =>
    item.endsWith('.md')
  )) {
    const text = await readFile(join(ruleDir, name), 'utf8')
    if (!text.startsWith('---\n') || !text.includes('\n---\n')) {
      fail(
        'rule-frontmatter',
        `.agents/rules/${name}`,
        'rule has invalid/missing frontmatter',
        'add valid YAML frontmatter'
      )
      continue
    }
    const frontmatter = text.slice(4, text.indexOf('\n---\n', 4))
    if (!/^(?:name|title):\s*\S/mu.test(frontmatter)) {
      fail(
        'rule-frontmatter',
        `.agents/rules/${name}`,
        'rule frontmatter has no name/title',
        'add a stable human-readable rule identity'
      )
    }
    if (
      /alwaysApply:\s*true/u.test(frontmatter) &&
      !agentEntry.includes('alwaysApply: true')
    ) {
      fail(
        'always-rules',
        'AGENTS.md',
        'alwaysApply rules are not operationally discoverable',
        'tell agents to load alwaysApply rules'
      )
    }
  }

  for (const path of files) {
    const relativePath = rel(path)

    if (basename(path) === '.gitkeep') {
      const siblings = (await readdir(dirname(path)).catch(() => [])).filter(
        (name) => name !== '.gitkeep'
      )
      if (siblings.length) {
        fail(
          'gitkeep-hygiene',
          relativePath,
          `.gitkeep is redundant because the directory contains ${siblings.join(', ')}`,
          'remove the redundant .gitkeep file'
        )
      }
    }

    if (extname(path) === '.css') {
      const css = await readFile(path, 'utf8').catch(() => '')
      for (const match of css.matchAll(/@source\s+["']([^"']+)["']/gu)) {
        const source = match[1]
        if (!source.startsWith('.')) continue
        if (!(await exists(resolve(dirname(path), source)))) {
          fail(
            'tailwind-source',
            relativePath,
            `${source} does not resolve from this stylesheet`,
            'repair the relative @source path after source-root moves'
          )
        }
      }
    }

    if (relativePath.endsWith('.value-object.ts')) {
      fail(
        'vo-suffix',
        relativePath,
        'legacy .value-object.ts suffix remains',
        'rename to .vo.ts'
      )
    }
    if (relativePath.endsWith('.vo.ts')) {
      const text = await readFile(path, 'utf8').catch(() => '')
      if (!/export\s+(?:abstract\s+)?class\s+\w+/u.test(text)) {
        fail(
          'vo-semantics',
          relativePath,
          '.vo.ts must define an encapsulated Value Object class',
          'use another semantic suffix or implement a real Value Object'
        )
      }
    }

    if (!SOURCE_EXTENSIONS.has(extname(path))) continue
    const text = await readFile(path, 'utf8').catch(() => '')

    if (
      relativePath.startsWith('workspaces/memory-nucleus/src/domain/') &&
      /from\s+['"]node:crypto['"]/u.test(text)
    ) {
      fail(
        'domain-technology-dependency',
        relativePath,
        'Domain imports node:crypto',
        'move generic hashing to Infrastructure'
      )
    }

    for (const match of text.matchAll(
      /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/gu
    )) {
      const specifier = match[1]
      if (/^(\.\.\/){2,}/u.test(specifier)) {
        fail(
          'deep-relative-import',
          relativePath,
          specifier,
          'use a barrel/import alias/package API'
        )
      }
      if (
        relativePath.startsWith('workspaces/memory-nucleus/src/domain/') &&
        (specifier.startsWith('@application/') ||
          specifier === '@application' ||
          specifier.startsWith('@infrastructure/') ||
          specifier === '@infrastructure')
      ) {
        fail(
          'clean-domain-direction',
          relativePath,
          specifier,
          'Domain cannot depend on Application/Infrastructure'
        )
      }
      if (
        relativePath.startsWith('workspaces/memory-nucleus/src/application/') &&
        (specifier.startsWith('@infrastructure/') ||
          specifier === '@infrastructure')
      ) {
        fail(
          'clean-application-direction',
          relativePath,
          specifier,
          'define an Application port'
        )
      }
      if (
        relativePath.startsWith('workspaces/memory-nucleus/src/') &&
        !relativePath.includes('/assurance/') &&
        specifier.includes('/assurance/')
      ) {
        fail(
          'assurance-production-dependency',
          relativePath,
          specifier,
          'production layers must not depend on assurance'
        )
      }
      if (
        relativePath.startsWith('workspaces/ai/') &&
        specifier === '@nucleus/memory'
      ) {
        fail(
          'memory-sdk-boundary',
          relativePath,
          specifier,
          'AI consumes personal memory through @repo/memory-sdk'
        )
      }
      if (
        relativePath.startsWith('workspaces/ai/knowledge/') &&
        specifier === '@repo/memory-sdk'
      ) {
        fail(
          'memory-knowledge-isolation',
          relativePath,
          specifier,
          'Knowledge remains independent from personal memory'
        )
      }
    }
  }

  for (const workspace of workspaces) {
    const workspaceRoot = join(projectRoot, workspace.root)
    for (const path of files.filter(
      (file) =>
        rel(file).startsWith(`${workspace.root}/`) &&
        SOURCE_EXTENSIONS.has(extname(file))
    )) {
      const local = relative(workspaceRoot, path).split(sep).join('/')
      if (local.startsWith('src/')) continue
      if (
        CONFIG_SOURCE_NAMES.has(local) ||
        /(?:^|\/)config\.[cm]?[jt]s$/u.test(local)
      ) {
        continue
      }
      fail(
        'source-outside-root',
        rel(path),
        'first-party source lives outside src/',
        'move implementation under src/'
      )
    }
  }

  const rootManifest = JSON.parse(
    await readFile(join(projectRoot, 'package.json'), 'utf8')
  )
  if (
    rootManifest.dependencies?.['@neongate-ai/neon'] ||
    rootManifest.devDependencies?.['@neongate-ai/neon']
  ) {
    fail(
      'elo-ownership',
      'package.json',
      'external generic Neon CLI dependency remains after Elo cutover',
      'remove @neongate-ai/neon and regenerate the lockfile'
    )
  }

  if (failures.length) {
    console.error(`Architecture FAIL (${failures.length})`)
    for (const finding of failures) {
      console.error(
        `\n[${finding.rule}] ${finding.file}\n  ${finding.detail}\n  fix: ${finding.fix}`
      )
    }
    return 1
  }

  console.log(`Architecture PASS — ${workspaces.length} workspaces`)
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await runArchitectureCheck()
}
