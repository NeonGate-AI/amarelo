import { randomUUID } from 'node:crypto'
import type { ManagedTransaction } from 'neo4j-driver'
import { z } from 'zod'
import {
  ExplicitMemoryInputSchema,
  ExplicitMemoryOptionsSchema,
  ExplicitMemoryResultSchema,
  MemoryConsentStateSchema,
  MemoryDeletionReceiptSchema,
  MemorySearchInputSchema,
  UpdateMemoryConsentInputSchema,
  type ExplicitMemoryInput,
  type ExplicitMemoryOptions,
  type MemoryConsentState,
  type MemoryDeletionReceipt,
  type MemoryRecord,
  type MemorySearchInput,
  type UpdateMemoryConsentInput
} from '@repo/memory-sdk'
import type {
  EligibleMemorySource,
  MemoryRequestScope
} from '@application/contracts'
import {
  CanonicalMemoryPort,
  type AcceptCandidateInput,
  type AcceptCandidateResult,
  type TombstoneMemoryInput,
  type OperationalMemoryOperation,
  type OperationalMemorySearch,
  type OperationalMemoryTransaction,
  type StagedExplicitMemory,
  type StoredExplicitMemoryCandidate
} from '@application/ports'
import { parseNeo4jMemoryRecord } from './neo4j-memory-record.map'
import { Neo4jScopedMemoryRepository } from './neo4j-memory-search.adapter'
import {
  assertNeo4jMemoryScope,
  neo4jMemoryFingerprint,
  neo4jMemoryScopeKey,
  normalizeNeo4jMemoryText
} from './neo4j-memory-scope.guard'

const ConsentHeadSchema = z.object({
  version: z.number().int().positive().safe(),
  status: z.enum(['granted', 'revoked']),
  policyVersion: z.string().nullable(),
  updatedAt: z.string().datetime({ offset: true })
})

const CandidateSchema = z.object({
  candidateId: z.string().uuid(),
  commandId: z.string(),
  requestedAt: z.string(),
  evidenceId: z.string().uuid(),
  contentHash: z.string(),
  inputJson: z.string(),
  canonicalIdentityKey: z.string(),
  canonicalKey: z.string(),
  status: z.enum(['candidate', 'accepted'])
})

