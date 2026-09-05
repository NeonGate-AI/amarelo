import {
  createNeo4jMemoryRuntime,
  createTextMemoryUsageEvent,
  MemoryUsageLedgerEntrySchema,
  type MemoryUsageEvent,
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

test('completed Memory operations emit redacted measured usage and retain unknown costs durably', async () => {
  const container = await new Neo4jContainer('neo4j:5.26-community').start()
  let runtime: Awaited<ReturnType<typeof createNeo4jMemoryRuntime>> | undefined
  const instant = new Date('2026-09-05T12:00:00.000Z')
  const scope: MemoryRequestScope = {
    actorId: '22222222-2222-4222-8222-222222222222',
    authenticationSessionId: 'session-secret-not-usage',
    conversationId: 'conversation-spec016-observed',
    expiresAtMs: instant.getTime() + 600_000,
    purpose: 'conversation.support',
    requestId: 'request-spec016-observed',
    sourceKind: 'development-text',
    subjectId: '22222222-2222-4222-8222-222222222222',
    tenantId: '11111111-1111-4111-8111-111111111111'
  }
  const observations: MemoryUsageEvent[] = []
  try {
    runtime = await createNeo4jMemoryRuntime({
      database: 'neo4j',
      now: () => instant,
      password: container.getPassword(),
      uri: container.getBoltUri(),
      username: container.getUsername(),
      usageProfile: {
        workloadVersion: 'synthetic-operation-validation-v1',
        profileVersion: 'internal-text-operation-v1',
        costClass: 'experiment'
      },
      onObservation: (event) => {
        observations.push(event)
        if (event.operation === 'suppress')
          throw new Error('synthetic-telemetry-failure-not-content')
      }
    })
    const client = runtime.forRequest(scope)
    const consent = await client.getConsent()
    await client.updateConsent({
      expectedVersion: consent.version,
      changes: [
        {
          purpose: scope.purpose,
          status: 'granted',
          policyVersion: 'memory-consent-v1'
        }
      ]
    })
    const written = await client.rememberExplicitly(
      {
        category: 'preference',
        kind: 'semantic',
        purpose: scope.purpose,
        semanticKey: 'routine.usage-redaction',
        statement: 'Gosto de caminhar. Conteúdo privado canário-de-uso.',
        validFrom: null
      },
      { idempotencyKey: 'spec016-observed-write-1' }
    )
    const found = await client.search({
      asOf: instant.toISOString(),
      purpose: scope.purpose,
      query: 'caminhar',
      tokenBudget: 600
    })
    expect(found.items.map(({ memory }) => memory.id)).toContain(written.id)
    expect(found.diagnostics.fullTextCalls).toBe(2)
    const receipt = await client.forget(written.id)
    expect(receipt.purgeStatus).toBe('suppression-only')

    await expect.poll(() => observations.length, { timeout: 5_000 }).toBe(5)
    expect(observations.map(({ operation }) => operation).sort()).toEqual([
      'consent',
      'consent',
      'explicit-write',
      'retrieve',
      'suppress'
    ])
    for (const event of observations) {
      expect(event.workloadVersion).toBe('synthetic-operation-validation-v1')
      expect(event.profileVersion).toBe('internal-text-operation-v1')
      expect(event.costClass).toBe('experiment')
      expect(event.calls).toEqual({
        llm: 0,
        web: 0,
        fullText: event.operation === 'retrieve' ? 2 : 0,
        vector: 0
      })
      expect(event.durations.patientSpeechMilliseconds).toBeNull()
      expect(event.durations.assistantSpeechMilliseconds).toBeNull()
      expect(event.durations.inactivityMilliseconds).toBeNull()
    }
    const serialized = JSON.stringify(observations)
    expect(serialized).not.toContain('canário-de-uso')
    expect(serialized).not.toContain('caminhar')
    expect(serialized).not.toContain(scope.authenticationSessionId)
    expect(serialized).not.toContain('synthetic-telemetry-failure-not-content')
    const ledger = runtime.usageLedgerForRequest(scope)
    await expect
      .poll(() => ledger.entries(), { timeout: 5_000 })
      .toHaveLength(5)
    const entries = await ledger.entries()
    expect(entries.map(({ usageEvent }) => usageEvent.eventId).sort()).toEqual(
      observations.map(({ eventId }) => eventId).sort()
    )
    for (const entry of entries) {
      expect(entry.cost.sourceAmount).toBeNull()
      expect(entry.cost.brlAmount).toBeNull()
      expect(entry.cost.evidence).toBe('unknown')
    }
  } finally {
    await runtime?.close()
    await container.stop()
  }
}, 180_000)
