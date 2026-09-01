import {
  MemoryPersistenceClient,
  type SaveCurationRunRequest,
  type SaveCurationRunResult,
  type SourceClaimRequest,
  type SourceClaimResult
} from '@application/ports/memory-curation-persistence.port'
import {
  SaveCurationRunRequestSchema,
  SourceClaimRequestSchema
} from '@application/ports/memory-curation-persistence.port'
import type {
  PostgresExecutor,
  PostgresTransactionExecutor
} from '@infrastructure/database'

const DEFAULT_CLAIM_TTL_SECONDS = 300

function confidenceLevelScore(level: 'low' | 'medium' | 'high'): number {
  if (level === 'low') return 0.25
  if (level === 'medium') return 0.5
  return 0.75
}

function candidateCategory(tags: readonly string[]): string {
  return tags[0]?.slice(0, 120) || 'uncategorized'
}

async function assertCurrentPersistAuthority(
  tx: PostgresExecutor,
  input: SaveCurationRunRequest
): Promise<void> {
  const authorization = (
    await tx.query<{ decision: 'allow' | 'deny' | 'revoked' }>(
      `select decision
       from memory_nucleus.memory_authorization_decisions
       where authorization_decision_id = $1::uuid
         and tenant_id = $2::uuid
         and subject_id = $3::uuid
         and actor_id = $4
         and purpose = $5
         and operation = 'persist'
         and expires_at > clock_timestamp()
       limit 1`,
      [
        input.authorizationDecisionId,
        input.tenantId,
        input.subjectId,
        input.actorId,
        input.purpose
      ]
    )
  ).rows[0]

  if (!authorization || authorization.decision !== 'allow') {
    throw new Error('memory curation authorization is no longer active')
  }

  const consent = (
    await tx.query<{ status: 'granted' | 'revoked' }>(
      `select status
       from memory_nucleus.memory_consent_ledger
       where tenant_id = $1::uuid
         and subject_id = $2::uuid
         and purpose = $3
         and capability = 'persist'
         and effective_at <= clock_timestamp()
       order by effective_at desc, version desc
       limit 1`,
      [input.tenantId, input.subjectId, input.purpose]
    )
  ).rows[0]

  if (consent?.status === 'revoked') {
    throw new Error('memory persistence consent has been revoked')
  }
}

/**
 * MVP persistence adapter. It keeps idempotent source claiming to avoid paying
 * twice for the same extraction, but deliberately avoids multi-worker leasing, fencing tokens, outbox delivery and dead-letter infrastructure.
 */
export class PostgresMemoryCurationAdapter extends MemoryPersistenceClient {
  constructor(
    private readonly database: PostgresTransactionExecutor,
    private readonly claimTtlSeconds = DEFAULT_CLAIM_TTL_SECONDS
  ) {
    super()
    if (
      !Number.isSafeInteger(claimTtlSeconds) ||
      claimTtlSeconds < 1 ||
      claimTtlSeconds > 3600
    ) {
      throw new RangeError('claimTtlSeconds must be between 1 and 3600')
    }
  }

  async claimSource(rawInput: SourceClaimRequest): Promise<SourceClaimResult> {
    const input = SourceClaimRequestSchema.parse(rawInput)

    return this.database.transaction(async (tx) => {
      const existing = (
        await tx.query<{
          claim_id: string
          status: 'claimed' | 'completed'
          expires_at: Date
          completed_run_id: string | null
        }>(
          `select claim_id, status, expires_at, completed_run_id
           from memory_nucleus.memory_curation_claims
           where tenant_id = $1::uuid and subject_id = $2::uuid and idempotency_key = $3
           for update`,
          [input.tenantId, input.subjectId, input.idempotencyKey]
        )
      ).rows[0]

      if (existing?.status === 'completed' && existing.completed_run_id) {
        return Object.freeze({
          claimExpiresAt: null,
          claimId: null,
          runId: existing.completed_run_id,
          status: 'duplicate' as const
        })
      }

      if (
        existing?.status === 'claimed' &&
        existing.expires_at.getTime() > Date.now()
      ) {
        return Object.freeze({
          claimExpiresAt: existing.expires_at.toISOString(),
          claimId: null,
          runId: null,
          status: 'in-progress' as const
        })
      }

      const row = existing
        ? (
            await tx.query<{ claim_id: string; expires_at: Date }>(
              `update memory_nucleus.memory_curation_claims
               set status = 'claimed',
                   expires_at = clock_timestamp() + make_interval(secs => $2),
                   completed_run_id = null,
                   source_fingerprint = $3,
                   updated_at = clock_timestamp()
               where claim_id = $1::uuid
               returning claim_id, expires_at`,
              [existing.claim_id, this.claimTtlSeconds, input.sourceFingerprint]
            )
          ).rows[0]
        : (
            await tx.query<{ claim_id: string; expires_at: Date }>(
              `insert into memory_nucleus.memory_curation_claims(
                 tenant_id, subject_id, idempotency_key, source_fingerprint,
                 status, expires_at
               ) values (
                 $1::uuid, $2::uuid, $3, $4, 'claimed',
                 clock_timestamp() + make_interval(secs => $5)
               )
               returning claim_id, expires_at`,
              [
                input.tenantId,
                input.subjectId,
                input.idempotencyKey,
                input.sourceFingerprint,
                this.claimTtlSeconds
              ]
            )
          ).rows[0]

      if (!row) throw new Error('memory curation claim was not created')

      return Object.freeze({
        claimExpiresAt: row.expires_at.toISOString(),
        claimId: row.claim_id,
        runId: null,
        status: 'claimed' as const
      })
    })
  }