/** All operations share the consent lock and transaction acquired by the unit of work. */
export class Neo4jOperationalMemoryTransaction
  extends CanonicalMemoryPort
  implements OperationalMemoryTransaction
{
  readonly canonical: CanonicalMemoryPort = this
  private readonly scopeKey: string

  constructor(
    private readonly transaction: ManagedTransaction,
    private readonly scope: MemoryRequestScope,
    private readonly operation: OperationalMemoryOperation,
    private consentVersion: number,
    private readonly now: () => Date
  ) {
    super()
    this.scopeKey = neo4jMemoryScopeKey(scope)
  }

  private parameters() {
    return {
      scopeKey: this.scopeKey,
      tenantId: this.scope.tenantId,
      subjectId: this.scope.subjectId,
      actorId: this.scope.actorId,
      purpose: this.scope.purpose
    }
  }

  async assertAuthority(): Promise<void> {
    assertNeo4jMemoryScope(this.scope, this.now())
    const result = await this.transaction.run(
      `MATCH (h:MemoryConsentHead {scopeKey: $scopeKey})
       WHERE h.tenantId = $tenantId AND h.subjectId = $subjectId AND h.purpose = $purpose
       RETURN h.version AS version, h.status AS status`,
      this.parameters()
    )
    const row = result.records[0]
    if (
      result.records.length !== 1 ||
      row?.get('version') !== this.consentVersion ||
      ((this.operation === 'persist' || this.operation === 'retrieve') &&
        row.get('status') !== 'granted')
    )
      throw new Error(
        'Current Memory consent does not authorize this operation'
      )
    assertNeo4jMemoryScope(this.scope, this.now())
  }

  private requireOperation(operation: OperationalMemoryOperation): void {
    if (this.operation !== operation)
      throw new Error('Memory transaction capability mismatch')
  }

  async getConsent(): Promise<MemoryConsentState> {
    await this.assertAuthority()
    const result = await this.transaction.run(
      `MATCH (h:MemoryConsentHead {scopeKey: $scopeKey})
       WHERE h.tenantId = $tenantId AND h.subjectId = $subjectId AND h.purpose = $purpose
       RETURN h.version AS version, h.status AS status,
              h.policyVersion AS policyVersion, h.updatedAt AS updatedAt`,
      this.parameters()
    )
    const row = result.records[0]
    const head = ConsentHeadSchema.parse(row?.toObject())
    return MemoryConsentStateSchema.parse({
      version: head.version,
      updatedAt: head.updatedAt,
      entries:
        head.policyVersion === null
          ? []
          : [
              {
                version: head.version,
                updatedAt: head.updatedAt,
                purpose: this.scope.purpose,
                status: head.status,
                policyVersion: head.policyVersion
              }
            ]
    })
  }

  async updateConsent(
    input: UpdateMemoryConsentInput
  ): Promise<MemoryConsentState> {
    this.requireOperation('consent')
    await this.assertAuthority()
    const parsed = UpdateMemoryConsentInputSchema.parse(input)
    if (
      parsed.expectedVersion !== this.consentVersion ||
      parsed.changes.length !== 1
    ) {
      throw new Error('Memory consent version does not match')
    }
    const change = parsed.changes[0]
    if (!change || change.purpose !== this.scope.purpose)
      throw new Error('Memory consent scope mismatch')
    const version = this.consentVersion + 1
    const entryId = randomUUID()
    const at = this.now().toISOString()
    const result = await this.transaction.run(
      `MATCH (h:MemoryConsentHead {scopeKey: $scopeKey})
       WHERE h.version = $expectedVersion AND h.tenantId = $tenantId
         AND h.subjectId = $subjectId AND h.purpose = $purpose
       CREATE (e:MemoryConsentEntry {entryId: $entryId, scopeKey: $scopeKey,
         tenantId: $tenantId, subjectId: $subjectId, actorId: $actorId, purpose: $purpose,
         version: $version, status: $status, policyVersion: $policyVersion, effectiveAt: $at})
       CREATE (h)-[:HAS_ENTRY]->(e)
       SET h.version = $version, h.status = $status, h.policyVersion = $policyVersion,
           h.updatedAt = $at
       RETURN h.version AS version`,
      {
        ...this.parameters(),
        expectedVersion: this.consentVersion,
        entryId,
        version,
        status: change.status,
        policyVersion: change.policyVersion,
        at
      }
    )
    if (result.records.length !== 1)
      throw new Error('Memory consent update failed')
    this.consentVersion = version
    await this.appendEvent(
      entryId,
      'memory.consent-updated.v1',
      null,
      version,
      at
    )
    return this.getConsent()
  }

  async stageExplicit(
    input: ExplicitMemoryInput,
    options: ExplicitMemoryOptions,
    source?: EligibleMemorySource
  ): Promise<StagedExplicitMemory> {
    if (source !== undefined)
      throw new Error('Trusted Memory evidence staging is not implemented')
    this.requireOperation('persist')
    await this.assertAuthority()
    const parsed = ExplicitMemoryInputSchema.parse(input)
    const parsedOptions = ExplicitMemoryOptionsSchema.parse(options)
    if (parsed.purpose !== this.scope.purpose)
      throw new Error('Explicit Memory purpose mismatch')
    const commandId = neo4jMemoryFingerprint([
      this.scopeKey,
      parsedOptions.idempotencyKey ?? randomUUID()
    ])
    const canonicalKey = parsed.semanticKey ?? `episode:${commandId}`
    const canonicalIdentityKey = neo4jMemoryFingerprint([
      this.scopeKey,
      parsed.kind,
      normalizeNeo4jMemoryText(canonicalKey)
    ])
    await this.assertUnsuppressed(canonicalIdentityKey)
    const inputJson = JSON.stringify(parsed)
    const inputHash = neo4jMemoryFingerprint([parsed])
    const prior = await this.transaction.run(
      `MATCH (c:MemoryCommand {commandId: $commandId, scopeKey: $scopeKey})
       RETURN c.inputHash AS inputHash, c.candidateId AS candidateId, c.requestedAt AS requestedAt`,
      { ...this.parameters(), commandId }
    )
    if (prior.records.length > 0) {
      const row = prior.records[0]
      if (row?.get('inputHash') !== inputHash)
        throw new Error('Memory command identity collision')
      return {
        candidateId: z.string().uuid().parse(row.get('candidateId')),
        requestedAt: z
          .string()
          .datetime({ offset: true })
          .parse(row.get('requestedAt')),
        commandId
      }
    }
    const candidateId = randomUUID()
    const evidenceId = randomUUID()
    const requestedAt = this.now().toISOString()
    const contentHash = neo4jMemoryFingerprint([parsed.statement])
    await this.assertAuthority()
    await this.transaction.run(
      `CREATE (e:MemoryEvidence {evidenceId: $evidenceId, scopeKey: $scopeKey,
         tenantId: $tenantId, subjectId: $subjectId, actorId: $actorId, purpose: $purpose,
         text: $statement, contentHash: $contentHash, sourceKind: $sourceKind,
         sourceType: 'explicit-user', conversationId: $conversationId,
         sourceTurnId: $sourceTurnId, sourceTurnVersion: 1, observedAt: $requestedAt, eligible: true})
       CREATE (c:MemoryCandidate {candidateId: $candidateId, scopeKey: $scopeKey,
         tenantId: $tenantId, subjectId: $subjectId, actorId: $actorId, purpose: $purpose,
         commandId: $commandId, canonicalIdentityKey: $canonicalIdentityKey,
         canonicalKey: $canonicalKey, inputJson: $inputJson, evidenceId: $evidenceId,
         contentHash: $contentHash, requestedAt: $requestedAt, status: 'candidate',
         consentVersion: $consentVersion})
       CREATE (c)-[:SUPPORTED_BY]->(e)
       CREATE (:MemoryCommand {commandId: $commandId, scopeKey: $scopeKey,
         tenantId: $tenantId, subjectId: $subjectId, purpose: $purpose,
         canonicalIdentityKey: $canonicalIdentityKey, candidateId: $candidateId,
         inputHash: $inputHash, requestedAt: $requestedAt})`,
      {
        ...this.parameters(),
        evidenceId,
        candidateId,
        commandId,
        canonicalIdentityKey,
        canonicalKey,
        inputJson,
        inputHash,
        contentHash,
        requestedAt,
        statement: parsed.statement,
        sourceKind: this.scope.sourceKind,
        conversationId: this.scope.conversationId,
        sourceTurnId: this.scope.requestId,
        consentVersion: this.consentVersion
      }
    )
    return { candidateId, commandId, requestedAt }
  }

  async loadExplicitCandidate(
    _candidateId: string
  ): Promise<StoredExplicitMemoryCandidate> {
    throw new Error('Stored Memory candidate delivery is not implemented')
  }

  private async assertUnsuppressed(
    canonicalIdentityKey: string
  ): Promise<void> {
    const result = await this.transaction.run(
      'MATCH (s:MemorySuppression {canonicalIdentityKey: $canonicalIdentityKey}) RETURN s.receiptId AS receiptId',
      { canonicalIdentityKey }
    )
    if (result.records.length !== 0)
      throw new Error('Memory identity has been suppressed')
  }

  async acceptCandidate(
    input: AcceptCandidateInput
  ): Promise<AcceptCandidateResult> {
    this.requireOperation('persist')
    await this.assertAuthority()
    const result = await this.transaction.run(
      `MATCH (c:MemoryCandidate {candidateId: $candidateId, scopeKey: $scopeKey})
       WHERE c.tenantId = $tenantId AND c.subjectId = $subjectId AND c.actorId = $actorId
         AND c.purpose = $purpose AND c.consentVersion = $consentVersion
       RETURN c.candidateId AS candidateId, c.commandId AS commandId, c.requestedAt AS requestedAt,
         c.evidenceId AS evidenceId, c.contentHash AS contentHash, c.inputJson AS inputJson,
         c.canonicalIdentityKey AS canonicalIdentityKey, c.canonicalKey AS canonicalKey, c.status AS status`,
      {
        ...this.parameters(),
        candidateId: input.candidateId,
        consentVersion: this.consentVersion
      }
    )
    const candidate = CandidateSchema.parse(result.records[0]?.toObject())
    const body = ExplicitMemoryInputSchema.parse(
      JSON.parse(candidate.inputJson)
    )
    if (
      input.commandId !== candidate.commandId ||
      input.requestedAt !== candidate.requestedAt ||
      input.category !== body.category ||
      input.canonicalKey !== body.semanticKey ||
      input.confidence !== 1 ||
      input.viewIds.length !== 1 ||
      input.viewIds[0] !== 'personal' ||
      input.policyVersion !== 'memory-explicit-acceptance-v1' ||
      body.purpose !== this.scope.purpose
    )
      throw new Error('Candidate promotion scope or policy mismatch')
    await this.assertUnsuppressed(candidate.canonicalIdentityKey)
    if (candidate.status === 'accepted') {
      const prior = await this.transaction.run(
        `MATCH (c:MemoryCommand {commandId: $commandId, scopeKey: $scopeKey})
         MATCH (m:Memory {memoryId: c.memoryId, scopeKey: $scopeKey})
         WHERE m.state = 'active' AND m.currentVersionId = c.versionId
         RETURN c.memoryId AS memoryId, c.versionId AS versionId, c.version AS version`,
        { ...this.parameters(), commandId: input.commandId }
      )
      return z
        .object({
          memoryId: z.string().uuid(),
          versionId: z.string().uuid(),
          version: z.number().int().positive().safe()
        })
        .parse(prior.records[0]?.toObject())
    }
    const existing = await this.transaction.run(
      `MATCH (m:Memory {canonicalIdentityKey: $canonicalIdentityKey, scopeKey: $scopeKey})
       RETURN m.memoryId AS memoryId, m.version AS version, m.createdAt AS createdAt, m.state AS state`,
      {
        ...this.parameters(),
        canonicalIdentityKey: candidate.canonicalIdentityKey
      }
    )
    const previous = existing.records[0]
    if (previous && previous.get('state') !== 'active')
      throw new Error('Memory lifecycle cannot be reactivated')
    const memoryId = previous
      ? z.string().uuid().parse(previous.get('memoryId'))
      : randomUUID()
    const version = previous
      ? z.number().int().positive().safe().parse(previous.get('version')) + 1
      : 1
    const versionId = randomUUID()
    const at = this.now().toISOString()
    const { purpose, ...content } = body
    const record = ExplicitMemoryResultSchema.parse({
      ...content,
      id: memoryId,
      purposeIds: [purpose],
      confidence: 1,
      state: 'active',
      version,
      validUntil: null,
      observedAt: candidate.requestedAt,
      createdAt: candidate.requestedAt,
      updatedAt: at,
      provenance: {
        actorType: 'user',
        authorId: this.scope.actorId,
        observedAt: candidate.requestedAt,
        sourceArtifactIds: [candidate.evidenceId],
        sourceType: 'explicit_user',
        transformation: null
      }
    })
    await this.assertAuthority()
    const activation = await this.transaction.run(
      `MATCH (c:MemoryCandidate {candidateId: $candidateId, scopeKey: $scopeKey})-[:SUPPORTED_BY]->(e:MemoryEvidence {evidenceId: $evidenceId})
       WHERE c.status = 'candidate' AND c.consentVersion = $consentVersion
         AND e.scopeKey = $scopeKey AND e.actorId = $actorId AND e.subjectId = $subjectId
         AND e.eligible = true AND e.contentHash = $contentHash
       MERGE (m:Memory {canonicalIdentityKey: $canonicalIdentityKey})
       ON CREATE SET m.memoryId = $memoryId, m.scopeKey = $scopeKey, m.tenantId = $tenantId,
         m.subjectId = $subjectId, m.purpose = $purpose, m.createdAt = $createdAt,
         m.canonicalKey = $canonicalKey, m.kind = $kind
       CREATE (v:MemoryVersion {versionId: $versionId, memoryId: $memoryId, version: $version,
         scopeKey: $scopeKey, tenantId: $tenantId, subjectId: $subjectId, purpose: $purpose,
         category: $category, kind: $kind, semanticKey: $semanticKey, statement: $statement,
         searchableText: $searchableText, recordJson: $recordJson, viewIds: ['personal'],
         sensitivity: 'normal', authorId: $actorId, sourceArtifactId: $evidenceId,
         evidenceHash: $contentHash, observedAt: $observedAt, occurredAt: $occurredAt,
         validFrom: $validFrom, validUntil: null, temporalPrecision: $temporalPrecision})
       CREATE (m)-[:HAS_VERSION]->(v)
       CREATE (v)-[:SUPPORTED_BY]->(e)
       SET m.state = 'active', m.currentVersionId = $versionId, m.version = $version,
         m.category = $category, m.updatedAt = $at, c.status = 'accepted'
       WITH m
       MATCH (command:MemoryCommand {commandId: $commandId, scopeKey: $scopeKey})
       SET command.memoryId = $memoryId, command.versionId = $versionId, command.version = $version
       RETURN m.memoryId AS memoryId`,
      {
        ...this.parameters(),
        candidateId: candidate.candidateId,
        evidenceId: candidate.evidenceId,
        contentHash: candidate.contentHash,
        consentVersion: this.consentVersion,
        canonicalIdentityKey: candidate.canonicalIdentityKey,
        canonicalKey: candidate.canonicalKey,
        memoryId,
        versionId,
        version,
        createdAt: record.createdAt,
        category: body.category,
        kind: body.kind,
        semanticKey: body.semanticKey,
        statement: body.statement,
        searchableText: normalizeNeo4jMemoryText(
          `${body.statement} ${body.semanticKey ?? ''}`
        ),
        recordJson: JSON.stringify(record),
        observedAt: candidate.requestedAt,
        occurredAt: body.occurredAt,
        validFrom: body.validFrom,
        temporalPrecision: body.temporalPrecision,
        at,
        commandId: candidate.commandId
      }
    )
    if (activation.records.length !== 1)
      throw new Error('Canonical Memory activation failed')
    await this.appendEvent(
      candidate.commandId,
      'memory.accepted.v1',
      memoryId,
      version,
      at
    )
    return { memoryId, versionId, version }
  }

  async readRecord(memoryId: string): Promise<MemoryRecord | null> {
    if (this.operation !== 'persist' && this.operation !== 'retrieve')
      throw new Error('Memory read capability mismatch')
    await this.assertAuthority()
    const result = await this.transaction.run(
      `MATCH (m:Memory {memoryId: $memoryId, scopeKey: $scopeKey})-[:HAS_VERSION]->(v:MemoryVersion)
       WHERE m.tenantId = $tenantId AND m.subjectId = $subjectId AND m.purpose = $purpose
         AND m.state = 'active' AND m.currentVersionId = v.versionId
         AND v.scopeKey = $scopeKey AND v.authorId = $actorId
         AND NOT EXISTS { MATCH (:MemorySuppression {canonicalIdentityKey: m.canonicalIdentityKey}) }
         AND EXISTS { MATCH (v)-[:SUPPORTED_BY]->(e:MemoryEvidence {scopeKey: $scopeKey})
           WHERE e.eligible = true AND e.actorId = $actorId AND e.subjectId = $subjectId
             AND e.evidenceId = v.sourceArtifactId AND e.contentHash = v.evidenceHash }
       RETURN v.recordJson AS record`,
      { ...this.parameters(), memoryId }
    )
    return result.records.length === 0
      ? null
      : parseNeo4jMemoryRecord(result.records[0]?.get('record'), this.scope)
  }

  async authorizeSearch(
    input: MemorySearchInput
  ): Promise<OperationalMemorySearch> {
    this.requireOperation('retrieve')
    await this.assertAuthority()
    const parsed = MemorySearchInputSchema.parse(input)
    if (parsed.purpose !== this.scope.purpose)
      throw new Error('Memory search purpose mismatch')
    let categories = parsed.categories
    if (categories === undefined) {
      const result = await this.transaction.run(
        `MATCH (m:Memory {scopeKey: $scopeKey})
         WHERE m.tenantId = $tenantId AND m.subjectId = $subjectId AND m.purpose = $purpose
           AND m.state = 'active'
         RETURN DISTINCT m.category AS category ORDER BY category LIMIT 32`,
        this.parameters()
      )
      categories = result.records.map((row) =>
        z.string().min(1).max(200).parse(row.get('category'))
      )
      if (categories.length === 0) categories = ['memory.empty']
    }
    const decisionId = neo4jMemoryFingerprint([
      this.scopeKey,
      this.scope.authenticationSessionId,
      this.consentVersion,
      'retrieve'
    ])
    const query = {
      authorizationDecisionId: decisionId,
      traceId: this.scope.requestId,
      tenantId: this.scope.tenantId,
      subjectId: this.scope.subjectId,
      purpose: this.scope.purpose,
      viewId: 'personal',
      kinds: parsed.kinds ?? (['semantic', 'episodic'] as const),
      categories,
      timeWindow: { fromInclusive: null, toExclusive: null },
      budgets: { maxTokens: parsed.tokenBudget },
      queryText: parsed.query,
      semanticKeys: [],
      vectorFallback: false as const
    }
    return {
      query,
      consentVersion: this.consentVersion,
      dependencies: {
        now: this.now,
        observer: { record: () => undefined },
        repository: new Neo4jScopedMemoryRepository(
          this.transaction,
          this.scope,
          this.scopeKey,
          this.consentVersion,
          decisionId,
          parsed.asOf,
          this.now,
          () => this.assertAuthority()
        ),
        authorizationResolver: {
          resolve: async (id) => {
            await this.assertAuthority()
            if (id !== decisionId) return null
            return {
              id,
              status: 'active',
              expiresAt: new Date(this.scope.expiresAtMs).toISOString(),
              tenantId: this.scope.tenantId,
              subjectId: this.scope.subjectId,
              purpose: this.scope.purpose,
              viewId: 'personal',
              kinds: query.kinds,
              categories: query.categories,
              sensitivities: ['normal'],
              timeWindow: query.timeWindow
            }
          }
        }
      }
    }
  }

  async tombstoneMemory(input: TombstoneMemoryInput): Promise<boolean> {
    this.requireOperation('delete')
    await this.assertAuthority()
    if (
      input.tenantId !== this.scope.tenantId ||
      input.subjectId !== this.scope.subjectId
    ) {
      throw new Error('Memory suppression scope mismatch')
    }
    if (await this.readDeletionReceipt(input.memoryId)) return true
    const result = await this.transaction.run(
      `MATCH (m:Memory {memoryId: $memoryId, scopeKey: $scopeKey})
       WHERE m.tenantId = $tenantId AND m.subjectId = $subjectId AND m.purpose = $purpose
       RETURN m.canonicalIdentityKey AS canonicalIdentityKey, m.version AS version`,
      { ...this.parameters(), memoryId: input.memoryId }
    )
    if (result.records.length === 0) return false
    const identity = z
      .string()
      .parse(result.records[0]?.get('canonicalIdentityKey'))
    const version = z
      .number()
      .int()
      .positive()
      .safe()
      .parse(result.records[0]?.get('version'))
    const receiptId = randomUUID()
    const at = this.now().toISOString()
    const commandId = neo4jMemoryFingerprint([
      this.scopeKey,
      this.scope.requestId,
      'suppress',
      input.memoryId
    ])
    await this.assertAuthority()
    await this.transaction.run(
      `MATCH (m:Memory {memoryId: $memoryId, scopeKey: $scopeKey})
       CREATE (s:MemorySuppression {canonicalIdentityKey: $identity, scopeKey: $scopeKey,
         tenantId: $tenantId, subjectId: $subjectId, actorId: $actorId, purpose: $purpose,
         memoryId: $memoryId, receiptId: $receiptId, commandId: $commandId,
         requestedAt: $at, tombstonedAt: $at, reasonCode: $reasonCode,
         purgeStatus: 'suppression-only'})
       CREATE (m)-[:SUPPRESSED_BY]->(s)
       SET m.state = 'tombstoned', m.updatedAt = $at`,
      {
        ...this.parameters(),
        memoryId: input.memoryId,
        identity,
        receiptId,
        commandId,
        at,
        reasonCode: z.string().min(1).max(100).parse(input.reasonCode)
      }
    )
    await this.appendEvent(
      commandId,
      'memory.suppressed.v1',
      input.memoryId,
      version,
      at
    )
    return true
  }

  async readDeletionReceipt(
    memoryId: string
  ): Promise<MemoryDeletionReceipt | null> {
    this.requireOperation('delete')
    await this.assertAuthority()
    const result = await this.transaction.run(
      `MATCH (s:MemorySuppression {memoryId: $memoryId, scopeKey: $scopeKey})
       WHERE s.tenantId = $tenantId AND s.subjectId = $subjectId AND s.purpose = $purpose
       RETURN s.memoryId AS memoryId, s.receiptId AS receiptId, s.requestedAt AS requestedAt,
         s.tombstonedAt AS tombstonedAt, s.purgeStatus AS purgeStatus`,
      { ...this.parameters(), memoryId }
    )
    return result.records.length === 0
      ? null
      : MemoryDeletionReceiptSchema.parse({
          ...result.records[0]?.toObject(),
          purgeBy: null
        })
  }

  private async appendEvent(
    commandId: string,
    eventType: string,
    memoryId: string | null,
    version: number,
    at: string
  ): Promise<void> {
    const eventId = neo4jMemoryFingerprint([commandId, eventType])
    await this.transaction.run(
      `CREATE (l:MemoryLifecycleEvent {eventId: $eventId, scopeKey: $scopeKey,
         tenantId: $tenantId, subjectId: $subjectId, purpose: $purpose,
         memoryId: $memoryId, eventType: $eventType, version: $version, occurredAt: $at})
       CREATE (o:OutboxEvent {eventId: $eventId, scopeKey: $scopeKey,
         tenantId: $tenantId, subjectId: $subjectId, purpose: $purpose,
         memoryId: $memoryId, eventType: $eventType, aggregateVersion: $version,
         schemaVersion: 'memory-outbox-v1', status: 'pending', createdAt: $at,
         requestId: $requestId, attempts: 0})
       CREATE (l)-[:EMITS]->(o)`,
      {
        ...this.parameters(),
        eventId,
        eventType,
        memoryId,
        version,
        at,
        requestId: this.scope.requestId
      }
    )
  }
}
