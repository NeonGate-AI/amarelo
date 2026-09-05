import type { PostgresTransactionExecutor } from '@infrastructure/database'
import {
  ConsentLedgerPort,
  type AppendConsentEntryInput
} from '@application/ports'

export class PostgresConsentLedgerRepository extends ConsentLedgerPort {
  constructor(private readonly database: PostgresTransactionExecutor) {
    super()
  }

  async append(input: AppendConsentEntryInput): Promise<number> {
    return this.database.transaction(async (tx) => {
      const current = await tx.query<{ version: number }>(
        `select version
         from memory_nucleus.memory_consent_ledger
         where tenant_id = $1 and subject_id = $2 and purpose = $3 and capability = $4
         order by version desc
         limit 1
         for update`,
        [input.tenantId, input.subjectId, input.purpose, input.capability]
      )
      const currentVersion = current.rows[0]?.version ?? 0
      if (currentVersion !== input.expectedVersion) {
        throw new Error('consent ledger version conflict')
      }
      const nextVersion = currentVersion + 1
      await tx.query(
        `insert into memory_nucleus.memory_consent_ledger(
           tenant_id, subject_id, purpose, capability, status, resource_scope,
           policy_version, effective_at, version, source, evidence_ref
         ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)`,
        [
          input.tenantId,
          input.subjectId,
          input.purpose,
          input.capability,
          input.status,
          JSON.stringify(input.resourceScope),
          input.policyVersion,
          input.effectiveAt,
          nextVersion,
          input.source,
          input.evidenceRef ?? null
        ]
      )
      return nextVersion
    })
  }
}
