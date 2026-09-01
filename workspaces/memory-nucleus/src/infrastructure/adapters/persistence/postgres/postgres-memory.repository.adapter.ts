import { ScopedMemoryRepository } from '#application/ports/memory-repository.port'
import type { PostgresExecutor } from '#infrastructure/database/postgres-executor'
import type {
  AuthorizedRepositorySearch,
  RepositoryMemoryRecord,
  RepositorySearchResult
} from '#application/ports/memory-repository.port'

interface SearchRow {
  category: string
  kind: 'semantic' | 'episodic'
  lifecycle: 'accepted'
  memory_id: string
  observed_at: Date
  occurred_at: Date | null
  provenance: {
    sourceArtifactIds?: string[]
    authorId?: string
    authorType?:
      | 'authorized-delegate'
      | 'imported-source'
      | 'service'
      | 'subject'
    createdAt?: string
    transformationId?: string | null
  }
  purpose_ids: string[]
  semantic_key: string | null
  searchable_text: string
  sensitivity: 'normal' | 'sensitive' | 'highly-sensitive'
  subject_id: string
  temporal_precision:
    | 'approximate'
    | 'day'
    | 'exact'
    | 'life-period'
    | 'month'
    | 'year'
    | null
  temporal_reference: string | null
  tenant_id: string
  valid_from: Date | null
  valid_until: Date | null
  view_ids: string[]
}

function asIso(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

function mapProvenance(
  row: SearchRow
): NonNullable<RepositoryMemoryRecord['provenance']> {
  const provenance = row.provenance ?? {}
  return Object.freeze({
    sourceArtifactIds: Object.freeze([...(provenance.sourceArtifactIds ?? [])]),
    authorId: provenance.authorId ?? 'unknown',
    authorType: provenance.authorType ?? 'service',
    createdAt: provenance.createdAt ?? row.observed_at.toISOString(),
    transformationId: provenance.transformationId ?? null
  })
}

function mapRow(row: SearchRow): RepositoryMemoryRecord {
  const base = {
    id: row.memory_id,
    tenantId: row.tenant_id,
    subjectId: row.subject_id,
    purposes: Object.freeze([...row.purpose_ids]),
    viewIds: Object.freeze([...row.view_ids]),
    category: row.category,
    lifecycle: row.lifecycle,
    text: row.searchable_text,
    observedAt: row.observed_at.toISOString(),
    provenance: mapProvenance(row),
    sensitivity: row.sensitivity,
    supersededById: null
  } as const

  if (row.kind === 'semantic') {
    return Object.freeze({
      ...base,
      kind: 'semantic' as const,
      semanticKey: row.semantic_key,
      validFrom: asIso(row.valid_from),
      validUntil: asIso(row.valid_until)
    })
  }

  if (row.temporal_precision === 'exact' && row.occurred_at !== null) {
    return Object.freeze({
      ...base,
      kind: 'episodic' as const,
      semanticKey: null,
      occurredAt: row.occurred_at.toISOString(),
      temporalPrecision: 'exact' as const,
      temporalReference: null
    })
  }

  return Object.freeze({
    ...base,
    kind: 'episodic' as const,
    semanticKey: null,
    occurredAt: null,
    temporalPrecision:
      row.temporal_precision && row.temporal_precision !== 'exact'
        ? row.temporal_precision
        : 'approximate',
    temporalReference: row.temporal_reference ?? 'unspecified time'
  })
}

export class PostgresScopedMemoryRepository extends ScopedMemoryRepository {
  constructor(private readonly database: PostgresExecutor) {
    super()
  }

  async searchAuthorized(
    search: AuthorizedRepositorySearch
  ): Promise<RepositorySearchResult> {
    const maxCandidates =
      search.candidateLimits.maxSemanticCandidates +
      search.candidateLimits.maxEpisodicCandidates

    const result = await this.database.query<SearchRow>(
      `select
         memory_id, tenant_id, subject_id, kind, category, semantic_key,
         searchable_text, purpose_ids, view_ids, sensitivity, lifecycle, observed_at,
         occurred_at, temporal_precision, temporal_reference,
         valid_from, valid_until, provenance
       from memory_nucleus.memory_search_projections
       where tenant_id = $1
         and subject_id = $2
         and lifecycle = 'accepted'
         and $3 = any(purpose_ids)
         and $4 = any(view_ids)
         and kind = any($5::text[])
         and sensitivity = any($11::text[])
         and (cardinality($6::text[]) = 0 or category = any($6::text[]))
         and (
           (kind = 'semantic'
             and ($7::timestamptz is null or valid_until is null or valid_until > $7::timestamptz)
             and ($8::timestamptz is null or valid_from is null or valid_from < $8::timestamptz))
           or
           (kind = 'episodic'
             and ($7::timestamptz is null or coalesce(occurred_at, observed_at) >= $7::timestamptz)
             and ($8::timestamptz is null or coalesce(occurred_at, observed_at) < $8::timestamptz))
         )
         and (
           (cardinality($9::text[]) > 0 and semantic_key = any($9::text[]))
           or search_vector @@ websearch_to_tsquery('simple', $10)
         )
       order by
         case when semantic_key = any($9::text[]) then 0 else 1 end,
         ts_rank_cd(search_vector, websearch_to_tsquery('simple', $10)) desc,
         observed_at desc,
         memory_id
       limit $12`,
      [
        search.tenantId,
        search.subjectId,
        search.purpose,
        search.viewId,
        [...search.kinds],
        [...search.categories],
        search.timeWindow.fromInclusive,
        search.timeWindow.toExclusive,
        [...search.semanticKeys],
        search.queryText,
        [...search.sensitivities],
        maxCandidates
      ]
    )

    return Object.freeze({
      authorizationDecisionId: search.authorizationDecisionId,
      records: Object.freeze(result.rows.map(mapRow)),
      diagnostics: Object.freeze({
        authorizedRowsConsidered: result.rowCount,
        matchedRows: result.rowCount,
        vectorCalls: 0
      })
    })
  }
}
