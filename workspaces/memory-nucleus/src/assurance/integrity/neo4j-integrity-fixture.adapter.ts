import { createHash, randomUUID } from 'node:crypto'
import type { Driver } from 'neo4j-driver'
import type { MemoryRequestScope } from '@application/contracts'
import type { MemoryIntegrityStoreOperation } from '@application/integrity'

export interface MemoryIntegrityFixtureStore {
  readonly nonDefault: boolean
  identityDigest(scope: MemoryRequestScope): string
  register(scope: MemoryRequestScope): void
  poison(scope: MemoryRequestScope, memoryId: string, kind: 'assistant' | 'delegate'): Promise<void>
  conflict(scope: MemoryRequestScope, leftId: string, rightId: string): Promise<void>
  observe(scope: MemoryRequestScope, memoryId: string, operation: MemoryIntegrityStoreOperation): Promise<{ operation: MemoryIntegrityStoreOperation; matches: boolean }>
  restoreHead(scope: MemoryRequestScope, memoryId: string): Promise<void>
  reindex(): Promise<void>
  rebuild(scope: MemoryRequestScope): Promise<void>
  cleanup(scope: MemoryRequestScope): Promise<void>
}

/** Assurance-only mutations of disposable, isolated synthetic subjects. Never a serving adapter. */
export class Neo4jMemoryIntegrityFixtureStore implements MemoryIntegrityFixtureStore {
  readonly nonDefault: boolean
  private readonly trackedScopes = new Set<string>()

  constructor(private readonly options: {
    readonly driver: Driver
    readonly database: string
    readonly defaultDatabase: string
    readonly disposableSyntheticStore: true
  }) {
    if (!options.database || options.disposableSyntheticStore !== true) throw new Error('Disposable integrity store configuration required')
    this.nonDefault = options.database !== options.defaultDatabase
  }

  identityDigest(scope: MemoryRequestScope): string {
    return createHash('sha256').update(JSON.stringify([
      this.options.database, scope.tenantId, scope.subjectId, scope.purpose
    ])).digest('hex')
  }

  register(scope: MemoryRequestScope): void {
    this.trackedScopes.add(this.identityDigest(scope))
  }

  private async query(text: string, scope: MemoryRequestScope | null, parameters: Record<string, unknown> = {}) {
    if (scope !== null) this.trackedScopes.add(this.identityDigest(scope))
    const session = this.options.driver.session({ database: this.options.database })
    try {
      return await session.run(text, {
        ...parameters,
        ...(scope === null ? {} : { tenantId: scope.tenantId, subjectId: scope.subjectId, purpose: scope.purpose })
      })
    } finally {
      await session.close()
    }
  }

  async poison(scope: MemoryRequestScope, memoryId: string, kind: 'assistant' | 'delegate'): Promise<void> {
    const result = await this.query(
      `MATCH (m:Memory {memoryId: $memoryId, tenantId: $tenantId, subjectId: $subjectId})
       -[:HAS_VERSION]->(v:MemoryVersion)-[:SUPPORTED_BY]->(e:MemoryEvidence)
       WHERE m.currentVersionId = v.versionId
       SET e.sourceKind = $sourceKind, e.actorId = $actorId
       RETURN m.memoryId AS id`, scope,
      { memoryId, sourceKind: kind === 'assistant' ? 'assistant-text' : 'synthetic-transcript',
        actorId: kind === 'assistant' ? scope.actorId : randomUUID() }
    )
    if (result.records.length !== 1) throw new Error('Synthetic poison target missing in configured store')
  }

  async conflict(scope: MemoryRequestScope, leftId: string, rightId: string): Promise<void> {
    const result = await this.query(
      `MATCH (a:Memory {memoryId: $leftId, tenantId: $tenantId, subjectId: $subjectId})-[:HAS_VERSION]->(av:MemoryVersion)
       MATCH (b:Memory {memoryId: $rightId, tenantId: $tenantId, subjectId: $subjectId})-[:HAS_VERSION]->(bv:MemoryVersion)
       WHERE a.currentVersionId = av.versionId AND b.currentVersionId = bv.versionId
       RETURN av.semanticKey AS semanticKey, bv.recordJson AS recordJson`, scope, { leftId, rightId }
    )
    const row = result.records[0]
    if (!row || typeof row.get('recordJson') !== 'string' || typeof row.get('semanticKey') !== 'string') throw new Error('Synthetic conflict target missing')
    const record: unknown = JSON.parse(row.get('recordJson'))
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Synthetic conflict record invalid')
    await this.query(
      `MATCH (m:Memory {memoryId: $rightId, tenantId: $tenantId, subjectId: $subjectId})-[:HAS_VERSION]->(v:MemoryVersion)
       WHERE m.currentVersionId = v.versionId SET v.semanticKey = $key, v.recordJson = $json`, scope,
      { rightId, key: row.get('semanticKey'), json: JSON.stringify({ ...record, semanticKey: row.get('semanticKey') }) }
    )
  }

