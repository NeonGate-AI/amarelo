import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
const EXCLUDED_DIRECTORIES = new Set(['.git', '.next', '.turbo', 'coverage', 'dist', 'node_modules'])

async function pathStat(path) {
  return stat(path).catch(() => null)
}

async function walk(directory, out = []) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
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
  return { ...inherited, ...(config.compilerOptions?.paths ?? {}) }
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
  return [...new Set(out)]
}

function replaceSpecifier(text, previous, next) {
  if (previous === next) return text
  return text
    .split(`'${previous}'`).join(`'${next}'`)
    .split(`"${previous}"`).join(`"${next}"`)
}

function directorySpecifier(specifier) {
  const slash = specifier.lastIndexOf('/')
  return slash < 0 ? specifier : specifier.slice(0, slash)
}

function relativeDirectorySpecifier(importer, targetDirectory) {
  let specifier = relative(dirname(importer), targetDirectory).split(sep).join('/')
  if (!specifier.startsWith('.')) specifier = `./${specifier}`
  return specifier
}

const projectRoot = process.cwd()
const files = await walk(join(projectRoot, 'workspaces'))
const sourceFiles = files.filter(
  (path) => SOURCE_EXTENSIONS.includes(extname(path)) && !path.endsWith('.d.ts')
)
const configs = []
for (const path of files.filter((file) => basename(file) === 'tsconfig.json')) {
  configs.push({ root: dirname(path), paths: await loadTsPaths(path) })
}
configs.sort((a, b) => b.root.length - a.root.length)

let changedFiles = 0
let changedImports = 0
for (const path of sourceFiles) {
  let text = await readFile(path, 'utf8')
  const original = text
  const config = configs.find(
    (candidate) => path === candidate.root || path.startsWith(`${candidate.root}${sep}`)
  )

  for (const originalSpecifier of importSpecifiers(text)) {
    let specifier = originalSpecifier.startsWith('#')
      ? `@${originalSpecifier.slice(1)}`
      : originalSpecifier

    let resolution = null
    if (specifier.startsWith('.')) {
      const candidate = resolve(dirname(path), specifier)
      const candidateStat = await pathStat(candidate)
      if (candidateStat?.isDirectory()) resolution = { kind: 'directory', path: candidate }
      else {
        const file = await sourceFile(candidate)
        if (file) resolution = { kind: 'file', path: file }
      }
    } else if (specifier.startsWith('@') && config) {
      resolution = await resolveAlias(specifier, config)
    }

    if (
      resolution?.kind === 'file' &&
      basename(resolution.path) !== 'index.ts' &&
      dirname(resolution.path) !== dirname(path) &&
      (await pathStat(join(dirname(resolution.path), 'index.ts')))?.isFile()
    ) {
      specifier = specifier.startsWith('.')
        ? relativeDirectorySpecifier(path, dirname(resolution.path))
        : directorySpecifier(specifier)
    }

    if (specifier !== originalSpecifier) {
      text = replaceSpecifier(text, originalSpecifier, specifier)
      changedImports += 1
    }
  }

  if (text !== original) {
    await writeFile(path, text)
    changedFiles += 1
  }
}

console.log(`Handoff 3.5 import migration: ${changedImports} imports in ${changedFiles} files`)