  async saveCurationRun(
    rawInput: SaveCurationRunRequest
  ): Promise<SaveCurationRunResult> {
    const input = SaveCurationRunRequestSchema.parse(rawInput)

    return this.database.transaction(async (tx) => {
      await assertCurrentPersistAuthority(tx, input)

      const claim = (
        await tx.query<{
          status: 'claimed' | 'completed'
          expires_at: Date
          completed_run_id: string | null
        }>(
          `select status, expires_at, completed_run_id
           from memory_nucleus.memory_curation_claims
           where claim_id = $1::uuid
             and tenant_id = $2::uuid
             and subject_id = $3::uuid
             and idempotency_key = $4
           for update`,
          [input.claimId, input.tenantId, input.subjectId, input.idempotencyKey]
        )
      ).rows[0]

      if (!claim) {
        return Object.freeze({
          candidateIds: [],
          runId: null,
          status: 'claim-lost' as const
        })
      }

      if (claim.status === 'completed' && claim.completed_run_id) {
        const existingCandidates = await tx.query<{ candidate_id: string }>(
          `select candidate_id
           from memory_nucleus.memory_candidates
           where curation_run_id = $1::uuid
           order by created_at, candidate_id`,
          [claim.completed_run_id]
        )
        return Object.freeze({
          candidateIds: existingCandidates.rows.map((row) => row.candidate_id),
          runId: claim.completed_run_id,
          status: 'completed' as const
        })
      }

      if (claim.expires_at.getTime() <= Date.now()) {
        return Object.freeze({
          candidateIds: [],
          runId: null,
          status: 'claim-lost' as const
        })
      }

      const run = (
        await tx.query<{ run_id: string }>(
          `insert into memory_nucleus.memory_curation_runs(
             tenant_id, subject_id, idempotency_key, source_fingerprint, outcome, usage
           ) values ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb)
           returning run_id`,
          [
            input.tenantId,
            input.subjectId,
            input.idempotencyKey,
            input.sourceFingerprint,
            input.candidates.length === 0 ? 'no-memory' : 'completed',
            JSON.stringify(input.usage)
          ]
        )
      ).rows[0]

      if (!run) throw new Error('memory curation run was not created')

      const candidateIds: string[] = []
      for (const candidate of input.candidates) {
        const inserted = (
          await tx.query<{ candidate_id: string }>(
            `insert into memory_nucleus.memory_candidates(
               curation_run_id, tenant_id, subject_id, kind, category, statement,
               semantic_key, confidence, confidence_level, status, purpose_ids,
               purpose, sensitivity, observed_at, occurred_at, temporal_precision,
               temporal_reference, valid_from, valid_until, uncertainty, tags,
               actor_id, authorization_decision_id, candidate_fingerprint
             ) values (
               $1::uuid, $2::uuid, $3::uuid, $4, $5, $6,
               null, $7, $8, 'candidate', ARRAY[$9]::text[],
               $9, 'sensitive', $10, $11, $12, $13, $14, null, $15,
               $16::text[], $17, $18::uuid, $19
             )
             returning candidate_id`,
            [
              run.run_id,
              input.tenantId,
              input.subjectId,
              candidate.kind,
              candidateCategory(candidate.tags),
              candidate.statement,
              confidenceLevelScore(candidate.confidence),
              candidate.confidence,
              input.purpose,
              candidate.createdAt,
              candidate.occurredAt,
              candidate.temporalPrecision,
              candidate.temporalReference,
              candidate.validFrom,
              candidate.uncertainty,
              [...candidate.tags],
              input.actorId,
              input.authorizationDecisionId,
              candidate.candidateFingerprint
            ]
          )
        ).rows[0]

        if (!inserted) throw new Error('memory candidate was not persisted')
        candidateIds.push(inserted.candidate_id)

        for (const sourceTurnId of candidate.provenance.sourceTurnIds) {
          const evidence = (
            await tx.query<{ evidence_id: string }>(
              `with inserted as (
                 insert into memory_nucleus.memory_evidence(
                   tenant_id, subject_id, source_type, source_artifact_id,
                   content_hash, observed_at
                 ) values ($1::uuid, $2::uuid, 'conversation', $3, $4, $5)
                 on conflict (tenant_id, subject_id, source_type, source_artifact_id, content_hash)
                 do nothing
                 returning evidence_id
               )
               select evidence_id from inserted
               union all
               select evidence_id from memory_nucleus.memory_evidence
               where tenant_id = $1::uuid and subject_id = $2::uuid
                 and source_type = 'conversation' and source_artifact_id = $3 and content_hash = $4
               limit 1`,
              [
                input.tenantId,
                input.subjectId,
                sourceTurnId,
                candidate.provenance.sourceFingerprint,
                candidate.createdAt
              ]
            )
          ).rows[0]
          if (!evidence) throw new Error('memory evidence was not materialized')
          await tx.query(
            `insert into memory_nucleus.memory_candidate_evidence(candidate_id, evidence_id)
             values ($1::uuid, $2::uuid)`,
            [inserted.candidate_id, evidence.evidence_id]
          )
        }
      }

      await tx.query(
        `update memory_nucleus.memory_curation_claims
         set status = 'completed', completed_run_id = $2::uuid, updated_at = clock_timestamp()
         where claim_id = $1::uuid`,
        [input.claimId, run.run_id]
      )

      return Object.freeze({
        candidateIds,
        runId: run.run_id,
        status: 'completed' as const
      })
    })
  }
}
