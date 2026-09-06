import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { MemoryRequestScope } from '@application/contracts'

const ScopeSchema = z
  .object({
    tenantId: z.string().uuid(),
    subjectId: z.string().uuid(),
    actorId: z.string().uuid(),
    authenticationSessionId: z.string().min(1).max(200),
    expiresAtMs: z.number().int().positive(),
    conversationId: z.string().min(1).max(200),
    requestId: z.string().min(1).max(200),
    purpose: z.literal('conversation.support'),
    sourceKind: z.enum(['development-text', 'synthetic-transcript', 'realtime-transcript'])
  })
  .strict()

export function assertNeo4jMemoryScope(
  scope: MemoryRequestScope,
  now: Date
): void {
  const parsed = ScopeSchema.safeParse(scope)
  if (
    !parsed.success ||
    scope.actorId !== scope.subjectId ||
    !Number.isFinite(now.getTime()) ||
    scope.expiresAtMs <= now.getTime()
  )
    throw new Error('Memory request authority is unavailable')
}

export function neo4jMemoryFingerprint(parts: readonly unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}

export function neo4jMemoryScopeKey(scope: MemoryRequestScope): string {
  return neo4jMemoryFingerprint([
    scope.tenantId,
    scope.subjectId,
    scope.purpose
  ])
}

export function normalizeNeo4jMemoryText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
}
