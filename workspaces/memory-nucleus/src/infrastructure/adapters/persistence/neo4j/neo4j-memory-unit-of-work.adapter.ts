import type { Driver, ManagedTransaction } from 'neo4j-driver'
import { z } from 'zod'
import type { MemoryRequestScope } from '@application/contracts'
import {
  OperationalMemoryUnitOfWork,
  type MemoryRetrievalObserver,
  type OperationalMemoryOperation,
  type OperationalMemoryTransaction
} from '@application/ports'
import {
  assertNeo4jMemoryScope,
  neo4jMemoryScopeKey
} from './neo4j-memory-scope.guard'
import { Neo4jOperationalMemoryTransaction } from './neo4j-memory-transaction.adapter'

export class Neo4jOperationalMemoryUnitOfWork extends OperationalMemoryUnitOfWork {
  constructor(
    private readonly driver: Driver,
    private readonly database: string,
    private readonly now: () => Date,
    private readonly assertSchemaReady: (
      transaction: ManagedTransaction
    ) => Promise<void>,
    private readonly retrievalObserver?: MemoryRetrievalObserver
  ) {
    super()
  }

  async run<T>(
    scope: MemoryRequestScope,
    operation: OperationalMemoryOperation,
    work: (transaction: OperationalMemoryTransaction) => Promise<T>
  ): Promise<T> {
    const boundScope = Object.freeze({ ...scope })
    assertNeo4jMemoryScope(boundScope, this.now())
    const scopeKey = neo4jMemoryScopeKey(boundScope)
    const session = this.driver.session({ database: this.database })
    try {
      return await session.executeWrite(
        async (transaction) => {
          assertNeo4jMemoryScope(boundScope, this.now())
          await this.assertSchemaReady(transaction)
          const head = await transaction.run(
            `MERGE (h:MemoryConsentHead {scopeKey: $scopeKey})
           ON CREATE SET h.tenantId = $tenantId, h.subjectId = $subjectId,
             h.purpose = $purpose, h.version = 1, h.status = 'revoked',
             h.updatedAt = $now, h.lockVersion = 0
           SET h.lockVersion = h.lockVersion + 1
           RETURN h.version AS version`,
            {
              scopeKey,
              tenantId: boundScope.tenantId,
              subjectId: boundScope.subjectId,
              purpose: boundScope.purpose,
              now: this.now().toISOString()
            }
          )
          const version = z
            .number()
            .int()
            .positive()
            .safe()
            .parse(head.records[0]?.get('version'))
          const unit = new Neo4jOperationalMemoryTransaction(
            transaction,
            boundScope,
            operation,
            version,
            this.now,
            this.retrievalObserver
          )
          await unit.assertAuthority()
          const result = await work(unit)
          await this.assertSchemaReady(transaction)
          await unit.assertAuthority()
          return result
        },
        { timeout: 15_000 }
      )
    } finally {
      await session.close()
    }
  }
}
