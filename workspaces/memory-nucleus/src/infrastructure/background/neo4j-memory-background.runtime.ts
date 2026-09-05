import { randomUUID } from 'node:crypto'
import neo4j, { type Driver, type ManagedTransaction } from 'neo4j-driver'
import { z } from 'zod'
import { prepareEligibleMemorySource } from '@application/clients'
import {
  MemoryBackgroundEngine, MemoryBackgroundJobSchema,
  type MemoryBackgroundExecution, type MemoryBackgroundIngestResult,
  type MemoryBackgroundJob, type MemoryBackgroundProcessResult,
  type MemoryBackgroundProfile, type MemoryBackgroundStore
} from '@application/background'
import {
  MemoryCurationRequestSchema, MemoryUsageLedgerEntrySchema,
  type EligibleMemorySource, type MemoryCurationResult, type MemoryFormationSignal,
  type MemoryRequestScope, type MemoryUsageEvent, type MemoryUsageLedgerEntry,
  type TrustedMemorySource
} from '@application/contracts'
import {
  MemoryModelUsageSchema, SaveCurationRunRequestSchema, SourceClaimRequestSchema,
  type MemoryExtractor, type MemoryModelUsage, type SaveCurationRunRequest,
  type SourceClaimRequest
} from '@application/ports'
import { createTextMemoryUsageEvent, createUnknownCostMemoryUsageLedgerEntry } from '@application/services'
import { DEFAULT_MEMORY_CURATION_POLICY, prepareMemoryCuration } from '@application/use-cases'
import { assertNeo4jMemoryScope, neo4jMemoryFingerprint, neo4jMemoryScopeKey } from '@infrastructure/adapters/persistence/neo4j'
import { initializeNeo4jMemorySchema, isNeo4jMemoryTransactionSchemaReady } from '@infrastructure/database/neo4j'
import { LangGraphMemoryBackgroundAdapter } from '@infrastructure/orchestration'
import { activateBackgroundCandidates } from './neo4j-background-activation.service'

export interface Neo4jMemoryBackgroundOptions {
  readonly uri: string
  readonly username: string
  readonly password: string
  readonly database: string
  readonly extractor?: MemoryExtractor
  readonly now?: () => Date
  readonly claimMilliseconds?: number
  readonly maxAttempts?: number
  readonly priceUsage?: (event: MemoryUsageEvent, ledgerEntryId: string) => MemoryUsageLedgerEntry
}

const constraints = [
  ['memory_background_batch_identity_v1', 'MemoryBackgroundBatch', 'identityKey'],
  ['memory_background_batch_id_v1', 'MemoryBackgroundBatch', 'batchId'],
  ['memory_background_run_key_v1', 'MemoryBackgroundRun', 'idempotencyKey'],
  ['memory_background_attempt_id_v1', 'MemoryBackgroundAttempt', 'attemptId'],
  ['memory_background_candidate_id_v1', 'MemoryBackgroundCandidate', 'candidateId'],
  ['memory_background_delta_identity_v1', 'MemoryBackgroundDelta', 'identityKey']
] as const
const result = (status: MemoryBackgroundProcessResult['status'], reason: string | null = null): MemoryBackgroundProcessResult => ({ status, reason, modelCalls: 0, candidateCount: 0, accepted: 0 })
const normalizer = { normalize: (text: string) => text.normalize('NFKC').replace(/\s+/gu, ' ').trim() }
class BackgroundAuthorityError extends Error {}

interface ExecutionBinding {
  readonly job: MemoryBackgroundJob
  readonly scope: MemoryRequestScope
  readonly consentVersion: number
  readonly claimId: string
  readonly fence: number
  readonly leaseUntil: string
  readonly evidenceId: string
  readonly profile: MemoryBackgroundProfile
  readonly attempt: number
}

class Neo4jBackgroundStore implements MemoryBackgroundStore {
  constructor(private readonly driver: Driver, private readonly options: Neo4jMemoryBackgroundOptions, private readonly now: () => Date, private readonly leaseMs: number, private readonly maxAttempts: number) {}

  private async transaction<T>(work: (transaction: ManagedTransaction) => Promise<T>): Promise<T> {
    const session = this.driver.session({ database: this.options.database })
    try { return await session.executeWrite(work, { timeout: 15_000 }) }
    finally { await session.close() }
  }

  private async locked<T>(scope: MemoryRequestScope, expected: number | undefined, work: (transaction: ManagedTransaction, consentVersion: number) => Promise<T>): Promise<T> {
    const assertRequest = () => {
      try { assertNeo4jMemoryScope(scope, this.now()) }
      catch { throw new BackgroundAuthorityError('Background Memory request has expired or is invalid') }
    }
    assertRequest()
    return this.transaction(async (transaction) => {
      if (!(await isNeo4jMemoryTransactionSchemaReady(transaction))) throw new Error('Memory schema is unavailable')
      const head = await transaction.run(
        `MATCH (h:MemoryConsentHead {scopeKey: $scopeKey})
         WHERE h.tenantId = $tenantId AND h.subjectId = $subjectId AND h.purpose = $purpose
         SET h.lockVersion = h.lockVersion + 1
         RETURN h.version AS version, h.status AS status`,
        { scopeKey: neo4jMemoryScopeKey(scope), tenantId: scope.tenantId, subjectId: scope.subjectId, purpose: scope.purpose }
      )
      const version = head.records[0]?.get('version')
      assertRequest()
      if (head.records.length !== 1 || head.records[0]?.get('status') !== 'granted' || (expected !== undefined && version !== expected))
        throw new BackgroundAuthorityError('Background Memory authority is unavailable')
      const value = await work(transaction, z.number().int().positive().parse(version))
      assertRequest()
      return value
    })
  }

