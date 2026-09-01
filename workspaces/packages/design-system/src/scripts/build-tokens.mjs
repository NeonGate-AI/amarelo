import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..'
)
const foundationDirectory = resolve(packageDirectory, 'src/foundation')
const outputDirectory = resolve(packageDirectory, 'dist')
const sourceFiles = [
  'colors.tokens.json',
  'typography.tokens.json',
  'gradients.tokens.json'
]

export async function buildTokens() {
  const documents = await Promise.all(
    sourceFiles.map(async (fileName) => {
      const contents = await readFile(
        resolve(foundationDirectory, fileName),
        'utf8'
      )
      return JSON.parse(contents)
    })
  )

  const tokens = Object.assign({}, ...documents)
  const flattenedTokens = flattenTokens(tokens)
  const declarations = flattenedTokens.map(({ path, token, type }) => {
    const value = resolveValue(token.$value, tokens, [path.join('.')])
    return `  --elo-${path.join('-')}: ${serializeValue(value, type, token)};`
  })
  const css = [
    '/* Generated from src/foundation/*.tokens.json. Do not edit directly. */',
    '',
    ':root {',
    ...declarations,
    '}',
    ''
  ].join('\n')

  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    writeFile(
      resolve(outputDirectory, 'tokens.json'),
      `${JSON.stringify(tokens, null, 2)}\n`
    ),
    writeFile(resolve(outputDirectory, 'index.css'), css)
  ])
}

function flattenTokens(node, path = [], inheritedType) {
  const type = node.$type ?? inheritedType
  const entries = []

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) {
      continue
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`Invalid token group at ${[...path, key].join('.')}`)
    }

    if ('$value' in value) {
      const tokenType = value.$type ?? type
      if (!tokenType) {
        throw new TypeError(`Missing $type for ${[...path, key].join('.')}`)
      }
      entries.push({ path: [...path, key], token: value, type: tokenType })
      continue
    }

    entries.push(...flattenTokens(value, [...path, key], type))
  }

  return entries
}

function resolveValue(value, document, stack) {
  if (typeof value === 'string') {
    const match = value.match(/^\{(.+)}$/)
    if (!match) {
      return value
    }

    const reference = match[1]
    if (stack.includes(reference)) {
      throw new TypeError(
        `Circular token reference: ${[...stack, reference].join(' -> ')}`
      )
    }

    const token = reference
      .split('.')
      .reduce((current, segment) => current?.[segment], document)
    if (!token || typeof token !== 'object' || !('$value' in token)) {
      throw new TypeError(`Unknown token reference: ${reference}`)
    }

    return resolveValue(token.$value, document, [...stack, reference])
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, document, stack))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveValue(item, document, stack)
      ])
    )
  }

  return value
}

function serializeValue(value, type, token) {
  switch (type) {
    case 'color':
      return serializeColor(value)
    case 'dimension':
      return `${String(value.value)}${value.unit}`
    case 'fontFamily':
      return value.map(serializeFontFamily).join(', ')
    case 'fontWeight':
    case 'number':
      return String(value)
    case 'gradient':
      return serializeGradient(value, token)
    default:
      if (typeof value === 'string') {
        return value
      }
      throw new TypeError(`Unsupported token type: ${type}`)
  }
}

function serializeColor(value) {
  if (value.hex && (value.alpha === undefined || value.alpha === 1)) {
    return value.hex
  }

  const [red, green, blue] = value.components.map((component) =>
    Math.round(component * 255)
  )
  return `rgb(${red} ${green} ${blue} / ${value.alpha ?? 1})`
}

function serializeFontFamily(value) {
  const genericFamilies = new Set([
    'cursive',
    'fantasy',
    'monospace',
    'sans-serif',
    'serif',
    'system-ui',
    'ui-monospace',
    'ui-sans-serif',
    'ui-serif'
  ])
  return genericFamilies.has(value) ? value : `"${value}"`
}

function serializeGradient(value, token) {
  const cssExtension = token.$extensions?.['health.amarelo.css']
  if (!cssExtension?.function || !cssExtension?.preamble) {
    throw new TypeError(
      'Gradient tokens require health.amarelo.css serialization metadata'
    )
  }

  const stops = value.map(
    (stop) => `${serializeColor(stop.color)} ${formatPercentage(stop.position)}`
  )
  return `${cssExtension.function}(${cssExtension.preamble}, ${stops.join(', ')})`
}

function formatPercentage(position) {
  return `${String(Number((position * 100).toFixed(4)))}%`
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isDirectExecution) {
  await buildTokens()
}