  async observe(scope: MemoryRequestScope, memoryId: string, operation: MemoryIntegrityStoreOperation) {
    const condition = operation === 'supersede' ? 'm.version >= 2' :
      ['suppress', 'replay', 'restore', 'reindex', 'rebuild'].includes(operation) ?
        'EXISTS { MATCH (:MemorySuppression {canonicalIdentityKey: m.canonicalIdentityKey}) }' : "m.state = 'active'"
    const result = await this.query(
      `MATCH (m:Memory {memoryId: $memoryId, tenantId: $tenantId, subjectId: $subjectId, purpose: $purpose})
       RETURN m.memoryId AS id, ${condition} AS valid`,
      scope, { memoryId }
    )
    return { operation, matches: result.records.length === 1 && result.records[0]?.get('valid') === true &&
      result.summary.database.name === this.options.database }
  }

  async restoreHead(scope: MemoryRequestScope, memoryId: string): Promise<void> {
    // Retain suppression and consent; this is not a whole-database rollback claim.
    await this.query(
      `MATCH (m:Memory {memoryId: $memoryId, tenantId: $tenantId, subjectId: $subjectId})-[:HAS_VERSION]->(v:MemoryVersion)
       WITH m, v ORDER BY v.version ASC LIMIT 1
       SET m.state = 'active', m.currentVersionId = v.versionId, m.version = v.version`, scope, { memoryId }
    )
  }

  async reindex(): Promise<void> {
    const result = await this.query(
      `SHOW INDEXES YIELD name, type, labelsOrTypes WHERE type = 'FULLTEXT' AND 'MemoryVersion' IN labelsOrTypes RETURN name`, null
    )
    const name: unknown = result.records[0]?.get('name')
    if (result.records.length !== 1 || typeof name !== 'string' || !/^[a-z0-9_]+$/.test(name)) throw new Error('Synthetic full-text index missing')
    const create = `CREATE FULLTEXT INDEX ${name} IF NOT EXISTS FOR (v:MemoryVersion) ON EACH [v.searchableText]
      OPTIONS {indexConfig: {\`fulltext.analyzer\`: 'standard-no-stop-words', \`fulltext.eventually_consistent\`: false}}`
    try {
      await this.query(`DROP INDEX ${name}`, null)
    } finally {
      await this.query(create, null)
      await this.query('CALL db.awaitIndexes(60)', null)
    }
  }

  async rebuild(scope: MemoryRequestScope): Promise<void> {
    // Reconstruct only derived search text from canonical versions, retaining the
    // consent/suppression ledger. This intentionally is not a database rollback.
    const result = await this.query(
      `MATCH (m:Memory {tenantId: $tenantId, subjectId: $subjectId, purpose: $purpose})-[:HAS_VERSION]->(v:MemoryVersion)
       RETURN v.versionId AS versionId, v.recordJson AS recordJson`, scope
    )
    const rows = result.records.map(row => {
      const encoded: unknown = row.get('recordJson')
      const versionId: unknown = row.get('versionId')
      if (typeof encoded !== 'string' || typeof versionId !== 'string') throw new Error('Synthetic rebuild source invalid')
      const record: unknown = JSON.parse(encoded)
      if (!record || typeof record !== 'object' || !('statement' in record) || typeof record.statement !== 'string') {
        throw new Error('Synthetic rebuild source invalid')
      }
      const key = 'semanticKey' in record && typeof record.semanticKey === 'string' ? record.semanticKey : ''
      return { versionId, searchableText: `${key} ${record.statement}`.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim() }
    })
    await this.query(
      `UNWIND $rows AS row
       MATCH (m:Memory {tenantId: $tenantId, subjectId: $subjectId, purpose: $purpose})-[:HAS_VERSION]->(v:MemoryVersion {versionId: row.versionId})
       SET v.searchableText = row.searchableText`, scope, { rows }
    )
  }

  async cleanup(scope: MemoryRequestScope): Promise<void> {
    if (!this.trackedScopes.has(this.identityDigest(scope))) return
    await this.query('MATCH (n) WHERE n.tenantId = $tenantId AND n.subjectId = $subjectId DETACH DELETE n', scope)
    this.trackedScopes.delete(this.identityDigest(scope))
  }
}
