import { createHash, randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type { ManagedTransaction } from 'neo4j-driver'
import { z } from 'zod'
import { MemoryRecordSchema } from '@repo/memory-sdk'
import type { MemoryRequestScope } from '@application/contracts'
import { MemoryCandidateSchema, type MemoryCandidate } from '@domain/entities'
import { MemoryAcceptancePolicy } from '@domain/policies'
import { MemoryJudgment } from '@domain/value-objects'
import {
  assertNeo4jMemoryScope,
  neo4jMemoryFingerprint,
  neo4jMemoryScopeKey,
  normalizeNeo4jMemoryText
} from '@infrastructure/adapters/persistence/neo4j'

const ACCEPTANCE_POLICY_VERSION = 'memory-background-acceptance-v1'
const CONFIDENCE = { high: 0.9, medium: 0.65, low: 0.3 } as const

interface BackgroundActivationInput {
  readonly scope: MemoryRequestScope
  readonly batchId: string
  readonly evidenceId: string
  readonly sourceFingerprint: string
  readonly candidates: readonly MemoryCandidate[]
  readonly modelId: string
  readonly providerId: string
  readonly extractorVersion: string
  readonly promptVersion: string
  readonly consentVersion: number
  readonly now: Date
}

const EvidenceSchema = z.object({
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  observedAt: z.string().datetime({ offset: true }),
  sourceTurnIds: z.array(z.string()).min(1)
})

/** The caller owns the transaction, consent lock and background lease fence. */
export async function activateBackgroundCandidates(
  tx: ManagedTransaction,
  input: BackgroundActivationInput
): Promise<{ candidateIds: string[]; accepted: number }> {
  const startedAt = performance.now()
  const now = () =>
    new Date(input.now.getTime() + performance.now() - startedAt)
  const scopeKey = neo4jMemoryScopeKey(input.scope)
  const parameters = {
    scopeKey,
    tenantId: input.scope.tenantId,
    subjectId: input.scope.subjectId,
    actorId: input.scope.actorId,
    purpose: input.scope.purpose,
    conversationId: input.scope.conversationId,
    requestId: input.scope.requestId,
    batchId: input.batchId,
    evidenceId: input.evidenceId,
    sourceFingerprint: input.sourceFingerprint,
    consentVersion: input.consentVersion,
    modelId: input.modelId,
    providerId: input.providerId,
    extractorVersion: input.extractorVersion,
    promptVersion: input.promptVersion,
    policyVersion: ACCEPTANCE_POLICY_VERSION
  }

  const assertAuthority = async () => {
    assertNeo4jMemoryScope(input.scope, now())
    const result = await tx.run(
      `MATCH (h:MemoryConsentHead {scopeKey: $scopeKey})
       WHERE h.tenantId = $tenantId AND h.subjectId = $subjectId
         AND h.purpose = $purpose AND h.version = $consentVersion
         AND h.status = 'granted'
       RETURN h.version AS version`,
      parameters
    )
    if (result.records.length !== 1)
      throw new Error('Current Memory consent does not authorize activation')
    assertNeo4jMemoryScope(input.scope, now())
  }

  const appendEvent = async (
    candidateId: string,
    eventType: string,
    memoryId: string | null,
    version: number,
    at: string
  ) => {
    const eventId = neo4jMemoryFingerprint([candidateId, eventType])
    await tx.run(
      `MERGE (l:MemoryLifecycleEvent {eventId: $eventId})
       ON CREATE SET l.scopeKey = $scopeKey, l.tenantId = $tenantId,
         l.subjectId = $subjectId, l.purpose = $purpose,
         l.memoryId = $memoryId, l.candidateId = $candidateId,
         l.evidenceId = $evidenceId, l.batchId = $batchId,
         l.eventType = $eventType, l.version = $version, l.occurredAt = $at
       MERGE (o:OutboxEvent {eventId: $eventId})
       ON CREATE SET o.scopeKey = $scopeKey, o.tenantId = $tenantId,
         o.subjectId = $subjectId, o.purpose = $purpose,
         o.memoryId = $memoryId, o.candidateId = $candidateId,
         o.evidenceId = $evidenceId, o.batchId = $batchId,
         o.eventType = $eventType, o.aggregateVersion = $version,
         o.schemaVersion = 'memory-outbox-v1', o.status = 'pending',
         o.createdAt = $at, o.requestId = $requestId, o.attempts = 0
       MERGE (l)-[:EMITS]->(o)`,
      { ...parameters, eventId, candidateId, eventType, memoryId, version, at }
    )
  }

  await assertAuthority()
  const evidenceResult = await tx.run(
    `MATCH (e:MemoryEvidence {evidenceId: $evidenceId, scopeKey: $scopeKey})
     WHERE e.tenantId = $tenantId AND e.subjectId = $subjectId
       AND e.actorId = $actorId AND e.eligible = true
       AND e.conversationId = $conversationId
       AND e.sourceKind IN ['development-text', 'synthetic-transcript', 'realtime-transcript']
     RETURN e.contentHash AS contentHash, e.observedAt AS observedAt,
       e.sourceTurnIds AS sourceTurnIds`,
    parameters
  )
  if (evidenceResult.records.length !== 1)
    throw new Error('Background Memory evidence is unavailable')
  const evidence = EvidenceSchema.parse(evidenceResult.records[0]?.toObject())
  const sourceTurnIds = new Set(evidence.sourceTurnIds)
  const policy = new MemoryAcceptancePolicy(0.8)
  const candidateIds: string[] = []
  let accepted = 0

  for (const value of input.candidates) {
    const candidate = MemoryCandidateSchema.parse(value)
    if (
      candidate.tenantId !== input.scope.tenantId ||
      candidate.subjectId !== input.scope.subjectId ||
      candidate.actorId !== input.scope.actorId ||
      candidate.purpose !== input.scope.purpose ||
      candidate.provenance.conversationId !== input.scope.conversationId ||
      candidate.provenance.sourceFingerprint !== input.sourceFingerprint ||
      candidate.provenance.sourceTurnIds.some((id) => !sourceTurnIds.has(id)) ||
      Date.parse(candidate.createdAt) > now().getTime()
    )
      throw new Error('Background Memory candidate attribution is invalid')

    const statement = normalizeNeo4jMemoryText(candidate.statement)
      .trim()
      .replace(/\s+/gu, ' ')
    const statementHash = createHash('sha256').update(statement).digest('hex')
    let canonicalKey =
      candidate.kind === 'semantic'
        ? `fact:${statementHash}`
        : `episode:${neo4jMemoryFingerprint([
            statement,
            candidate.occurredAt,
            candidate.temporalPrecision,
            candidate.temporalReference
          ])}`
    let canonicalIdentityKey = neo4jMemoryFingerprint([
      scopeKey,
      candidate.kind,
      normalizeNeo4jMemoryText(canonicalKey)
    ])
    // Explicit commands can use a caller-owned semantic key. Reuse the same
    // exact normalized fact and honor every suppressed alias before promotion.
    const aliases = await tx.run(
      `MATCH (m:Memory {scopeKey:$scopeKey})-[:HAS_VERSION]->(v:MemoryVersion)
       WHERE m.tenantId=$tenantId AND m.subjectId=$subjectId AND m.purpose=$purpose
         AND $kind='semantic' AND m.kind=$kind AND (m.currentVersionId=v.versionId OR m.state='tombstoned')
         AND (v.statement=$rawStatement OR v.searchableText STARTS WITH $normalizedStatement)
       RETURN m.canonicalIdentityKey AS identityKey,m.canonicalKey AS canonicalKey,
         v.statement AS statement,
         EXISTS { MATCH (:MemorySuppression {canonicalIdentityKey:m.canonicalIdentityKey}) } AS suppressed
       ORDER BY m.canonicalIdentityKey`,
      {
        ...parameters,
        kind: candidate.kind,
        rawStatement: candidate.statement,
        normalizedStatement: statement
      }
    )
    const sameFact = aliases.records.filter(
      (row) =>
        normalizeNeo4jMemoryText(z.string().parse(row.get('statement')))
          .trim()
          .replace(/\s+/gu, ' ') === statement
    )
    const existingAlias = sameFact.find((row) => row.get('suppressed') !== true)
    if (existingAlias) {
      canonicalKey = z.string().parse(existingAlias.get('canonicalKey'))
      canonicalIdentityKey = z.string().parse(existingAlias.get('identityKey'))
    }
    const candidateId = neo4jMemoryFingerprint([
      scopeKey,
      input.batchId,
      candidate.candidateFingerprint
    ])
    const suppression = await tx.run(
      `MATCH (s:MemorySuppression {canonicalIdentityKey: $canonicalIdentityKey})
       RETURN s.receiptId AS receiptId`,
      { canonicalIdentityKey }
    )
    const suppressed =
      suppression.records.length > 0 ||
      sameFact.some((row) => row.get('suppressed') === true)
    const confidence = CONFIDENCE[candidate.confidence]
    const judgment = MemoryJudgment.create({
      decision:
        !suppressed && confidence >= policy.minimumConfidence
          ? 'remember'
          : 'quarantine',
      confidence,
      rationaleCode: suppressed
        ? 'canonical-identity-suppressed'
        : confidence >= policy.minimumConfidence
          ? 'eligible-high-confidence-extraction'
          : 'extraction-confidence-below-threshold'
    })
    const at = now().toISOString()
    const candidateParameters = {
      ...parameters,
      candidateId,
      candidateFingerprint: candidate.candidateFingerprint,
      candidateJson: JSON.stringify(candidate),
      canonicalIdentityKey,
      canonicalKey,
      kind: candidate.kind,
      confidence,
      judgmentDecision: judgment.decision,
      rationaleCode: judgment.rationaleCode,
      at
    }
    await assertAuthority()
    const staged = await tx.run(
      `MATCH (e:MemoryEvidence {evidenceId: $evidenceId, scopeKey: $scopeKey})
       MERGE (c:MemoryBackgroundCandidate {candidateId: $candidateId})
       ON CREATE SET c.scopeKey = $scopeKey, c.tenantId = $tenantId,
         c.subjectId = $subjectId, c.actorId = $actorId, c.purpose = $purpose,
         c.batchId = $batchId, c.evidenceId = $evidenceId,
         c.sourceFingerprint = $sourceFingerprint,
         c.candidateFingerprint = $candidateFingerprint,
         c.candidateJson = $candidateJson, c.kind = $kind,
         c.canonicalIdentityKey = $canonicalIdentityKey,
         c.canonicalKey = $canonicalKey, c.confidence = $confidence,
         c.modelId = $modelId, c.providerId = $providerId,
         c.extractorVersion = $extractorVersion, c.promptVersion = $promptVersion,
         c.policyVersion = $policyVersion, c.consentVersion = $consentVersion,
         c.status = 'candidate', c.createdAt = $at,
         c.judgmentDecision = $judgmentDecision, c.rationaleCode = $rationaleCode
       MERGE (c)-[:SUPPORTED_BY]->(e)
       RETURN c.status AS status, c.scopeKey AS scopeKey,
         c.canonicalIdentityKey AS canonicalIdentityKey`,
      candidateParameters
    )
    const stagedRow = staged.records[0]
    if (
      staged.records.length !== 1 ||
      stagedRow?.get('scopeKey') !== scopeKey ||
      stagedRow.get('canonicalIdentityKey') !== canonicalIdentityKey
    )
      throw new Error('Background Memory candidate identity is invalid')
    candidateIds.push(candidateId)

    if (suppressed || !judgment.shouldPersist) {
      await tx.run(
        `MATCH (c:MemoryBackgroundCandidate {candidateId: $candidateId, scopeKey: $scopeKey})
         WHERE c.status = 'candidate'
         SET c.status = $status, c.judgmentDecision = $judgmentDecision,
           c.rationaleCode = $rationaleCode, c.resolvedAt = $at`,
        {
          ...candidateParameters,
          status: suppressed ? 'suppressed' : 'quarantined'
        }
      )
      await appendEvent(
        candidateId,
        suppressed
          ? 'memory.background-candidate-suppressed.v1'
          : 'memory.background-candidate-quarantined.v1',
        null,
        1,
        at
      )
      continue
    }
    if (stagedRow.get('status') === 'accepted') continue
    if (stagedRow.get('status') !== 'candidate') continue
    policy.assertAcceptable(
      {
        kind: candidate.kind,
        confidence,
        canonicalKey: candidate.kind === 'semantic' ? canonicalKey : null
      },
      judgment
    )

    const existing = await tx.run(
      `MATCH (m:Memory {canonicalIdentityKey: $canonicalIdentityKey, scopeKey: $scopeKey})
       OPTIONAL MATCH (m)-[:HAS_VERSION]->(v:MemoryVersion {versionId: m.currentVersionId})
       RETURN m.memoryId AS memoryId, m.version AS version, m.state AS state,
         v.versionId AS versionId, v.recordJson AS recordJson`,
      candidateParameters
    )
    const previous = existing.records[0]
    if (
      existing.records.length > 1 ||
      (previous && previous.get('state') !== 'active')
    )
      throw new Error('Background Memory cannot reactivate a closed identity')
    const priorRecord = previous
      ? MemoryRecordSchema.parse(
          JSON.parse(z.string().parse(previous.get('recordJson')))
        )
      : null
    if (
      priorRecord !== null &&
      (priorRecord.id !== previous?.get('memoryId') ||
        priorRecord.kind !== candidate.kind ||
        priorRecord.purposeIds[0] !== input.scope.purpose)
    )
      throw new Error('Background Memory prior version is inconsistent')
    const memoryId = previous
      ? z.string().uuid().parse(previous.get('memoryId'))
      : randomUUID()
    const previousVersion = previous
      ? z.number().int().positive().safe().parse(previous.get('version'))
      : 0
    const version = previousVersion + 1
    const versionId = randomUUID()
    const transformationId = randomUUID()
    const sourceArtifactIds = [
      ...new Set([
        input.evidenceId,
        ...(priorRecord?.provenance.sourceArtifactIds ?? [])
      ])
    ].slice(0, 32)
    const record = MemoryRecordSchema.parse({
      id: memoryId,
      category: 'personal-fact',
      kind: candidate.kind,
      statement: candidate.statement,
      confidence,
      uncertainty: candidate.uncertainty,
      semanticKey: candidate.kind === 'semantic' ? canonicalKey : null,
      occurredAt: candidate.occurredAt,
      temporalPrecision: candidate.temporalPrecision,
      temporalReference: candidate.temporalReference,
      validFrom: candidate.validFrom,
      validUntil: null,
      purposeIds: [input.scope.purpose],
      state: 'active',
      version,
      observedAt: evidence.observedAt,
      createdAt: at,
      updatedAt: at,
      provenance: {
        actorType: 'agent',
        authorId: 'memory-curator',
        observedAt: evidence.observedAt,
        sourceArtifactIds,
        sourceType: 'derived',
        transformation: {
          id: transformationId,
          policyVersion: ACCEPTANCE_POLICY_VERSION,
          model: input.modelId,
          promptVersion: input.promptVersion
        }
      }
    })
    await assertAuthority()
    const activated = await tx.run(
      `MATCH (h:MemoryConsentHead {scopeKey: $scopeKey})
       WHERE h.tenantId = $tenantId AND h.subjectId = $subjectId
         AND h.purpose = $purpose AND h.status = 'granted'
         AND h.version = $consentVersion
       MATCH (c:MemoryBackgroundCandidate {candidateId: $candidateId, scopeKey: $scopeKey})
         -[:SUPPORTED_BY]->(e:MemoryEvidence {evidenceId: $evidenceId, scopeKey: $scopeKey})
       WHERE c.status = 'candidate' AND c.consentVersion = $consentVersion
         AND e.eligible = true AND e.contentHash = $contentHash
         AND e.tenantId = $tenantId AND e.subjectId = $subjectId AND e.actorId = $actorId
         AND NOT EXISTS { MATCH (:MemorySuppression {canonicalIdentityKey: $canonicalIdentityKey}) }
       MERGE (m:Memory {canonicalIdentityKey: $canonicalIdentityKey})
       ON CREATE SET m.memoryId = $memoryId, m.scopeKey = $scopeKey,
         m.tenantId = $tenantId, m.subjectId = $subjectId, m.purpose = $purpose,
         m.createdAt = $at, m.canonicalKey = $canonicalKey,
         m.kind = $kind, m.state = 'active', m.version = 0
       WITH m, c, e
       WHERE m.scopeKey = $scopeKey AND m.tenantId = $tenantId
         AND m.subjectId = $subjectId AND m.purpose = $purpose
         AND m.state = 'active' AND m.version = $previousVersion
       CREATE (v:MemoryVersion {versionId: $versionId, memoryId: $memoryId,
         version: $version, scopeKey: $scopeKey, tenantId: $tenantId,
         subjectId: $subjectId, purpose: $purpose, category: 'personal-fact',
         kind: $kind, semanticKey: $semanticKey, statement: $statement,
         searchableText: $searchableText, recordJson: $recordJson,
         viewIds: ['personal'], sensitivity: 'normal', authorId: $subjectId,
         sourceArtifactId: $evidenceId, evidenceHash: $contentHash,
         observedAt: $observedAt, occurredAt: $occurredAt, validFrom: $validFrom,
         validUntil: null, temporalPrecision: $temporalPrecision,
         transformationId: $transformationId, derivationPolicyVersion: $policyVersion,
         modelId: $modelId, providerId: $providerId, extractorVersion: $extractorVersion,
         promptVersion: $promptVersion})
       CREATE (m)-[:HAS_VERSION]->(v)
       CREATE (v)-[:SUPPORTED_BY]->(e)
       CREATE (c)-[:ACCEPTED_AS]->(v)
       WITH m, c, v
       OPTIONAL MATCH (previous:MemoryVersion {versionId: $previousVersionId, scopeKey: $scopeKey})
         -[:SUPPORTED_BY]->(priorEvidence:MemoryEvidence {scopeKey: $scopeKey})
       WITH m, c, v, collect(DISTINCT priorEvidence) AS priorEvidenceNodes
       FOREACH (priorEvidence IN priorEvidenceNodes | MERGE (v)-[:SUPPORTED_BY]->(priorEvidence))
       SET m.currentVersionId = $versionId, m.version = $version,
         m.category = 'personal-fact', m.updatedAt = $at,
         c.status = 'accepted', c.memoryId = $memoryId,
         c.versionId = $versionId, c.resolvedAt = $at,
         c.transformationId = $transformationId
       RETURN m.memoryId AS memoryId`,
      {
        ...candidateParameters,
        memoryId,
        version,
        versionId,
        previousVersion,
        previousVersionId: previous?.get('versionId') ?? null,
        transformationId,
        semanticKey: record.semanticKey,
        statement: record.statement,
        searchableText: normalizeNeo4jMemoryText(
          `${record.statement} ${record.semanticKey ?? ''}`
        ),
        recordJson: JSON.stringify(record),
        contentHash: evidence.contentHash,
        observedAt: record.observedAt,
        occurredAt: record.occurredAt,
        validFrom: record.validFrom,
        temporalPrecision: record.temporalPrecision
      }
    )
    if (activated.records.length !== 1)
      throw new Error('Background canonical Memory activation failed')
    await appendEvent(candidateId, 'memory.accepted.v1', memoryId, version, at)
    accepted += 1
  }

  await assertAuthority()
  return { candidateIds: [...new Set(candidateIds)], accepted }
}
