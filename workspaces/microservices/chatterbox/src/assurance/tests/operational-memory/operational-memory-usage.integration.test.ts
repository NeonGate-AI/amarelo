import {
  createNeo4jMemoryRuntime,
  createTextMemoryUsageEvent,
  MemoryUsageLedgerEntrySchema,
  type MemoryRequestScope
} from '@nucleus/memory'
import { Neo4jContainer } from '@testcontainers/neo4j'
import { expect, test } from 'vitest'

test('a server-authorized usage ledger survives closing and reopening the runtime', async () => {
  const container = await new Neo4jContainer('neo4j:5.26-community').start()
  let runtime: Awaited<ReturnType<typeof createNeo4jMemoryRuntime>> | undefined
  const instant = new Date('2026-09-05T12:00:00.000Z')
  const scope: MemoryRequestScope = {
    actorId: '22222222-2222-4222-8222-222222222222',
    authenticationSessionId: 'session-spec016-usage',
    conversationId: 'conversation-spec016-usage',
    expiresAtMs: instant.getTime() + 600_000,
    purpose: 'conversation.support',
    requestId: 'request-spec016-usage',
    sourceKind: 'development-text',
    subjectId: '22222222-2222-4222-8222-222222222222',
    tenantId: '11111111-1111-4111-8111-111111111111'
  }
  const options = {
    database: 'neo4j',
    now: () => instant,
    password: container.getPassword(),
    uri: container.getBoltUri(),
    username: container.getUsername()
  }
  try {
    runtime = await createNeo4jMemoryRuntime(options)
    const entry = MemoryUsageLedgerEntrySchema.parse({
      schemaVersion: 'memory-usage-ledger-v1',
      ledgerEntryId: 'ledger-spec016-usage-1',
      usageEvent: createTextMemoryUsageEvent({
        scope,
        eventId: 'event-spec016-usage-1',
        attemptId: 'attempt-spec016-usage-1',
        occurredAt: instant.toISOString(),
        operation: 'explicit-write',
        workloadVersion: 'synthetic-ledger-validation-v1',
        profileVersion: 'internal-text-ledger-v1',
        costClass: 'experiment',
        calls: { llm: 0, web: 0, fullText: 0, vector: 0 }
      }),
      pricingSnapshot: null,
      brlConversionSnapshot: null,
      cost: {
        sourceAmount: null,
        sourceCurrency: null,
        brlAmount: null,
        evidence: 'unknown',
        calculationVersion: null
      }
    })
    await expect(
      runtime.usageLedgerForRequest(scope).append(entry)
    ).resolves.toBe('inserted')
    await runtime.close()
    runtime = undefined

    runtime = await createNeo4jMemoryRuntime(options)
    await expect(
      runtime.usageLedgerForRequest(scope).entries()
    ).resolves.toEqual([entry])
  } finally {
    await runtime?.close()
    await container.stop()
  }
}, 180_000)
