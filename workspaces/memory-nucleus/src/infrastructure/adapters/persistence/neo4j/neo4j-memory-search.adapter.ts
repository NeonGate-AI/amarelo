import { int, type ManagedTransaction } from 'neo4j-driver'
import type { MemoryRequestScope } from '@application/contracts'
import {
  ScopedMemoryRepository,
  type AuthorizedRepositorySearch,
  type RepositorySearchResult
} from '@application/ports'
import { lexicalMemoryTokens } from '@application/use-cases'
import { NEO4J_MEMORY_FULLTEXT_INDEX } from '@infrastructure/database/neo4j'
import {
  parseNeo4jMemoryRecord,
  toNeo4jRepositoryMemoryRecord
} from './neo4j-memory-record.map'

export class Neo4jScopedMemoryRepository extends ScopedMemoryRepository {
  constructor(
    private readonly transaction: ManagedTransaction,
    private readonly scope: MemoryRequestScope,
    private readonly scopeKey: string,
    private readonly consentVersion: number,
    private readonly decisionId: string,
    private readonly asOf: string,
    private readonly now: () => Date,
    private readonly assertAuthority: () => Promise<void>
  ) {
    super()
  }

  async searchAuthorized(
    search: AuthorizedRepositorySearch
  ): Promise<RepositorySearchResult> {
    await this.assertAuthority()
    if (
      search.tenantId !== this.scope.tenantId ||
      search.subjectId !== this.scope.subjectId ||
      search.purpose !== this.scope.purpose ||
      search.authorizationDecisionId !== this.decisionId ||
      search.viewId !== 'personal' ||
      search.requiredLifecycle !== 'accepted' ||
      search.requiredProvenance !== true ||
      search.vectorFallback !== false
    )
      throw new Error('Memory repository scope is not authorized')

    // Only normalized letter/number tokens reach Lucene; user query syntax is never executed.
    const tokens = [...lexicalMemoryTokens(search.queryText)]
    const lexicalQuery = tokens.map((token) => `"${token}"`).join(' OR ')
    const exactCandidates = `MATCH (v:MemoryVersion {scopeKey: $scopeKey, kind: 'semantic'})
      WHERE v.semanticKey IN $semanticKeys RETURN v, 0.0 AS score`
    const candidates =
      tokens.length === 0
        ? exactCandidates
        : `CALL db.index.fulltext.queryNodes($index, $lexicalQuery) YIELD node, score
       RETURN node AS v, score UNION ${exactCandidates}`
    const records = []
    let fullTextCalls = 0
    for (const kind of search.kinds) {
      const limit =
        kind === 'semantic'
          ? search.candidateLimits.maxSemanticCandidates
          : search.candidateLimits.maxEpisodicCandidates
      if (
        limit === 0 ||
        (tokens.length === 0 && search.semanticKeys.length === 0)
      )
        continue
      if (tokens.length > 0) fullTextCalls += 1
      const result = await this.transaction.run(
        `CALL { ${candidates} }
         MATCH (m:Memory {scopeKey: $scopeKey})-[:HAS_VERSION]->(v)
         MATCH (h:MemoryConsentHead {scopeKey: $scopeKey})
         WHERE h.tenantId = $tenantId AND h.subjectId = $subjectId
           AND h.purpose = $purpose AND h.status = 'granted' AND h.version = $consentVersion
           AND $actorId = $subjectId AND $expiresAtMs > $nowMs
           AND m.tenantId = $tenantId AND m.subjectId = $subjectId AND m.purpose = $purpose
           AND m.state = 'active' AND m.currentVersionId = v.versionId
           AND v.tenantId = $tenantId AND v.subjectId = $subjectId AND v.purpose = $purpose
           AND v.kind = $kind AND v.category IN $categories AND $viewId IN v.viewIds
           AND v.sensitivity IN $sensitivities
           AND v.authorId = $subjectId AND v.sourceArtifactId IS NOT NULL
           AND size(v.statement) <= $maxRecordCharacters
           AND size(v.recordJson) <= $maxSerializedRecordCharacters
           AND datetime(v.observedAt) <= datetime($asOf)
           AND NOT EXISTS {
             MATCH (:MemorySuppression {canonicalIdentityKey: m.canonicalIdentityKey})
           }
           AND EXISTS {
             MATCH (v)-[:SUPPORTED_BY]->(e:MemoryEvidence {scopeKey: $scopeKey})
             WHERE e.tenantId = $tenantId AND e.subjectId = $subjectId AND e.actorId = $actorId
               AND e.eligible = true AND e.contentHash = v.evidenceHash
               AND e.evidenceId = v.sourceArtifactId
               AND e.sourceKind IN ['development-text', 'synthetic-transcript']
           }
           AND (
             (v.kind = 'semantic'
               AND (v.validFrom IS NULL OR datetime(v.validFrom) <= datetime($asOf))
               AND (v.validUntil IS NULL OR datetime(v.validUntil) > datetime($asOf))
               AND ($fromInclusive IS NULL OR v.validUntil IS NULL OR datetime(v.validUntil) > datetime($fromInclusive))
               AND ($toExclusive IS NULL OR v.validFrom IS NULL OR datetime(v.validFrom) < datetime($toExclusive)))
             OR (v.kind = 'episodic' AND (
               (v.occurredAt IS NULL AND $fromInclusive IS NULL AND $toExclusive IS NULL)
               OR (v.occurredAt IS NOT NULL AND datetime(v.occurredAt) <= datetime($asOf)
                 AND ($fromInclusive IS NULL OR datetime(v.occurredAt) >= datetime($fromInclusive))
                 AND ($toExclusive IS NULL OR datetime(v.occurredAt) < datetime($toExclusive))))
           ))
         WITH DISTINCT v, CASE WHEN v.semanticKey IN $semanticKeys THEN 1 ELSE 0 END AS exact,
              max(score) AS score
         RETURN v.recordJson AS record
         ORDER BY exact DESC, score DESC, v.observedAt DESC, v.memoryId
         LIMIT $limit`,
        {
          scopeKey: this.scopeKey,
          tenantId: this.scope.tenantId,
          subjectId: this.scope.subjectId,
          actorId: this.scope.actorId,
          purpose: this.scope.purpose,
          expiresAtMs: this.scope.expiresAtMs,
          nowMs: this.now().getTime(),
          consentVersion: this.consentVersion,
          index: NEO4J_MEMORY_FULLTEXT_INDEX,
          lexicalQuery,
          semanticKeys: [...search.semanticKeys],
          kind,
          categories: [...search.categories],
          viewId: search.viewId,
          sensitivities: [...search.sensitivities],
          maxRecordCharacters: search.candidateLimits.maxRecordCharacters,
          maxSerializedRecordCharacters:
            search.candidateLimits.maxSerializedRecordCharacters,
          fromInclusive: search.timeWindow.fromInclusive,
          toExclusive: search.timeWindow.toExclusive,
          asOf: this.asOf,
          limit: int(limit)
        }
      )
      for (const row of result.records) {
        records.push(
          toNeo4jRepositoryMemoryRecord(
            parseNeo4jMemoryRecord(row.get('record'), this.scope),
            this.scope
          )
        )
      }
    }
    await this.assertAuthority()
    return {
      authorizationDecisionId: this.decisionId,
      records,
      diagnostics: {
        authorizedRowsConsidered: records.length,
        fullTextCalls,
        fullTextSearchUsed: fullTextCalls > 0,
        matchedRows: records.length,
        vectorCalls: 0
      }
    }
  }
}