  async ingest(scope: MemoryRequestScope, trusted: TrustedMemorySource, formationSignal: MemoryFormationSignal, profile: MemoryBackgroundProfile): Promise<MemoryBackgroundIngestResult> {
    assertNeo4jMemoryScope(scope, this.now())
    z.enum(['free', 'paid', 'internal']).parse(profile)
    z.enum(['none', 'eligible-source-delta', 'explicit-memory-request']).parse(formationSignal)
    if (profile === 'free' || formationSignal === 'none') return { status: 'skipped', reason: profile === 'free' ? 'free-background-disabled' : 'no-formation-signal' }
    const submittedSource = prepareEligibleMemorySource(trusted, scope, this.now())
    if (submittedSource === null) return { status: 'skipped', reason: 'no-subject-evidence' }
    const words = submittedSource.text.toLocaleLowerCase('pt-BR').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/u)
    if (words.every((word) => ['sim', 'não', 'nao', 'ok', 'certo', 'entendi', 'aham', 'uhum', 'talvez', 'yes', 'no', 'okay'].includes(word)))
      return { status: 'skipped', reason: 'ambiguous-subject-evidence' }
    const scopeKey = neo4jMemoryScopeKey(scope)
    return this.locked<MemoryBackgroundIngestResult>(scope, undefined, async (transaction, consentVersion) => {
    const buffered=await this.bufferSource(transaction,scope,submittedSource,profile,consentVersion)
    if ('job' in buffered) return {status:'duplicate',job:buffered.job}
    const source=buffered.source
    const turns = source.turns.map((turn) => ({
      ...turn,
      identityKey: neo4jMemoryFingerprint(['memory-subject-source-v1', scopeKey, scope.conversationId, turn.sourceTurnId, turn.sourceTurnVersion]),
      sourceFingerprint: neo4jMemoryFingerprint(['memory-subject-source-content-v1', scope.actorId, scope.subjectId, scope.sourceKind, turn.observedAt, turn.text])
    }))
    const batchId = randomUUID()
    const eventId = neo4jMemoryFingerprint(['memory-background-enqueued-v1', batchId])
    const job = MemoryBackgroundJobSchema.parse({ schemaVersion: 'memory-background-job-v1', eventId, batchId, tenantId: scope.tenantId, subjectId: scope.subjectId, requestId: scope.requestId })
    const request = this.request(scope, turns.map((turn) => ({ id: turn.identityKey, observedAt: turn.observedAt, text: turn.text })), formationSignal, batchId)
    const prepared = prepareMemoryCuration(request, DEFAULT_MEMORY_CURATION_POLICY, normalizer)
    if (!prepared.decision.eligible) return { status: 'buffered', reason: 'below-minimum-content' }
    const identityKey = neo4jMemoryFingerprint(['memory-background-batch-v1', scopeKey, turns.map((turn) => turn.identityKey)])
    const fingerprint = neo4jMemoryFingerprint(['memory-eligible-evidence-v1', source.text, turns.map((turn) => [turn.identityKey, turn.sourceFingerprint])])
      const previous = await transaction.run('MATCH (b:MemoryBackgroundBatch {identityKey: $identityKey}) RETURN b.fingerprint AS fingerprint, b.jobJson AS jobJson', { identityKey })
      if (previous.records.length > 0) {
        if (previous.records[0]?.get('fingerprint') !== fingerprint) throw new Error('Background source identity collision')
        return { status: 'duplicate', job: MemoryBackgroundJobSchema.parse(JSON.parse(previous.records[0]?.get('jobJson'))) }
      }
      const registered = await transaction.run(
        `UNWIND $turns AS turn
         MERGE (s:MemorySourceTurn {identityKey: turn.identityKey})
         ON CREATE SET s.scopeKey=$scopeKey, s.tenantId=$tenantId, s.subjectId=$subjectId,
           s.actorId=$actorId, s.purpose=$purpose, s.sourceKind=$sourceKind, s.conversationId=$conversationId,
           s.sourceTurnId=turn.sourceTurnId, s.sourceTurnVersion=turn.sourceTurnVersion,
           s.observedAt=turn.observedAt, s.sourceFingerprint=turn.sourceFingerprint
         WITH s, turn WHERE s.scopeKey=$scopeKey AND s.sourceFingerprint=turn.sourceFingerprint
         RETURN s.identityKey AS identityKey`,
        { ...scope, scopeKey, turns }
      )
      if (registered.records.length !== turns.length) throw new Error('Background source version has conflicting evidence')
      const evidenceId = randomUUID()
      const at = this.now().toISOString()
      const observedAt = source.turns.reduce((latest, turn) => Date.parse(turn.observedAt) > Date.parse(latest) ? turn.observedAt : latest, source.turns[0]?.observedAt ?? at)
      await transaction.run(
        `CREATE (e:MemoryEvidence {evidenceId:$evidenceId,scopeKey:$scopeKey,tenantId:$tenantId,subjectId:$subjectId,
           actorId:$actorId,purpose:$purpose,sourceKind:$sourceKind,sourceType:'patient-text',eligible:true,
           conversationId:$conversationId,text:$text,turnsJson:$turnsJson,sourceTurnIds:$sourceTurnIds,
           sourceTurnVersions:$sourceTurnVersions,contentHash:$fingerprint,observedAt:$observedAt})
         CREATE (b:MemoryBackgroundBatch {batchId:$batchId,identityKey:$identityKey,scopeKey:$scopeKey,
           tenantId:$tenantId,subjectId:$subjectId,requestId:$requestId,evidenceId:$evidenceId,
           fingerprint:$fingerprint,scopeJson:$scopeJson,jobJson:$jobJson,formationSignal:$formationSignal,
           profile:$profile,consentVersion:$consentVersion,status:'queued',createdAt:$at,fence:0,attempts:0})
         CREATE (b)-[:SUPPORTED_BY]->(e)
         CREATE (o:OutboxEvent {eventId:$eventId,batchId:$batchId,tenantId:$tenantId,subjectId:$subjectId,
           scopeKey:$scopeKey,requestId:$requestId,eventType:'memory.background-enqueued.v1',
           schemaVersion:'memory-background-job-v1',jobJson:$jobJson,status:'pending',createdAt:$at,attempts:0})
         CREATE (b)-[:EMITS]->(o)
         WITH e UNWIND $turns AS turn MATCH (s:MemorySourceTurn {identityKey:turn.identityKey})
         CREATE (e)-[:HAS_SOURCE_TURN]->(s)`,
        { ...scope, scopeKey, evidenceId, batchId, eventId, identityKey, fingerprint, observedAt, text:source.text,
          turns, turnsJson:JSON.stringify(request.turns),sourceTurnIds:turns.map((turn) => turn.identityKey),
          sourceTurnVersions:turns.map((turn) => turn.sourceTurnVersion),scopeJson:JSON.stringify(scope),
          jobJson:JSON.stringify(job),formationSignal,profile,consentVersion,at }
      )
      await transaction.run(
        `MATCH (d:MemoryBackgroundDelta {scopeKey:$scopeKey,consentVersion:$consentVersion,status:'pending'})
         WHERE d.identityKey IN $keys SET d.status='consumed',d.batchId=$batchId,d.jobJson=$jobJson`,
        {scopeKey,consentVersion,keys:buffered.keys,batchId,jobJson:JSON.stringify(job)})
      return { status: 'queued', job }
    })
  }

  private async bufferSource(transaction:ManagedTransaction,scope:MemoryRequestScope,source:EligibleMemorySource,profile:MemoryBackgroundProfile,consentVersion:number):Promise<{source:EligibleMemorySource;keys:string[]}|{job:MemoryBackgroundJob}> {
    const scopeKey=neo4jMemoryScopeKey(scope)
    let duplicateJob:MemoryBackgroundJob|undefined
    let pendingSubmission=false
    for (const turn of source.turns) {
      const identityKey=neo4jMemoryFingerprint(['memory-subject-source-v1',scopeKey,scope.conversationId,turn.sourceTurnId,turn.sourceTurnVersion])
      const fingerprint=neo4jMemoryFingerprint(['memory-subject-source-content-v1',scope.actorId,scope.subjectId,scope.sourceKind,turn.observedAt,turn.text])
      const registered=await transaction.run(
        `MERGE (s:MemorySourceTurn {identityKey:$identityKey})
         ON CREATE SET s.scopeKey=$scopeKey,s.tenantId=$tenantId,s.subjectId=$subjectId,s.actorId=$actorId,
           s.purpose=$purpose,s.conversationId=$conversationId,s.sourceKind=$sourceKind,s.sourceTurnId=$sourceTurnId,
           s.sourceTurnVersion=$sourceTurnVersion,s.observedAt=$observedAt,s.sourceFingerprint=$fingerprint
         RETURN s.scopeKey AS scopeKey,s.sourceFingerprint AS fingerprint`,
        {...scope,scopeKey,identityKey,fingerprint,sourceTurnId:turn.sourceTurnId,sourceTurnVersion:turn.sourceTurnVersion,observedAt:turn.observedAt})
      if (registered.records[0]?.get('scopeKey')!==scopeKey || registered.records[0]?.get('fingerprint')!==fingerprint)
        throw new Error('Buffered source conflicts with its immutable turn version')
      const newer=await transaction.run(
        `MATCH (d:MemoryBackgroundDelta {scopeKey:$scopeKey,conversationId:$conversationId,sourceTurnId:$sourceTurnId})
         WHERE d.sourceTurnVersion>$version RETURN d.identityKey AS identityKey LIMIT 1`,
        {scopeKey,conversationId:scope.conversationId,sourceTurnId:turn.sourceTurnId,version:turn.sourceTurnVersion})
      if (newer.records.length>0) throw new Error('Buffered source version is stale')
      await transaction.run(
        `MATCH (d:MemoryBackgroundDelta {scopeKey:$scopeKey,conversationId:$conversationId,sourceTurnId:$sourceTurnId,status:'pending'})
         WHERE d.sourceTurnVersion<$version SET d.status='superseded'`,
        {scopeKey,conversationId:scope.conversationId,sourceTurnId:turn.sourceTurnId,version:turn.sourceTurnVersion})
      const rows=await transaction.run(
        `MERGE (d:MemoryBackgroundDelta {identityKey:$identityKey})
         ON CREATE SET d:MemoryEvidence,d.evidenceId=$evidenceId,d.scopeKey=$scopeKey,d.tenantId=$tenantId,d.subjectId=$subjectId,
           d.actorId=$actorId,d.purpose=$purpose,d.conversationId=$conversationId,d.consentVersion=$consentVersion,
           d.profile=$profile,d.sourceKind=$sourceKind,d.sourceType='patient-fragment',d.sourceTurnId=$sourceTurnId,
           d.sourceTurnVersion=$sourceTurnVersion,d.observedAt=$observedAt,d.eligible=true,
           d.fingerprint=$fingerprint,d.contentHash=$fingerprint,d.turnJson=$turnJson,d.text=$text,d.status='pending',d.createdAt=$at
         RETURN d.fingerprint AS fingerprint,d.consentVersion AS consentVersion,d.status AS status,d.jobJson AS jobJson`,
        {...scope,scopeKey,identityKey,evidenceId:randomUUID(),consentVersion,profile,fingerprint,sourceTurnId:turn.sourceTurnId,
          sourceTurnVersion:turn.sourceTurnVersion,observedAt:turn.observedAt,text:turn.text,turnJson:JSON.stringify(turn),at:this.now().toISOString()})
      const delta=rows.records[0]
      if (delta?.get('fingerprint')!==fingerprint || delta.get('consentVersion')!==consentVersion) throw new Error('Buffered source version identity mismatch')
      if (delta.get('status')==='consumed') duplicateJob=MemoryBackgroundJobSchema.parse(JSON.parse(delta.get('jobJson')))
      else pendingSubmission=true
      await transaction.run(
        `MERGE (o:OutboxEvent {eventId:$eventId})
         ON CREATE SET o.scopeKey=$scopeKey,o.tenantId=$tenantId,o.subjectId=$subjectId,o.requestId=$requestId,
           o.sourceIdentityKey=$identityKey,o.eventType='memory.background-source-buffered.v1',
           o.schemaVersion='memory-outbox-v1',o.status='pending',o.createdAt=$at,o.attempts=0`,
        {...scope,scopeKey,identityKey,eventId:neo4jMemoryFingerprint(['memory-background-buffered-v1',identityKey]),at:this.now().toISOString()})
    }
    if (!pendingSubmission && duplicateJob!==undefined) return {job:duplicateJob}
    const pending=await transaction.run(
      `MATCH (d:MemoryBackgroundDelta {scopeKey:$scopeKey,conversationId:$conversationId,consentVersion:$consentVersion,
         sourceKind:$sourceKind,profile:$profile,status:'pending'})
       RETURN d.identityKey AS identityKey,d.turnJson AS turnJson ORDER BY d.observedAt DESC,d.identityKey LIMIT 100`,
      {scopeKey,conversationId:scope.conversationId,consentVersion,sourceKind:scope.sourceKind,profile})
    const selected:TrustedMemorySource['events'][number][]=[]
    const keys:string[]=[]
    let characters=0
    for (const row of pending.records) {
      const turn=JSON.parse(row.get('turnJson')) as EligibleMemorySource['turns'][number]
      if (selected.length>=20 || characters+turn.text.length+(selected.length>0?1:0)>4_000) continue
      selected.unshift(turn)
      keys.unshift(row.get('identityKey'))
      characters+=turn.text.length+(selected.length>1?1:0)
    }
    const combined=prepareEligibleMemorySource({events:selected},scope,this.now())
    if (combined===null) throw new Error('Buffered source is unavailable')
    return {source:combined,keys}
  }

  private request(scope: MemoryRequestScope, turns: readonly {id:string;observedAt:string;text:string}[], formationSignal: MemoryFormationSignal, decisionId: string) {
    return MemoryCurationRequestSchema.parse({ actorId:scope.actorId,subjectId:scope.subjectId,tenantId:scope.tenantId,
      conversationId:scope.conversationId,requestId:scope.requestId,purpose:scope.purpose,authorization:{decisionId},formationSignal,
      turns:turns.map((turn) => ({...turn,speaker:'person'})) })
  }

  async pending(limit: number): Promise<readonly MemoryBackgroundJob[]> {
    z.number().int().min(1).max(500).parse(limit)
    const rows = await this.driver.executeQuery(
      `MATCH (o:OutboxEvent {eventType:'memory.background-enqueued.v1',status:'pending'})
       RETURN o.jobJson AS jobJson ORDER BY o.createdAt LIMIT $limit`, {limit:neo4j.int(limit)}, {database:this.options.database})
    return rows.records.map((row) => MemoryBackgroundJobSchema.parse(JSON.parse(row.get('jobJson'))))
  }

  async markPublished(eventId: string): Promise<void> {
    z.string().regex(/^[a-f0-9]{64}$/).parse(eventId)
    await this.driver.executeQuery(
      `MATCH (o:OutboxEvent {eventId:$eventId,eventType:'memory.background-enqueued.v1'})
       WHERE o.status='pending' SET o.status='published',o.publishedAt=$at`,
      {eventId,at:this.now().toISOString()}, {database:this.options.database})
  }

  private async assertFence(transaction: ManagedTransaction, binding: ExecutionBinding): Promise<void> {
    const found = await transaction.run(
      `MATCH (b:MemoryBackgroundBatch {batchId:$batchId,claimId:$claimId,fence:$fence})
       WHERE b.tenantId=$tenantId AND b.subjectId=$subjectId AND b.status='processing'
         AND datetime(b.leaseUntil)>datetime($now) RETURN b.batchId AS batchId`,
      {...binding.job,claimId:binding.claimId,fence:binding.fence,now:this.now().toISOString()})
    if (found.records.length !== 1) throw new Error('Background worker claim is unavailable')
  }

  async open(job: MemoryBackgroundJob, attempt: number) {
    const metadata = await this.driver.executeQuery(
      `MATCH (b:MemoryBackgroundBatch {batchId:$batchId,tenantId:$tenantId,subjectId:$subjectId,requestId:$requestId})
       WHERE b.jobJson=$jobJson RETURN b.scopeJson AS scopeJson,b.status AS status,b.consentVersion AS consentVersion`,
      {...job,jobJson:JSON.stringify(job)}, {database:this.options.database})
    const row = metadata.records[0]
    if (!row) return result('skipped','missing-batch')
    if (row.get('status') === 'completed') return result('duplicate')
    if (['skipped','quarantined'].includes(row.get('status'))) return result('skipped','terminal-batch')
    const scope = JSON.parse(row.get('scopeJson')) as MemoryRequestScope
    const consentVersion = z.number().int().positive().parse(row.get('consentVersion'))
    let opened: {binding:ExecutionBinding;request:ReturnType<Neo4jBackgroundStore['request']>} | MemoryBackgroundProcessResult
    try {
      opened = await this.locked(scope,consentVersion,async (transaction) => {
        const claim = await transaction.run(
          `MATCH (b:MemoryBackgroundBatch {batchId:$batchId})-[:SUPPORTED_BY]->(e:MemoryEvidence)
           WHERE b.status IN ['queued','retry','processing']
             AND (b.leaseUntil IS NULL OR datetime(b.leaseUntil)<=datetime($now))
             AND e.eligible=true AND e.actorId=$actorId AND e.subjectId=$subjectId AND e.tenantId=$tenantId
             AND e.contentHash=b.fingerprint
           SET b.fence=b.fence+1,b.claimId=$claimId,b.leaseUntil=$leaseUntil,b.status='processing',b.attempts=b.attempts+1
           RETURN b.fence AS fence,b.evidenceId AS evidenceId,b.profile AS profile,b.formationSignal AS formationSignal,
             b.attempts AS attempts,e.turnsJson AS turnsJson`,
          {...job,actorId:scope.actorId,now:this.now().toISOString(),claimId:randomUUID(),leaseUntil:new Date(Math.min(scope.expiresAtMs,this.now().getTime()+this.leaseMs)).toISOString()})
        const claimed=claim.records[0]
        if (!claimed) return result('deferred','source-in-progress')
        if (attempt>this.maxAttempts || claimed.get('attempts')>this.maxAttempts) {
          await transaction.run("MATCH (b:MemoryBackgroundBatch {batchId:$batchId}) SET b.status='quarantined',b.reason='attempts-exhausted'",job)
          return result('quarantined','attempts-exhausted')
        }
        const current=await transaction.run('MATCH (b:MemoryBackgroundBatch {batchId:$batchId}) RETURN b.claimId AS claimId,b.leaseUntil AS leaseUntil',job)
        const binding:ExecutionBinding={job,scope,consentVersion,claimId:current.records[0]?.get('claimId'),leaseUntil:current.records[0]?.get('leaseUntil'),
          fence:claimed.get('fence'),evidenceId:claimed.get('evidenceId'),profile:claimed.get('profile'),attempt}
        return {binding,request:this.request(scope,JSON.parse(claimed.get('turnsJson')),claimed.get('formationSignal'),binding.claimId)}
      })
    } catch (error) {
      if (!(error instanceof BackgroundAuthorityError)) throw error
      await this.terminal(job,'authority-unavailable')
      return result('skipped','authority-unavailable')
    }
    if ('status' in opened) return opened
    const binding=opened.binding
    let accepted=0
    let recorded=false
    const execution:MemoryBackgroundExecution={
      request:opened.request,
      authorizationResolver:{resolve:async (id) => {
        if (id!==binding.claimId || binding.profile==='free') return null
        try { return await this.locked(scope,consentVersion,async (transaction) => {
          await this.assertFence(transaction,binding)
          return {id,actorId:scope.actorId,tenantId:scope.tenantId,subjectId:scope.subjectId,purpose:scope.purpose,
            status:'active' as const,permitsCandidateProposal:true,expiresAt:binding.leaseUntil}
        }) } catch (error) {if (error instanceof BackgroundAuthorityError) return null;throw error}
      }},
      persistence:{
        claimSource:(input)=>this.claimSource(binding,input),
        saveCurationRun:async (input)=> {
          const saved=await this.saveRun(binding,input)
          accepted=saved.accepted
          return saved.result
        }
      },
      beforeModel:async()=>{
        await this.locked(scope,consentVersion,(transaction)=>this.assertFence(transaction,binding))
        await this.recordAttempt(binding,null,false)
      },
      afterModel:async(usage)=>{
        if (recorded) return
        await this.recordAttempt(binding,usage,true)
        recorded=true
      },
      complete:async(curated)=>{
        await this.finish(binding,curated)
        return {status:curated.status==='persisted'?'completed':curated.status,reason:curated.reason,
          modelCalls:curated.usage.modelCalls,candidateCount:curated.usage.candidateCount,accepted}
      },
      fail:()=>this.release(binding)
    }
    return {status:'execute' as const,execution}
  }

  private async claimSource(binding:ExecutionBinding,raw:SourceClaimRequest) {
    const input=SourceClaimRequestSchema.parse(raw)
    return this.locked(binding.scope,binding.consentVersion,async(transaction)=>{
      await this.assertFence(transaction,binding)
      const fingerprint=neo4jMemoryFingerprint([input.tenantId,input.subjectId,input.purpose,input.sourceFingerprint,input.policyVersion,input.extractorVersion,input.providerId,input.modelId,input.promptVersion,input.schemaVersion])
      const run=await transaction.run(
        `MERGE (r:MemoryBackgroundRun {idempotencyKey:$idempotencyKey})
         ON CREATE SET r.binding=$fingerprint,r.runId=$runId,r.status='pending'
         RETURN r.binding AS binding,r.runId AS runId,r.status AS status,r.claimId AS claimId,r.leaseUntil AS leaseUntil`,
        {idempotencyKey:input.idempotencyKey,fingerprint,runId:randomUUID()})
      const previous=run.records[0]
      if (previous?.get('binding')!==fingerprint) throw new Error('Curation run identity collision')
      if (previous.get('status')==='completed') return {status:'duplicate' as const,runId:previous.get('runId') as string,claimId:null,claimExpiresAt:null}
      if (previous.get('claimId') && previous.get('claimId')!==binding.claimId && Date.parse(previous.get('leaseUntil'))>this.now().getTime())
        return {status:'in-progress' as const,runId:null,claimId:null,claimExpiresAt:previous.get('leaseUntil') as string}
      await transaction.run('MATCH (r:MemoryBackgroundRun {idempotencyKey:$idempotencyKey}) SET r.claimId=$claimId,r.leaseUntil=$leaseUntil,r.batchId=$batchId',
        {idempotencyKey:input.idempotencyKey,claimId:binding.claimId,leaseUntil:binding.leaseUntil,batchId:binding.job.batchId})
      return {status:'claimed' as const,claimId:binding.claimId,claimExpiresAt:binding.leaseUntil,runId:null}
    })
  }

  private async saveRun(binding:ExecutionBinding,raw:SaveCurationRunRequest) {
    const input=SaveCurationRunRequestSchema.parse(raw)
    return this.locked(binding.scope,binding.consentVersion,async(transaction)=>{
      await this.assertFence(transaction,binding)
      if (input.claimId!==binding.claimId || input.authorizationDecisionId!==binding.claimId || input.tenantId!==binding.scope.tenantId || input.subjectId!==binding.scope.subjectId || input.actorId!==binding.scope.actorId)
        throw new Error('Curation save binding mismatch')
      const run=await transaction.run(
        `MATCH (r:MemoryBackgroundRun {idempotencyKey:$idempotencyKey,claimId:$claimId,batchId:$batchId})
         WHERE r.status<>'completed' AND datetime(r.leaseUntil)>datetime($now) RETURN r.runId AS runId`,
        {idempotencyKey:input.idempotencyKey,claimId:binding.claimId,batchId:binding.job.batchId,now:this.now().toISOString()})
      if (run.records.length!==1) return {accepted:0,result:{status:'claim-lost' as const,runId:null,candidateIds:[] as never[]}}
      const activated=await activateBackgroundCandidates(transaction,{scope:binding.scope,batchId:binding.job.batchId,evidenceId:binding.evidenceId,
        sourceFingerprint:input.sourceFingerprint,candidates:input.candidates,modelId:input.modelId,providerId:input.providerId,
        extractorVersion:input.extractorVersion,promptVersion:input.promptVersion,consentVersion:binding.consentVersion,now:this.now()})
      await this.assertFence(transaction,binding)
      await transaction.run(
        `MATCH (r:MemoryBackgroundRun {idempotencyKey:$idempotencyKey}) SET r.status='completed',r.candidateIds=$candidateIds,r.completedAt=$at
         WITH r MATCH (b:MemoryBackgroundBatch {batchId:$batchId})
         SET b.status='completed',b.accepted=$accepted,b.candidateCount=$candidateCount,b.completedAt=$at
         CREATE (:OutboxEvent {eventId:$eventId,batchId:$batchId,tenantId:$tenantId,subjectId:$subjectId,requestId:$requestId,
           eventType:'memory.background-completed.v1',schemaVersion:'memory-outbox-v1',status:'pending',createdAt:$at,attempts:0})`,
        {...binding.job,idempotencyKey:input.idempotencyKey,candidateIds:activated.candidateIds,accepted:activated.accepted,candidateCount:input.candidates.length,
          at:this.now().toISOString(),eventId:neo4jMemoryFingerprint(['memory-background-completed-v1',binding.job.batchId])})
      return {accepted:activated.accepted,result:{status:'completed' as const,runId:run.records[0]?.get('runId') as string,candidateIds:activated.candidateIds}}
    })
  }

  private async finish(binding:ExecutionBinding,curated:MemoryCurationResult) {
    if (curated.status==='persisted') return
    const status=curated.status==='deferred'?(binding.attempt>=this.maxAttempts?'quarantined':'retry'):curated.status==='duplicate'?'completed':'skipped'
    await this.driver.executeQuery(
      `MATCH (b:MemoryBackgroundBatch {batchId:$batchId,claimId:$claimId,fence:$fence})
       WHERE b.status='processing' SET b.status=$status,b.reason=$reason,b.leaseUntil=null`,
      {...binding.job,claimId:binding.claimId,fence:binding.fence,status,reason:curated.reason}, {database:this.options.database})
  }
  private async release(binding:ExecutionBinding) {
    await this.driver.executeQuery(
      `MATCH (b:MemoryBackgroundBatch {batchId:$batchId,claimId:$claimId,fence:$fence}) WHERE b.status='processing'
       SET b.status=$status,b.reason='processing-failed',b.leaseUntil=null`,
      {...binding.job,claimId:binding.claimId,fence:binding.fence,status:binding.attempt>=this.maxAttempts?'quarantined':'retry'}, {database:this.options.database})
  }
  private async terminal(job:MemoryBackgroundJob,reason:string) {
    await this.driver.executeQuery(
      "MATCH (b:MemoryBackgroundBatch {batchId:$batchId,tenantId:$tenantId,subjectId:$subjectId}) WHERE b.status<>'completed' SET b.status='skipped',b.reason=$reason",
      {...job,reason},{database:this.options.database})
  }

  private async recordAttempt(binding:ExecutionBinding,usage:MemoryModelUsage|null,finished:boolean) {
    const parsed=usage===null?null:MemoryModelUsageSchema.parse(usage)
    const attemptId=`${binding.job.batchId}:${binding.fence}`
    const eventId=neo4jMemoryFingerprint([attemptId,finished?'model-finished':'model-intent'])
    const event=createTextMemoryUsageEvent({scope:binding.scope,eventId,attemptId,occurredAt:this.now().toISOString(),operation:'curation',
      workloadVersion:'memory-background-v1',profileVersion:`memory-background-${binding.profile}-v1`,costClass:binding.profile==='internal'?'experiment':'operational',
      calls:{llm:finished?1:null,web:0,fullText:0,vector:0},
      providerUsage:parsed===null?null:{providerId:parsed.providerId,modelId:parsed.modelId,modelVersion:null,adapterVersion:this.options.extractor?.version??'memory-background-v1',
        provenance:binding.scope.sourceKind==='synthetic-transcript'?'synthetic':'provider-reported',inputTokens:parsed.inputTokens,outputTokens:parsed.outputTokens,totalTokens:parsed.totalTokens,
        inputTextTokens:parsed.inputTokens,outputTextTokens:parsed.outputTokens,inputAudioTokens:null,outputAudioTokens:null,cachedInputTokens:null,cachedInputTextTokens:null,cachedInputAudioTokens:null}})
    const entry=MemoryUsageLedgerEntrySchema.parse(finished && this.options.priceUsage ? this.options.priceUsage(event,eventId) : createUnknownCostMemoryUsageLedgerEntry(event,eventId))
    if (JSON.stringify(entry.usageEvent)!==JSON.stringify(event) || entry.ledgerEntryId!==eventId) throw new Error('Background pricing changed its usage evidence')
    const ledgerScope=neo4jMemoryFingerprint(['memory-usage-scope-v1',binding.scope.tenantId,binding.scope.subjectId])
    await this.transaction(async(transaction)=>{
      await transaction.run('MERGE (h:MemoryUsageLedgerHead {scopeKey:$scopeKey}) ON CREATE SET h.lockVersion=0 SET h.lockVersion=h.lockVersion+1',{scopeKey:ledgerScope})
      const existing=await transaction.run('MATCH (e:MemoryUsageLedgerEntry {identityKey:$identityKey}) RETURN e.serialized AS serialized',
        {identityKey:neo4jMemoryFingerprint([ledgerScope,'entry',eventId])})
      if (existing.records.length>0) return
      await transaction.run(
        `CREATE (:MemoryUsageEvent {identityKey:$eventIdentity,scopeKey:$scopeKey,tenantId:$tenantId,subjectId:$subjectId,serialized:$eventJson})
         CREATE (:MemoryUsageLedgerEntry {identityKey:$identityKey,scopeKey:$scopeKey,tenantId:$tenantId,subjectId:$subjectId,occurredAt:$at,serialized:$entryJson})
         MERGE (a:MemoryBackgroundAttempt {attemptId:$attemptId})
         ON CREATE SET a.batchId=$batchId,a.tenantId=$tenantId,a.subjectId=$subjectId,a.startedAt=$at,a.finished=false
         SET a.finished=$finished,a.costKnown=$costKnown,a.usageEventId=$eventId`,
        {...binding.job,scopeKey:ledgerScope,identityKey:neo4jMemoryFingerprint([ledgerScope,'entry',eventId]),eventIdentity:neo4jMemoryFingerprint([ledgerScope,'event',eventId]),
          eventJson:JSON.stringify(event),entryJson:JSON.stringify(entry),at:event.occurredAt,attemptId,finished,eventId,costKnown:entry.cost.brlAmount!==null})
    })
  }

  async metrics() {
    const batches=await this.driver.executeQuery(
      `MATCH (b:MemoryBackgroundBatch) RETURN count(b) AS batches,
       count(CASE WHEN b.status IN ['queued','retry','processing'] THEN 1 END) AS backlog,
       count(CASE WHEN b.status='completed' THEN 1 END) AS completed,
       count(CASE WHEN b.status='quarantined' THEN 1 END) AS quarantined,
       count(CASE WHEN b.status='skipped' THEN 1 END) AS skipped,
       coalesce(sum(b.accepted),0) AS accepted`,{}, {database:this.options.database})
    const attempts=await this.driver.executeQuery(
      `MATCH (a:MemoryBackgroundAttempt) RETURN count(a) AS attempts,
       count(CASE WHEN a.finished=true THEN 1 END) AS measuredModelCalls,
       count(CASE WHEN a.finished=false THEN 1 END) AS unfinishedAttempts,
       count(CASE WHEN a.costKnown=false THEN 1 END) AS unknownCostAttempts`,{}, {database:this.options.database})
    return {...batches.records[0]?.toObject(),...attempts.records[0]?.toObject(),strongModelEscalations:0,shadowReady:false}
  }
}

