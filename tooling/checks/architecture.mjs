import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const failures = []
const textExtensions = new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.yaml','.yml','.md','.toml'])
const sourceExtensions = new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs'])

const fail = (rule, file, detail, fix) => failures.push({ rule, file, detail, fix })

async function walk(dir) {
  const out=[]
  for (const name of await readdir(dir).catch(()=>[])) {
    if (['node_modules','dist','.next','.turbo','coverage','.git'].includes(name)) continue
    const p=join(dir,name); const s=await stat(p)
    if (s.isDirectory()) out.push(...await walk(p)); else out.push(p)
  }
  return out
}
const files=await walk(root)
const rel=(p)=>relative(root,p).split(sep).join('/')
const packageFiles=files.filter(p=>p.endsWith('/package.json') || rel(p)==='package.json')
const workspaces=[]
for (const p of packageFiles) {
  const r=rel(p)
  if (!r.startsWith('workspaces/')) continue
  const manifest=JSON.parse(await readFile(p,'utf8'))
  workspaces.push({ root:r.slice(0,-'/package.json'.length), name:manifest.name, manifest })
}

// canonical topology and namespaces
for (const ws of workspaces) {
  if (ws.root.startsWith('workspaces/ai/')) {
    if (!ws.name?.startsWith('@ai/')) fail('package-namespace',ws.root,`${ws.name} must use @ai/*`,'rename the package to @ai/<capability>')
  } else if (ws.root==='workspaces/memory-nucleus') {
    if (ws.name!=='@nucleus/memory') fail('package-namespace',ws.root,`${ws.name} must be @nucleus/memory`,'use the canonical Memory Nucleus package name')
  } else if (ws.root.startsWith('workspaces/packages/')) {
    if (!ws.name?.startsWith('@repo/')) fail('package-namespace',ws.root,`${ws.name} must use @repo/*`,'rename the shared package to @repo/<name>')
  } else if (ws.root.startsWith('workspaces/apps/')) {
    if (ws.name?.startsWith('@')) fail('app-package-name',ws.root,`${ws.name} must use the app name, not a shared namespace`,'use the repository/app name directly')
  }
}
if (workspaces.some(w=>w.root.includes('/domains/'))) fail('ai-topology','workspaces/ai','domains/ remains in workspace topology','place Conversation/Knowledge directly below workspaces/ai')
for (const forbidden of ['workspaces/memory-nucleus/apps','workspaces/memory-nucleus/packages']) {
  if (files.some(p=>rel(p).startsWith(forbidden+'/'))) fail('nested-monorepo',forbidden,'Memory Nucleus contains a nested apps/packages aggregate','keep Memory Nucleus as one Clean Architecture workspace')
}

// A workspace is a bounded area, not another monorepo. The repository-level
// workspaces/apps and workspaces/packages aggregators are the only exceptions.
for (const ws of workspaces) {
  if (ws.root.startsWith('workspaces/apps/') || ws.root.startsWith('workspaces/packages/')) continue
  for (const nested of ['apps','packages']) {
    const prefix=`${ws.root}/${nested}/`
    if (files.some(p=>rel(p).startsWith(prefix))) {
      fail('nested-monorepo',`${ws.root}/${nested}`,`${ws.name} contains a nested ${nested}/ aggregate`,'keep capabilities/layers directly inside the owning workspace')
    }
  }
}

// .agents canonical first-class taxonomy
const agentRootEntries=(await readdir(join(root,'.agents'),{withFileTypes:true}).catch(()=>[])).map(e=>e.name).sort()
const expectedAgentDirs=['adrs','context','rules','specs']
for (const entry of agentRootEntries) if (!expectedAgentDirs.includes(entry)) fail('agents-taxonomy','.agents/'+entry,'unexpected first-class harness category','move durable knowledge into context/rules/specs/adrs or delete temporary material')
for (const e of expectedAgentDirs) if (!agentRootEntries.includes(e)) fail('agents-taxonomy','.agents',`missing ${e}/`,'create the canonical harness category')

// Markdown lifecycle/naming + local agent files
for (const p of files.filter(p=>p.endsWith('.md'))) {
  const r=rel(p), base=r.split('/').at(-1)
  if (base!==base.toLowerCase()) fail('markdown-lowercase',r,'Markdown filename is not lowercase','rename the Markdown file to lowercase')
  if (/(^|\/)agents\.md$/i.test(r) && r!=='agents.md' && !r.startsWith('.agents/context/')) fail('central-agents',r,'local agents.md duplicates the centralized harness','move durable context into .agents and delete the local file')
  if (/checkpoint|completion_report|handoff/i.test(base)) fail('temporary-markdown',r,'temporary cycle artifact remains in source','migrate durable knowledge then delete the completed artifact')
}

