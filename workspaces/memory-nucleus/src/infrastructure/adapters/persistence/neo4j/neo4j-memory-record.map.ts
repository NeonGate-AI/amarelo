import { ExplicitMemoryResultSchema, type MemoryRecord } from '@repo/memory-sdk'
import type { MemoryRequestScope } from '@application/contracts'
import type { RepositoryMemoryRecord } from '@application/ports'

export function parseNeo4jMemoryRecord(
  value: unknown,
  scope: MemoryRequestScope
): MemoryRecord {
  if (typeof value !== 'string')
    throw new Error('Memory graph record is invalid')
  const parsed: unknown = JSON.parse(value)
  const record = ExplicitMemoryResultSchema.parse(parsed)
  if (
    record.provenance.authorId !== scope.subjectId ||
    record.purposeIds[0] !== scope.purpose
  ) {
    throw new Error('Memory graph record provenance does not match its scope')
  }
  return record
}

export function toNeo4jRepositoryMemoryRecord(
  record: MemoryRecord,
  scope: MemoryRequestScope
): RepositoryMemoryRecord {
  const base = {
    id: record.id,
    tenantId: scope.tenantId,
    subjectId: scope.subjectId,
    purposes: [...record.purposeIds],
    viewIds: ['personal'],
    category: record.category,
    lifecycle: 'accepted' as const,
    text: record.statement,
    sensitivity: 'normal' as const,
    observedAt: record.observedAt,
    provenance: {
      sourceArtifactIds: [...record.provenance.sourceArtifactIds],
      authorId: record.provenance.authorId,
      authorType: 'subject' as const,
      createdAt: record.provenance.observedAt,
      transformationId: null
    },
    supersededById: null
  }
  if (record.kind === 'semantic')
    return {
      ...base,
      kind: 'semantic',
      semanticKey: record.semanticKey,
      validFrom: record.validFrom,
      validUntil: record.validUntil
    }
  if (record.temporalPrecision === 'exact')
    return {
      ...base,
      kind: 'episodic',
      semanticKey: null,
      occurredAt: record.occurredAt,
      temporalPrecision: 'exact',
      temporalReference: null
    }
  return {
    ...base,
    kind: 'episodic',
    semanticKey: null,
    occurredAt: null,
    temporalPrecision: record.temporalPrecision,
    temporalReference: record.temporalReference
  }
}
