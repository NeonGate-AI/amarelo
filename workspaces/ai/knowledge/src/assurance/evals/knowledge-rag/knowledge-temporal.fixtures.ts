import type { RepositoryKnowledgeChunk } from '#knowledge'
import { AS_OF, syntheticChunk } from './knowledge.fixtures.ts'

export const TEMPORAL_CORPUS: readonly RepositoryKnowledgeChunk[] = [
  syntheticChunk({
    documentId: 'synthetic-paper-at-published-boundary',
    versionId: 'version-1',
    chunkId: 'published-at-as-of',
    publishedAt: AS_OF,
    effectiveFrom: AS_OF,
    text: 'Observatório publicou calibração exatamente no instante consultado.'
  }),
  syntheticChunk({
    documentId: 'synthetic-paper-after-published-boundary',
    versionId: 'version-1',
    chunkId: 'published-one-millisecond-later',
    publishedAt: '2026-08-20T12:00:00.001Z',
    effectiveFrom: '2026-08-20T12:00:00.001Z',
    text: 'Observatório publicou calibração depois do instante consultado.'
  }),
  syntheticChunk({
    documentId: 'synthetic-rule-at-effective-boundary',
    versionId: 'version-1',
    chunkId: 'effective-from-as-of',
    sourceType: 'regulatory',
    publishedAt: '2026-01-01T00:00:00.000Z',
    effectiveFrom: AS_OF,
    effectiveToExclusive: '2027-01-01T00:00:00.000Z',
    text: 'Regra do observatório entra em vigor exatamente no instante consultado.'
  }),
  syntheticChunk({
    documentId: 'synthetic-rule-at-expiry-boundary',
    versionId: 'version-1',
    chunkId: 'effective-to-as-of',
    sourceType: 'regulatory',
    publishedAt: '2026-01-01T00:00:00.000Z',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveToExclusive: AS_OF,
    text: 'Regra do observatório expira exatamente no instante consultado.'
  })
]
