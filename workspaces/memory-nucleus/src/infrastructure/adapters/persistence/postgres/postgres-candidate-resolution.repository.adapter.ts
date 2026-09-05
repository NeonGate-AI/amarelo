import type { PostgresTransactionExecutor } from '@infrastructure/database'
import {
  CandidateResolutionPort,
  type ResolveNoncanonicalCandidateInput
} from '@application/ports'

export class PostgresCandidateResolutionRepository extends CandidateResolutionPort {
  constructor(private readonly database: PostgresTransactionExecutor) {
    super()
  }

  async resolve(input: ResolveNoncanonicalCandidateInput): Promise<string> {
    return this.database.transaction(async (tx) => {
      const existing = (
        await tx.query<{
          resolution_id: string
          candidate_id: string
          decision: string
        }>(
          `select resolution_id, candidate_id, decision
           from memory_nucleus.memory_candidate_resolutions
           where command_id = $1`,
          [input.commandId]
        )
      ).rows[0]
      if (existing) {
        if (
          existing.candidate_id !== input.candidateId ||
          existing.decision !== input.decision
        ) {
          throw new Error('candidate resolution command id collision')
        }
        return existing.resolution_id
      }

      const status =
        input.decision === 'discard'
          ? 'discarded'
          : input.decision === 'quarantine'
            ? 'quarantined'
            : 'conflict'

      const updated = await tx.query(
        `update memory_nucleus.memory_candidates
         set status = $2
         where candidate_id = $1::uuid and status = 'candidate'`,
        [input.candidateId, status]
      )
      if (updated.rowCount !== 1) {
        throw new Error(
          'memory candidate is not eligible for noncanonical resolution'
        )
      }

      const result = await tx.query<{ resolution_id: string }>(
        `insert into memory_nucleus.memory_candidate_resolutions(
           candidate_id, command_id, decision, policy_version, requested_at,
           reason_code, conflict_type
         ) values ($1::uuid, $2, $3, $4, $5::timestamptz, $6, $7)
         returning resolution_id`,
        [
          input.candidateId,
          input.commandId,
          input.decision,
          input.policyVersion,
          input.requestedAt,
          input.reasonCode ?? null,
          input.conflictType ?? null
        ]
      )
      const id = result.rows[0]?.resolution_id
      if (!id) throw new Error('candidate resolution receipt was not created')
      return id
    })
  }
}
