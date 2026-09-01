import type { PostgresTransactionExecutor } from '#infrastructure/database/postgres-executor'

import {
  CanonicalMemoryPort,
  type AcceptCandidateInput,
  type AcceptCandidateResult
} from '#application/ports/canonical-memory.port'

interface CandidateRow {
  candidate_id: string
  kind: 'semantic' | 'episodic'
  observed_at: Date
  occurred_at: Date | null
  temporal_precision:
    | 'approximate'
    | 'day'
    | 'exact'
    | 'life-period'
    | 'month'
    | 'year'
    | null
  temporal_reference: string | null
  uncertainty: string | null
  purpose_ids: string[]
  sensitivity: 'normal' | 'sensitive' | 'highly-sensitive'
  statement: string
  status: string
  subject_id: string
  tenant_id: string
  valid_from: Date | null
  valid_until: Date | null
}

export class PostgresCanonicalMemoryRepository extends CanonicalMemoryPort {
  constructor(private readonly database: PostgresTransactionExecutor) {
    super()
  }

  async acceptCandidate(
    input: AcceptCandidateInput
  ): Promise<AcceptCandidateResult> {
    if (input.viewIds.length === 0 || input.viewIds.length > 16) {
      throw new RangeError('viewIds must contain between 1 and 16 entries')
    }
    if (
      !Number.isFinite(input.confidence) ||
      input.confidence < 0 ||
      input.confidence > 1
    ) {
      throw new RangeError('canonical confidence must be between 0 and 1')
    }
    if (!input.category || input.category.length > 120) {
      throw new RangeError(
        'canonical category must contain between 1 and 120 characters'
      )
    }
    if (!input.commandId || input.commandId.length > 200) {
      throw new RangeError(
        'commandId must contain between 1 and 200 characters'
      )
    }
    if (!Number.isFinite(Date.parse(input.requestedAt))) {
      throw new TypeError('requestedAt must be a valid timestamp')
    }

    return this.database.transaction(async (tx) => {
      const existing = (
        await tx.query<{
          candidate_id: string
          policy_version: string
          target_memory_id: string
          target_version: number
        }>(
          `select candidate_id, policy_version, target_memory_id, target_version
           from memory_nucleus.memory_candidate_resolutions
           where command_id = $1`,
          [input.commandId]
        )
      ).rows[0]

      if (existing) {
        if (
          existing.candidate_id !== input.candidateId ||
          existing.policy_version !== input.policyVersion
        ) {
          throw new Error('canonical resolution command id collision')
        }
        const version = (
          await tx.query<{ version_id: string }>(
            `select version_id from memory_nucleus.memory_versions
             where memory_id = $1::uuid and version = $2`,
            [existing.target_memory_id, existing.target_version]
          )
        ).rows[0]
        if (!version)
          throw new Error('canonical resolution points to a missing version')
        return Object.freeze({
          memoryId: existing.target_memory_id,
          version: existing.target_version,
          versionId: version.version_id
        })
      }

      const candidate = (
        await tx.query<CandidateRow>(
          `select candidate_id, tenant_id, subject_id, kind, statement, purpose_ids,
                  sensitivity, observed_at, occurred_at, temporal_precision,
                  temporal_reference, uncertainty, valid_from, valid_until, status
           from memory_nucleus.memory_candidates
           where candidate_id = $1::uuid
           for update`,
          [input.candidateId]
        )
      ).rows[0]

      if (!candidate) throw new Error('memory candidate does not exist')
      if (candidate.status !== 'candidate') {
        throw new Error(
          `memory candidate is not eligible for acceptance: ${candidate.status}`
        )
      }
      if (candidate.kind === 'semantic' && !input.canonicalKey) {
        throw new Error('semantic canonical acceptance requires canonicalKey')
      }

      const canonicalKey =
        input.canonicalKey ?? `episode:${candidate.candidate_id}`

      let memoryId = (
        await tx.query<{ memory_id: string }>(
          `select memory_id from memory_nucleus.memories
           where tenant_id = $1::uuid and subject_id = $2::uuid and kind = $3 and canonical_key = $4
           for update`,
          [
            candidate.tenant_id,
            candidate.subject_id,
            candidate.kind,
            canonicalKey
          ]
        )
      ).rows[0]?.memory_id

      if (!memoryId) {
        memoryId = (
          await tx.query<{ memory_id: string }>(
            `insert into memory_nucleus.memories(tenant_id, subject_id, kind, canonical_key)
             values ($1::uuid, $2::uuid, $3, $4)
             returning memory_id`,
            [
              candidate.tenant_id,
              candidate.subject_id,
              candidate.kind,
              canonicalKey
            ]
          )
        ).rows[0]?.memory_id
      }
      if (!memoryId)
        throw new Error('canonical memory identity was not created')

      const previous = (
        await tx.query<{ version_id: string; version: number }>(
          `select v.version_id, v.version
           from memory_nucleus.memory_versions v
           join memory_nucleus.memory_lifecycle_heads h on h.active_version_id = v.version_id
           where h.memory_id = $1::uuid
           for update`,
          [memoryId]
        )
      ).rows[0]
      const nextVersion = (previous?.version ?? 0) + 1

      const version = (
        await tx.query<{ version_id: string; version: number }>(
          `insert into memory_nucleus.memory_versions(
             memory_id, version, tenant_id, subject_id, category, statement,
             semantic_key, confidence, purpose_ids, view_ids, sensitivity,
             observed_at, occurred_at, temporal_precision, temporal_reference,
             valid_from, valid_until, uncertainty, provenance, supersedes_version_id
           ) values (
             $1::uuid, $2, $3::uuid, $4::uuid, $5, $6, $7, $8,
             $9::text[], $10::text[], $11, $12, $13, $14, $15, $16, $17, $18,
             jsonb_build_object(
               'sourceArtifactIds', coalesce((
                 select jsonb_agg(e.source_artifact_id order by e.source_artifact_id)
                 from memory_nucleus.memory_candidate_evidence ce
                 join memory_nucleus.memory_evidence e on e.evidence_id = ce.evidence_id
                 where ce.candidate_id = $19::uuid
               ), '[]'::jsonb),
               'authorId', 'memory-nucleus',
               'authorType', 'service',
               'createdAt', to_char(clock_timestamp(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
               'transformationId', $20
             ),
             $21::uuid
           )
           returning version_id, version`,
          [
            memoryId,
            nextVersion,
            candidate.tenant_id,
            candidate.subject_id,
            input.category,
            candidate.statement,
            candidate.kind === 'semantic' ? input.canonicalKey : null,
            input.confidence,
            candidate.purpose_ids,
            [...input.viewIds],
            candidate.sensitivity,
            candidate.observed_at,
            candidate.occurred_at,
            candidate.temporal_precision,
            candidate.temporal_reference,
            candidate.valid_from,
            candidate.valid_until,
            candidate.uncertainty,
            candidate.candidate_id,
            input.policyVersion,
            previous?.version_id ?? null
          ]
        )
      ).rows[0]
      if (!version) throw new Error('canonical memory version was not created')

      await tx.query(
        `insert into memory_nucleus.memory_version_evidence(version_id, evidence_id)
         select $1::uuid, evidence_id from memory_nucleus.memory_candidate_evidence
         where candidate_id = $2::uuid`,
        [version.version_id, candidate.candidate_id]
      )

      await tx.query(
        `insert into memory_nucleus.memory_lifecycle_heads(memory_id, active_version_id, state)
         values ($1::uuid, $2::uuid, 'active')
         on conflict (memory_id) do update
         set active_version_id = excluded.active_version_id,
             state = 'active',
             superseded_by_memory_id = null,
             expires_at = null,
             tombstoned_at = null,
             updated_at = clock_timestamp()`,
        [memoryId, version.version_id]
      )

      await tx.query(
        `insert into memory_nucleus.memory_search_projections(
           memory_id, version_id, tenant_id, subject_id, kind, category,
           semantic_key, searchable_text, purpose_ids, view_ids, sensitivity,
           lifecycle, observed_at, occurred_at, temporal_precision, temporal_reference,
           valid_from, valid_until, provenance
         )
         select memory_id, version_id, tenant_id, subject_id, $3, category,
                semantic_key, statement, purpose_ids, view_ids, sensitivity,
                'accepted', observed_at, occurred_at, temporal_precision, temporal_reference,
                valid_from, valid_until, provenance
         from memory_nucleus.memory_versions where version_id = $2::uuid
         on conflict (memory_id) do update
         set version_id = excluded.version_id,
             searchable_text = excluded.searchable_text,
             purpose_ids = excluded.purpose_ids,
             view_ids = excluded.view_ids,
             sensitivity = excluded.sensitivity,
             lifecycle = 'accepted',
             observed_at = excluded.observed_at,
             occurred_at = excluded.occurred_at,
             temporal_precision = excluded.temporal_precision,
             temporal_reference = excluded.temporal_reference,
             valid_from = excluded.valid_from,
             valid_until = excluded.valid_until,
             provenance = excluded.provenance,
             updated_at = clock_timestamp()`,
        [memoryId, version.version_id, candidate.kind]
      )

      await tx.query(
        `update memory_nucleus.memory_candidates set status = 'accepted'
         where candidate_id = $1::uuid and status = 'candidate'`,
        [candidate.candidate_id]
      )

      await tx.query(
        `insert into memory_nucleus.memory_candidate_resolutions(
           candidate_id, command_id, decision, target_memory_id, target_version,
           policy_version, requested_at
         ) values ($1::uuid, $2, $3, $4::uuid, $5, $6, $7::timestamptz)`,
        [
          candidate.candidate_id,
          input.commandId,
          previous ? 'merge' : 'accept',
          memoryId,
          nextVersion,
          input.policyVersion,
          input.requestedAt
        ]
      )

      await tx.query(
        `insert into memory_nucleus.memory_lifecycle_events(memory_id, event_type)
         values ($1::uuid, 'activated')`,
        [memoryId]
      )

      return Object.freeze({
        memoryId,
        version: version.version,
        versionId: version.version_id
      })
    })
  }

  async tombstoneMemory(input: {
    memoryId: string
    tenantId: string
    subjectId: string
    reasonCode: string
  }): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      const result = await tx.query(
        `update memory_nucleus.memory_lifecycle_heads h
         set state = 'tombstoned', tombstoned_at = clock_timestamp(), updated_at = clock_timestamp()
         from memory_nucleus.memories m
         where h.memory_id = m.memory_id
           and m.memory_id = $1::uuid and m.tenant_id = $2::uuid and m.subject_id = $3::uuid
           and h.state <> 'tombstoned'`,
        [input.memoryId, input.tenantId, input.subjectId]
      )
      if (result.rowCount !== 1) return false

      await tx.query(
        `update memory_nucleus.memory_search_projections
         set lifecycle = 'tombstoned', searchable_text = '[deleted]', updated_at = clock_timestamp()
         where memory_id = $1::uuid`,
        [input.memoryId]
      )
      await tx.query(
        `insert into memory_nucleus.memory_lifecycle_events(memory_id, event_type, reason_code)
         values ($1::uuid, 'tombstoned', $2)`,
        [input.memoryId, input.reasonCode]
      )
      return true
    })
  }
}
