import { randomUUID } from 'node:crypto'
import {
  createNeo4jMemoryRuntime,
  type MemoryRequestScope,
  type TrustedMemorySource
} from '@nucleus/memory'
import { Neo4jContainer } from '@testcontainers/neo4j'
import neo4j from 'neo4j-driver'
import { afterAll, beforeAll, expect, test } from 'vitest'

let container: Awaited<ReturnType<Neo4jContainer['start']>>
let runtime: Awaited<ReturnType<typeof createNeo4jMemoryRuntime>>
let driver: ReturnType<typeof neo4j.driver>
let instant = new Date('2026-09-05T12:00:00.000Z')
const statement = 'Gosto de caminhar pela manhã.'
const input = {
  kind: 'semantic' as const,
  category: 'preference',
  purpose: 'conversation.support',
  semanticKey: 'routine.walk',
  statement
}

beforeAll(async () => {
  container = await new Neo4jContainer('neo4j:5.26-community').start()
  driver = neo4j.driver(
    container.getBoltUri(),
    neo4j.auth.basic(container.getUsername(), container.getPassword()),
    { disableLosslessIntegers: true }
  )
  runtime = await createNeo4jMemoryRuntime({
    uri: container.getBoltUri(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: 'neo4j',
    now: () => instant
  })
}, 180_000)
afterAll(async () => {
  try {
    await runtime?.close()
  } finally {
    try {
      await driver?.close()
    } finally {
      await container?.stop()
    }
  }
})

async function grantedScope(): Promise<MemoryRequestScope> {
  const subjectId = randomUUID()
  const scope: MemoryRequestScope = {
    tenantId: randomUUID(),
    subjectId,
    actorId: subjectId,
    authenticationSessionId: randomUUID(),
    conversationId: randomUUID(),
    requestId: randomUUID(),
    purpose: 'conversation.support',
    sourceKind: 'synthetic-transcript',
    expiresAtMs: instant.getTime() + 600_000
  }
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
  return scope
}

function source(scope: MemoryRequestScope): TrustedMemorySource {
  return {
    events: [
      { kind: 'assistant-text', text: 'ASSISTANT_PRIVATE_SUGGESTION' },
      {
        kind: 'subject-text',
        actorId: scope.actorId,
        subjectId: scope.subjectId,
        sourceTurnId: 'trusted-patient-turn-1',
        sourceTurnVersion: 2,
        observedAt: instant.toISOString(),
        text: statement
      },
      { kind: 'inactivity', durationMs: 3000 }
    ]
  }
}

async function artifacts(scope: MemoryRequestScope) {
  const result = await driver.executeQuery(
    'MATCH (n {tenantId: $tenantId, subjectId: $subjectId}) WHERE n:MemoryEvidence OR n:MemoryCandidate OR n:Memory OR n:MemoryVersion OR (n:OutboxEvent AND n.eventType <> "memory.consent-updated.v1") RETURN labels(n) AS labels, properties(n) AS properties',
    { tenantId: scope.tenantId, subjectId: scope.subjectId },
    { database: 'neo4j' }
  )
  return result.records.map((record) => record.toObject())
}

test('trusted mixed input persists only patient evidence before delayed explicit promotion', async () => {
  const scope = await grantedScope()
  const candidates = runtime.candidatesForRequest(scope)
  const staged = await candidates.stageExplicit(
    input,
    { idempotencyKey: 'candidate-source-1' },
    source(scope)
  )
  expect(staged.status).toBe('staged')
  if (staged.status !== 'staged') throw new Error('expected staged candidate')
  const before = await artifacts(scope)
  expect(JSON.stringify(before)).not.toContain('ASSISTANT_PRIVATE_SUGGESTION')
  expect(before.filter((row) => row.labels.includes('Memory'))).toHaveLength(0)
  const evidence = before.filter((row) => row.labels.includes('MemoryEvidence'))
  expect(evidence).toHaveLength(1)
  expect(evidence[0]?.properties).toMatchObject({
    text: statement,
    actorId: scope.actorId,
    subjectId: scope.subjectId,
    sourceKind: 'synthetic-transcript',
    sourceTurnId: 'trusted-patient-turn-1',
    sourceTurnVersion: 2
  })
  expect(before.some((row) => row.labels.includes('OutboxEvent'))).toBe(true)
  const written = await candidates.promoteExplicit(staged.candidateId)
  const found = await runtime.forRequest(scope).search({
    query: 'caminhar',
    asOf: instant.toISOString(),
    purpose: scope.purpose,
    tokenBudget: 600
  })
  expect(found.items.map(({ memory }) => memory.id)).toContain(written.id)
})

test('assistant-only, inactivity, forged roles and mismatched attribution create no evidence', async () => {
  const scope = await grantedScope()
  const candidates = runtime.candidatesForRequest(scope)
  for (const events of [
    [{ kind: 'assistant-text', text: 'ASSISTANT_PRIVATE_SUGGESTION' }],
    [{ kind: 'inactivity', durationMs: 3000 }]
  ]) {
    await expect(
      candidates.stageExplicit(input, {}, { events } as TrustedMemorySource)
    ).resolves.toEqual({ status: 'skipped', reason: 'no-subject-evidence' })
  }
  for (const forged of [
    { events: [{ role: 'person', text: statement }] },
    { events: [{ ...source(scope).events[1], actorId: randomUUID() }] },
    { events: [{ ...source(scope).events[1], subjectId: randomUUID() }] }
  ])
    await expect(
      candidates.stageExplicit(input, {}, forged as TrustedMemorySource)
    ).rejects.toThrow()
  await expect(
    candidates.stageExplicit(
      { ...input, statement: 'Unsupported assistant suggestion' },
      {},
      source(scope)
    )
  ).rejects.toThrow()
  expect(await artifacts(scope)).toEqual([])
})

test('committed candidates require fresh consent and cannot cross subject boundaries', async () => {
  const scope = await grantedScope()
  const candidates = runtime.candidatesForRequest(scope)
  const staged = await candidates.stageExplicit(
    input,
    { idempotencyKey: 'candidate-consent-1' },
    source(scope)
  )
  if (staged.status !== 'staged') throw new Error('expected staged candidate')
  const other = await grantedScope()
  await expect(
    runtime.candidatesForRequest(other).promoteExplicit(staged.candidateId)
  ).rejects.toThrow()
  const client = runtime.forRequest(scope)
  const consent = await client.getConsent()
  const revoked = await client.updateConsent({
    expectedVersion: consent.version,
    changes: [
      {
        purpose: scope.purpose,
        status: 'revoked',
        policyVersion: 'memory-consent-v1'
      }
    ]
  })
  await expect(candidates.promoteExplicit(staged.candidateId)).rejects.toThrow()
  await client.updateConsent({
    expectedVersion: revoked.version,
    changes: [
      {
        purpose: scope.purpose,
        status: 'granted',
        policyVersion: 'memory-consent-v1'
      }
    ]
  })
  await expect(candidates.promoteExplicit(staged.candidateId)).rejects.toThrow()
  expect(
    (await artifacts(scope)).filter(
      (row) =>
        row.labels.includes('Memory') || row.labels.includes('MemoryVersion')
    )
  ).toEqual([])
})

test('expiration after staging prevents promotion', async () => {
  const scope = await grantedScope()
  const candidates = runtime.candidatesForRequest(scope)
  const staged = await candidates.stageExplicit(input, {}, source(scope))
  if (staged.status !== 'staged') throw new Error('expected staged candidate')
  const previous = instant
  try {
    instant = new Date(scope.expiresAtMs + 1)
    await expect(
      candidates.promoteExplicit(staged.candidateId)
    ).rejects.toThrow()
    expect(
      (await artifacts(scope)).filter(
        (row) =>
          row.labels.includes('Memory') || row.labels.includes('MemoryVersion')
      )
    ).toEqual([])
  } finally {
    instant = previous
  }
})