const oldNames=['@repo/memory-engine','@repo/memory-service','@repo/memory-worker','@repo/ranking-evaluation','@repo/ai-conversation','@repo/ai-knowledge']
const importPattern=/(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g
for (const p of files) {
  const r=rel(p)
  const ext='.'+r.split('.').at(-1)
  if (!textExtensions.has(ext)) continue
  const text=await readFile(p,'utf8').catch(()=>null); if (text===null) continue
  const historical=r.startsWith('.agents/adrs/') || r.startsWith('tooling/checks/')
  if (!historical && text.includes('elos/')) fail('obsolete-path',r,'live reference to elos/','use workspaces/')
  if (!historical) for (const old of oldNames) if (text.includes(old)) fail('obsolete-package',r,`live reference to ${old}`,'use the current package namespace')
  if (!sourceExtensions.has(ext)) continue
  for (const match of text.matchAll(importPattern)) {
    const spec=match[1]
    if (/^(\.\.\/){2,}/.test(spec)) fail('deep-relative-import',r,spec,'use a runtime-resolvable package import alias or declared workspace package')
    if (r.startsWith('workspaces/memory-nucleus/domain/') && (spec.startsWith('#application/')||spec.startsWith('#infrastructure/'))) fail('clean-domain-direction',r,spec,'Domain may depend only on Domain/external pure libraries')
    if (r.startsWith('workspaces/memory-nucleus/application/') && spec.startsWith('#infrastructure/')) fail('clean-application-direction',r,spec,'define a port in Application and implement it in Infrastructure')
    if (r.startsWith('workspaces/ai/') && spec==='@nucleus/memory') fail('memory-sdk-boundary',r,spec,'AI must consume Memory Nucleus through @repo/memory-sdk')
    if (r.startsWith('workspaces/ai/knowledge/') && spec==='@repo/memory-sdk') fail('memory-knowledge-isolation',r,spec,'Knowledge must remain independent from Personal Memory')
  }
}

// Relative tsconfig inheritance must continue resolving after workspace moves.
for (const p of files.filter(p=>p.endsWith('/tsconfig.json'))) {
  const r=rel(p)
  let config
  try { config=JSON.parse(await readFile(p,'utf8')) } catch { continue }
  if (typeof config.extends!=='string' || !config.extends.startsWith('.')) continue
  const target=resolve(dirname(p),config.extends)
  const candidates=[target,target.endsWith('.json')?target:`${target}.json`]
  const exists=(await Promise.all(candidates.map(c=>stat(c).catch(()=>null)))).some(Boolean)
  if (!exists) fail('tsconfig-extends',r,`extends target does not exist: ${config.extends}`,'update the relative tsconfig path after moving the workspace')
}

// Import-map targets must exist for Nucleus aliases.
const nucleus=workspaces.find(w=>w.root==='workspaces/memory-nucleus')
for (const [key,target] of Object.entries(nucleus?.manifest.imports??{})) {
  if (!key.endsWith('/*') || !target.includes('*')) continue
  const base=target.slice(0,target.indexOf('*')).replace(/^\.\//,'')
  if (!(await stat(join(root,'workspaces/memory-nucleus',base)).catch(()=>null))) fail('import-map','workspaces/memory-nucleus/package.json',`${key} -> ${target} base does not exist`,'fix the runtime import-map target')
}

if (failures.length) {
  console.error(`Architecture FAIL (${failures.length} finding${failures.length===1?'':'s'})`)
  for (const f of failures) console.error(`\n[${f.rule}] ${f.file}\n  ${f.detail}\n  fix: ${f.fix}`)
  process.exit(1)
}
console.log('Architecture PASS')
console.log(`workspaces: ${workspaces.length}`)
console.log(`source files: ${files.filter(p=>sourceExtensions.has('.'+rel(p).split('.').at(-1))).length}`)
console.log('topology: PASS')
console.log('dependency direction: PASS')
console.log('imports: PASS')
console.log('knowledge isolation: PASS')
console.log('SDK boundary: PASS')
console.log('harness taxonomy: PASS')
