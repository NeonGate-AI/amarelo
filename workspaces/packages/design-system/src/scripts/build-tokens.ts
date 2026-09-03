import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

type JsonRecord = Record<string, unknown>

type TokenNode = JsonRecord & {
  $extensions?: Record<string, JsonRecord>
  $type?: string
  $value?: unknown
}

type FlattenedToken = {
  path: string[]
  token: TokenNode & { $value: unknown }
  type: string
}

type ColorValue = {
  alpha?: number
  components: number[]
  hex?: string
}

type DimensionValue = {
  unit: string
  value: number | string
}

type GradientStop = {
  color: ColorValue
  position: number
}

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

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asColor(value: unknown): ColorValue {
  if (!isRecord(value) || !Array.isArray(value.components)) {
    throw new TypeError('Color token must contain components')
  }

  return {
    alpha: typeof value.alpha === 'number' ? value.alpha : undefined,
    components: value.components.map((component) => Number(component)),
    hex: typeof value.hex === 'string' ? value.hex : undefined
  }
}

function asDimension(value: unknown): DimensionValue {
  if (
    !isRecord(value) ||
    (typeof value.value !== 'number' && typeof value.value !== 'string') ||
    typeof value.unit !== 'string'
  ) {
    throw new TypeError('Dimension token must contain value and unit')
  }

  return { unit: value.unit, value: value.value }
}

function asGradient(value: unknown): GradientStop[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Gradient token must contain an array of stops')
  }

  return value.map((stop) => {
    if (!isRecord(stop) || typeof stop.position !== 'number') {
      throw new TypeError('Gradient stop must contain color and position')
    }
    return { color: asColor(stop.color), position: stop.position }
  })
}

export async function buildTokens(): Promise<void> {
  const documents = await Promise.all(
    sourceFiles.map(async (fileName) => {
      const contents = await readFile(
        resolve(foundationDirectory, fileName),
        'utf8'
      )
      const document: unknown = JSON.parse(contents)
      if (!isRecord(document)) {
        throw new TypeError(`Token document must be an object: ${fileName}`)
      }
      return document
    })
  )

  const tokens: JsonRecord = Object.assign({}, ...documents)
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

function flattenTokens(
  node: JsonRecord,
  path: string[] = [],
  inheritedType?: string
): FlattenedToken[] {
  const nodeType = typeof node.$type === 'string' ? node.$type : inheritedType
  const entries: FlattenedToken[] = []

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) {
      continue
    }

    if (!isRecord(value)) {
      throw new TypeError(`Invalid token group at ${[...path, key].join('.')}`)
    }

    if ('$value' in value) {
      const tokenType = typeof value.$type === 'string' ? value.$type : nodeType
      if (!tokenType) {
        throw new TypeError(`Missing $type for ${[...path, key].join('.')}`)
      }
      entries.push({
        path: [...path, key],
        token: value as TokenNode & { $value: unknown },
        type: tokenType
      })
      continue
    }

    entries.push(...flattenTokens(value, [...path, key], nodeType))
  }

  return entries
}

function resolveValue(
  value: unknown,
  document: JsonRecord,
  stack: string[]
): unknown {
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

    const token = reference.split('.').reduce<unknown>((current, segment) => {
      return isRecord(current) ? current[segment] : undefined
    }, document)
    if (!isRecord(token) || !('$value' in token)) {
      throw new TypeError(`Unknown token reference: ${reference}`)
    }

    return resolveValue(token.$value, document, [...stack, reference])
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, document, stack))
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveValue(item, document, stack)
      ])
    )
  }

  return value
}

function serializeValue(
  value: unknown,
  type: string,
  token: TokenNode
): string {
  switch (type) {
    case 'color':
      return serializeColor(asColor(value))
    case 'dimension': {
      const dimension = asDimension(value)
      return `${String(dimension.value)}${dimension.unit}`
    }
    case 'fontFamily':
      if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        throw new TypeError('fontFamily token must be an array of strings')
      }
      return value.map(serializeFontFamily).join(', ')
    case 'fontWeight':
    case 'number':
      return String(value)
    case 'gradient':
      return serializeGradient(asGradient(value), token)
    default:
      if (typeof value === 'string') {
        return value
      }
      throw new TypeError(`Unsupported token type: ${type}`)
  }
}

function serializeColor(value: ColorValue): string {
  if (value.hex && (value.alpha === undefined || value.alpha === 1)) {
    return value.hex
  }

  const [red, green, blue] = value.components.map((component) =>
    Math.round(component * 255)
  )
  if (red === undefined || green === undefined || blue === undefined) {
    throw new TypeError('Color token must contain three components')
  }
  return `rgb(${red} ${green} ${blue} / ${value.alpha ?? 1})`
}

function serializeFontFamily(value: string): string {
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

function serializeGradient(value: GradientStop[], token: TokenNode): string {
  const cssExtension = token.$extensions?.['health.amarelo.css']
  const cssFunction = cssExtension?.function
  const preamble = cssExtension?.preamble
  if (typeof cssFunction !== 'string' || typeof preamble !== 'string') {
    throw new TypeError(
      'Gradient tokens require health.amarelo.css serialization metadata'
    )
  }

  const stops = value.map(
    (stop) => `${serializeColor(stop.color)} ${formatPercentage(stop.position)}`
  )
  return `${cssFunction}(${preamble}, ${stops.join(', ')})`
}

function formatPercentage(position: number): string {
  return `${String(Number((position * 100).toFixed(4)))}%`
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isDirectExecution) {
  await buildTokens()
}
