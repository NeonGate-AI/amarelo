import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
const root=process.cwd(); const base=join(root,'workspaces/memory-nucleus'); const errors=[]
const need=async p=>{if(!(await stat(join(base,p)).catch(()=>null))) errors.push(`missing ${p}`)}
for (const p of ['domain','application/use-cases','application/ports','infrastructure/adapters','infrastructure/database/schema.sql','evals','domain/judgment/memory-judgment.ts','domain/value-objects/memory-economics.value-object.ts']) await need(p)
for (const p of ['apps','packages','scripts','docs','db/migrations']) if(await stat(join(base,p)).catch(()=>null)) errors.push(`production/nested path must not exist: ${p}`)
const pkg=JSON.parse(await readFile(join(base,'package.json'),'utf8'))
if(pkg.name!=='@nucleus/memory') errors.push('Memory Nucleus package must be @nucleus/memory')
if(pkg.dependencies?.['@langchain/langgraph']) errors.push('LangGraph is not required by the MVP core')
const sql=await readFile(join(base,'infrastructure/database/schema.sql'),'utf8')
for(const marker of ['memory_evidence','memory_candidates','memories','memory_versions','memory_search_projections','tsvector','memory_consent_ledger']) if(!sql.includes(marker)) errors.push(`schema missing ${marker}`)
for(const marker of ['memory_outbox','fencing_token','dead_letter','export_artifact','suppression_hmac']) if(sql.includes(marker)) errors.push(`production-only schema concept remains: ${marker}`)
const retrievalUseCase=await readFile(join(base,'application/use-cases/retrieve-memory.use-case.ts'),'utf8')
const repositorySearch=await readFile(join(base,'application/services/memory-repository-search.service.ts'),'utf8')
const queryValidation=await readFile(join(base,'application/services/memory-query.validator.ts'),'utf8')
if(!repositorySearch.includes('vectorFallback: false')) errors.push('retrieval must keep vector fallback disabled in MVP baseline')
if(!retrievalUseCase.includes('maxTokens') && !queryValidation.includes('maxTokens')) errors.push('retrieval must enforce token budgeting')
if(errors.length){console.error('Memory invariants FAIL'); for(const e of errors) console.error('- '+e); process.exit(1)}
console.log('Memory invariants PASS')
console.log('single workspace: PASS')
console.log('clean layers: PASS')
console.log('MVP database baseline: PASS')
console.log('retrieval/token budget: PASS')
