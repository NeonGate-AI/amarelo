import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
const RESERVED_FRAMEWORK_FILES = new Set([
  'default.tsx',
  'error.tsx',
  'layout.tsx',
  'loading.tsx',
  'not-found.tsx',
  'page.tsx',
  'route.ts',
  'template.tsx'
])
const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'node_modules'
])

async function pathStat(path) {
  return stat(path).catch(() => null)
}

async function walk(directory, out = []) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(
    () => []
  )) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path, out)
    else out.push(path)
  }
  return out
}

async function sourceFile(path) {
  const direct = await pathStat(path)
  if (direct?.isFile() && SOURCE_EXTENSIONS.includes(extname(path))) return path
  if (extname(path)) return null
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = `${path}${extension}`
    if ((await pathStat(candidate))?.isFile()) return candidate
  }
  return null
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function loadTsPaths(configPath, visited = new Set()) {
  const normalized = resolve(configPath)
  if (visited.has(normalized)) return {}
  visited.add(normalized)

  const config = await loadJson(normalized).catch(() => ({}))
  let inherited = {}
  if (typeof config.extends === 'string' && config.extends.startsWith('.')) {
    let extendedPath = resolve(dirname(normalized), config.extends)
    if (!extname(extendedPath)) extendedPath = `${extendedPath}.json`
    inherited = await loadTsPaths(extendedPath, visited)
  }
  return {
    ...inherited,
    ...(config.compilerOptions?.paths ?? {})
  }
}

function matchAlias(pattern, specifier) {
  const star = pattern.indexOf('*')
  if (star < 0) return pattern === specifier ? '' : null
  const prefix = pattern.slice(0, star)
  const suffix = pattern.slice(star + 1)
  if (!(specifier.startsWith(prefix) && specifier.endsWith(suffix))) return null
  return specifier.slice(prefix.length, specifier.length - suffix.length || undefined)
}

async function resolveAlias(specifier, config) {
  for (const [pattern, targets] of Object.entries(config.paths)) {
    const matched = matchAlias(pattern, specifier)
    if (matched === null) continue
    for (const target of targets) {
      const replaced = String(target).replace('*', matched)
      const candidate = resolve(config.root, replaced)
      const candidateStat = await pathStat(candidate)
      if (candidateStat?.isDirectory()) return { kind: 'directory', path: candidate }
      const file = await sourceFile(candidate)
      if (file) return { kind: 'file', path: file }
    }
  }
  return null
}

function importSpecifiers(text) {
  const out = []
  const pattern = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/gu
  for (const match of text.matchAll(pattern)) out.push(match[1])
  return out
}

function isSource(path) {
  return SOURCE_EXTENSIONS.includes(extname(path)) && !path.endsWith('.d.ts')
}

async function crossesIntoBarrel(importer, target) {
  if (basename(target) === 'index.ts') return false
  const targetDirectory = dirname(target)
  if (targetDirectory === dirname(importer)) return false
  return (await pathStat(join(targetDirectory, 'index.ts')))?.isFile() ?? false
}

export async function runImportBoundariesAudit({ projectRoot = process.cwd() } = {}) {
  const failures = []
  const fail = (rule, file, detail) => failures.push({ rule, file, detail })
  const workspaceRoot = join(projectRoot, 'workspaces')
  const allFiles = await walk(workspaceRoot)
  const rel = (path) => relative(projectRoot, path).split(sep).join('/')

  const configs = []
  for (const path of allFiles.filter((file) => basename(file) === 'tsconfig.json')) {
    configs.push({
      root: dirname(path),
      paths: await loadTsPaths(path)
    })
  }
  configs.sort((a, b) => b.root.length - a.root.length)

  for (const packagePath of allFiles.filter((file) => basename(file) === 'package.json')) {
    const manifest = await loadJson(packagePath).catch(() => ({}))
    for (const key of Object.keys(manifest.imports ?? {})) {
      if (key.startsWith('#')) {
        fail(
          'absolute-alias-prefix',
          rel(packagePath),
          `${key} uses the forbidden # prefix; first-party absolute aliases use @`
        )
      }
    }
  }

  const sourceFiles = allFiles.filter(isSource)
  for (const path of sourceFiles) {
    const text = await readFile(path, 'utf8').catch(() => '')
    const importerIsBarrel = basename(path) === 'index.ts'
    const config = configs.find(
      (candidate) => path === candidate.root || path.startsWith(`${candidate.root}${sep}`)
    )

    for (const specifier of importSpecifiers(text)) {
      if (specifier.startsWith('#')) {
        fail(
          'absolute-alias-prefix',
          rel(path),
          `${specifier} uses #; first-party absolute aliases must start with @`
        )
        continue
      }
      if (importerIsBarrel) continue

      if (specifier.startsWith('.')) {
        const candidate = resolve(dirname(path), specifier)
        if ((await pathStat(candidate))?.isDirectory()) continue
        const directFile = await sourceFile(candidate)
        if (directFile && (await crossesIntoBarrel(path, directFile))) {
          fail(
            'barrel-import',
            rel(path),
            `${specifier} crosses into ${rel(dirname(directFile))}; import that directory barrel instead`
          )
        }
        continue
      }

      if (specifier.startsWith('@') && config) {
        const resolution = await resolveAlias(specifier, config)
        if (
          resolution?.kind === 'file' &&
          (await crossesIntoBarrel(path, resolution.path))
        ) {
          fail(
            'barrel-import',
            rel(path),
            `${specifier} crosses into ${rel(dirname(resolution.path))}; import that directory barrel instead`
          )
        }
      }
    }
  }

  const byDirectory = new Map()
  for (const path of sourceFiles) {
    const directory = dirname(path)
    const entries = byDirectory.get(directory) ?? []
    entries.push(path)
    byDirectory.set(directory, entries)
  }
  for (const [directory, directFiles] of byDirectory) {
    const semanticFiles = directFiles.filter(
      (path) => basename(path) !== 'index.ts' && !path.endsWith('.d.ts')
    )
    if (!semanticFiles.length) continue
    const hasNestedSource = sourceFiles.some(
      (path) => dirname(path) !== directory && path.startsWith(`${directory}${sep}`)
    )
    if (hasNestedSource) continue
    if (semanticFiles.every((path) => RESERVED_FRAMEWORK_FILES.has(basename(path)))) continue

    const barrel = join(directory, 'index.ts')
    if (!(await pathStat(barrel))?.isFile()) {
      fail('leaf-barrel', rel(directory), 'code-bearing leaf directory has no index.ts')
      continue
    }
    const barrelText = await readFile(barrel, 'utf8')
    for (const modulePath of semanticFiles) {
      const stem = basename(modulePath).replace(/\.[^.]+$/u, '')
      if (!barrelText.includes(`./${stem}`)) {
        fail(
          'leaf-barrel-export',
          rel(barrel),
          `${basename(modulePath)} is not exported by the leaf barrel`
        )
      }
    }
  }

  if (failures.length) {
    console.error(`Import boundaries FAIL (${failures.length})`)
    for (const finding of failures) {
      console.error(`\n[${finding.rule}] ${finding.file}\n  ${finding.detail}`)
    }
    return 1
  }

  console.log('Import boundaries PASS')
  console.log('@ absolute aliases: PASS')
  console.log('cross-directory barrel imports: PASS')
  console.log('leaf index.ts coverage: PASS')
  return 0
}

process.exitCode = await runImportBoundariesAudit()