export async function createNeo4jMemoryBackgroundRuntime(options:Neo4jMemoryBackgroundOptions) {
  if (!options.uri || !options.username || !options.password || !options.database) throw new Error('Background Neo4j configuration is incomplete')
  const now=options.now??(()=>new Date())
  const deadline=options.extractor?.deadlineMilliseconds??30_000
  const leaseMs=options.claimMilliseconds??Math.max(60_000,deadline+10_000)
  if (!Number.isSafeInteger(leaseMs) || leaseMs<=deadline || leaseMs>600_000) throw new Error('Invalid background claim window')
  const maxAttempts=z.number().int().min(1).max(10).parse(options.maxAttempts??3)
  const driver=neo4j.driver(options.uri,neo4j.auth.basic(options.username,options.password),{disableLosslessIntegers:true,maxTransactionRetryTime:0,connectionTimeout:5_000})
  try {
    await driver.verifyConnectivity({database:options.database})
    await initializeNeo4jMemorySchema(driver,options.database)
    for (const [name,label,property] of constraints)
      await driver.executeQuery(`CREATE CONSTRAINT ${name} IF NOT EXISTS FOR (n:${label}) REQUIRE n.${property} IS UNIQUE`,{}, {database:options.database})
  } catch (error) {await driver.close();throw error}
  const store=new Neo4jBackgroundStore(driver,options,now,leaseMs,maxAttempts)
  const engine=options.extractor===undefined?null:new MemoryBackgroundEngine(store,options.extractor,now,new LangGraphMemoryBackgroundAdapter())
  return {
    ingest:(scope:MemoryRequestScope,source:TrustedMemorySource,formationSignal:MemoryFormationSignal,profile:MemoryBackgroundProfile)=>store.ingest(scope,source,formationSignal,profile),
    pending:(limit=100)=>store.pending(limit),
    markPublished:(eventId:string)=>store.markPublished(eventId),
    process:async(job:MemoryBackgroundJob,attempt:{readonly attempt:number})=>{
      if (engine===null) throw new Error('Background Memory extractor is not configured for processing')
      return engine.process(job,attempt)
    },
    metrics:()=>store.metrics(),
    close:()=>driver.close()
  }
}
