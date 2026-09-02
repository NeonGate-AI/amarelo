import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

async function exists(path) {
  return Boolean(await stat(path).catch(() => null))
}

async function runMemoryInvariantCheck({ projectRoot = process.cwd() } = {}) {
  const base = join(projectRoot, 'workspaces/memory-nucleus')
  const src = join(base, 'src')
  const errors = []
  const need = async (path) => {
    if (!(await exists(join(src, path)))) errors.push(`missing src/${path}`)
  }

  for (const path of [
    'domain',
    'application/use-cases',
    'application/ports',
    'application/validation',
    'infrastructure/adapters',
    'infrastructure/database/schema.sql',
    'assurance/evals',
    'domain/value-objects/memory-judgment.vo.ts',
    'domain/services/memory-economics.compute.ts'
  ]) await need(path)

  for (const path of ['apps', 'packages', 'scripts', 'docs', 'db/migrations']) {
    if (await exists(join(base, path))) errors.push(`production/nested path must not exist: ${path}`)
  }
  for (const stale of [
    'application/services/memory-query.validator.ts',
    'application/services/memory-record.validator.ts'
  ]) {
    if (await exists(join(src, stale))) errors.push(`legacy validation module remains: ${stale}`)
  }

  const pkg = JSON.parse(await readFile(join(base, 'package.json'), 'utf8'))
  if (pkg.name !== '@nucleus/memory') errors.push('Memory Nucleus package must be @nucleus/memory')
  if (pkg.dependencies?.['@langchain/langgraph']) errors.push('LangGraph is not required by the MVP core')

  const sql = await readFile(join(src, 'infrastructure/database/schema.sql'), 'utf8').catch(() => '')
  for (const marker of [
    'memory_evidence','memory_candidates','memories','memory_versions','memory_search_projections','tsvector','memory_consent_ledger'
  ]) if (!sql.includes(marker)) errors.push(`schema missing ${marker}`)
  for (const marker of ['memory_outbox','fencing_token','dead_letter','export_artifact','suppression_hmac']) {
    if (sql.includes(marker)) errors.push(`production-only schema concept remains: ${marker}`)
  }

  const retrievalUseCase = await readFile(join(src, 'application/use-cases/retrieve-memory.use-case.ts'), 'utf8').catch(() => '')
  const repositorySearch = await readFile(join(src, 'application/services/memory-repository-search.service.ts'), 'utf8').catch(() => '')
  const queryValidation = await readFile(join(src, 'application/validation/memory-query.validate.ts'), 'utf8').catch(() => '')

  if (!repositorySearch.includes('vectorFallback: false')) errors.push('retrieval must keep vector fallback disabled in MVP baseline')
  if (!retrievalUseCase.includes('maxTokens') && !queryValidation.includes('maxTokens')) errors.push('retrieval must enforce token budgeting')

  if (errors.length) {
    console.error('Memory invariants FAIL')
    for (const error of errors) console.error(`- ${error}`)
    return 1
  }
  console.log('Memory invariants PASS')
  console.log('single workspace: PASS')
  console.log('clean layers: PASS')
  console.log('validation ownership: PASS')
  console.log('MVP database baseline: PASS')
  console.log('retrieval/token budget: PASS')
  return 0
}

process.exitCode = await runMemoryInvariantCheck()
